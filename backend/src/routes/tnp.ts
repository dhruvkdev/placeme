import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// All T&P routes require authentication + TNP role
router.use(authenticate, requireRole('TNP'));

/**
 * GET /tnp/profile
 * Returns the T&P profile with college info.
 * Frontend checks `collegeId === null` to force the setup screen.
 */
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
    try {
        const [profile] = await db
            .select()
            .from(schema.tnpProfiles)
            .where(eq(schema.tnpProfiles.id, req.user!.id))
            .limit(1);

        if (!profile) {
            res.status(404).json({ error: 'T&P profile not found' });
            return;
        }

        // If college is linked, fetch college details + domains
        let college = null;
        let domains: string[] = [];

        if (profile.collegeId) {
            const [collegeRow] = await db
                .select()
                .from(schema.colleges)
                .where(eq(schema.colleges.id, profile.collegeId))
                .limit(1);

            college = collegeRow || null;

            if (college) {
                const domainRows = await db
                    .select()
                    .from(schema.collegeDomains)
                    .where(eq(schema.collegeDomains.collegeId, college.id));

                domains = domainRows.map((d) => d.domain);
            }
        }

        res.json({
            profile: {
                id: profile.id,
                collegeId: profile.collegeId,
                createdAt: profile.createdAt,
            },
            college,
            domains,
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /tnp/setup-college
 * Body: { collegeName: string, domains: string[] }
 * Creates college → inserts domains → links T&P profile.
 * Only allowed when collegeId is null (first-time setup).
 */
router.post('/setup-college', async (req: Request, res: Response): Promise<void> => {
    try {
        const { collegeName, domains } = req.body;

        if (!collegeName || !domains || !Array.isArray(domains) || domains.length === 0) {
            res.status(400).json({ error: 'collegeName and at least one domain are required' });
            return;
        }

        // Check that T&P hasn't already set up a college
        const [profile] = await db
            .select()
            .from(schema.tnpProfiles)
            .where(eq(schema.tnpProfiles.id, req.user!.id))
            .limit(1);

        if (!profile) {
            res.status(404).json({ error: 'T&P profile not found' });
            return;
        }

        if (profile.collegeId) {
            res.status(409).json({ error: 'College already configured' });
            return;
        }

        // Create college
        const [college] = await db
            .insert(schema.colleges)
            .values({ name: collegeName })
            .returning();

        // Insert domains
        const domainRows = await db
            .insert(schema.collegeDomains)
            .values(
                domains.map((domain: string) => ({
                    collegeId: college.id,
                    domain: domain.toLowerCase().trim(),
                }))
            )
            .returning();

        // Link T&P to the new college
        await db
            .update(schema.tnpProfiles)
            .set({ collegeId: college.id })
            .where(eq(schema.tnpProfiles.id, req.user!.id));

        res.status(201).json({
            message: 'College created and linked successfully',
            college,
            domains: domainRows.map((d) => d.domain),
        });
    } catch (err) {
        console.error('Setup college error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /tnp/students/pending
 * Lists students with state PENDING_VERIFICATION from the T&P's college.
 */
router.get('/students/pending', async (req: Request, res: Response): Promise<void> => {
    try {
        // Get T&P's college
        const [profile] = await db
            .select()
            .from(schema.tnpProfiles)
            .where(eq(schema.tnpProfiles.id, req.user!.id))
            .limit(1);

        if (!profile || !profile.collegeId) {
            res.status(400).json({ error: 'College not configured yet' });
            return;
        }

        // Get pending students from this college
        const pendingStudents = await db
            .select({
                studentId: schema.students.id,
                email: schema.users.email,
                name: schema.users.name,
                cgpa: schema.students.cgpa,
                branch: schema.students.branch,
                graduationYear: schema.students.graduationYear,
                state: schema.students.state,
                createdAt: schema.students.createdAt,
            })
            .from(schema.students)
            .innerJoin(schema.users, eq(schema.students.id, schema.users.id))
            .where(
                and(
                    eq(schema.students.collegeId, profile.collegeId),
                    eq(schema.students.state, 'PENDING_VERIFICATION')
                )
            );

        res.json({ students: pendingStudents });
    } catch (err) {
        console.error('Pending students error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /tnp/students/:studentId/verify
 * Sets student state to VERIFIED with audit trail.
 */
router.post('/students/:studentId/verify', async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId } = req.params;

        // Get T&P's college
        const [profile] = await db
            .select()
            .from(schema.tnpProfiles)
            .where(eq(schema.tnpProfiles.id, req.user!.id))
            .limit(1);

        if (!profile || !profile.collegeId) {
            res.status(400).json({ error: 'College not configured yet' });
            return;
        }

        // Get the student
        const [student] = await db
            .select()
            .from(schema.students)
            .where(eq(schema.students.id, studentId))
            .limit(1);

        if (!student) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }

        // Ensure student belongs to the T&P's college
        if (student.collegeId !== profile.collegeId) {
            res.status(403).json({ error: 'Student does not belong to your college' });
            return;
        }

        if (student.state !== 'PENDING_VERIFICATION') {
            res.status(409).json({ error: `Cannot verify student in state: ${student.state}` });
            return;
        }

        // Update student state
        await db
            .update(schema.students)
            .set({
                state: 'VERIFIED',
                verifiedBy: req.user!.id,
                verifiedAt: new Date(),
            })
            .where(eq(schema.students.id, studentId));

        // Audit trail
        await db
            .insert(schema.studentStateLogs)
            .values({
                studentId,
                oldState: 'PENDING_VERIFICATION',
                newState: 'VERIFIED',
                changedBy: req.user!.id,
            });

        res.json({ message: 'Student verified successfully' });
    } catch (err) {
        console.error('Verify student error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /tnp/students/:studentId/reject
 * Sets student state to REJECTED with audit trail.
 */
router.post('/students/:studentId/reject', async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId } = req.params;

        // Get T&P's college
        const [profile] = await db
            .select()
            .from(schema.tnpProfiles)
            .where(eq(schema.tnpProfiles.id, req.user!.id))
            .limit(1);

        if (!profile || !profile.collegeId) {
            res.status(400).json({ error: 'College not configured yet' });
            return;
        }

        const [student] = await db
            .select()
            .from(schema.students)
            .where(eq(schema.students.id, studentId))
            .limit(1);

        if (!student) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }

        if (student.collegeId !== profile.collegeId) {
            res.status(403).json({ error: 'Student does not belong to your college' });
            return;
        }

        if (student.state !== 'PENDING_VERIFICATION') {
            res.status(409).json({ error: `Cannot reject student in state: ${student.state}` });
            return;
        }

        await db
            .update(schema.students)
            .set({ state: 'REJECTED' })
            .where(eq(schema.students.id, studentId));

        // Audit trail
        await db
            .insert(schema.studentStateLogs)
            .values({
                studentId,
                oldState: 'PENDING_VERIFICATION',
                newState: 'REJECTED',
                changedBy: req.user!.id,
            });

        res.json({ message: 'Student rejected' });
    } catch (err) {
        console.error('Reject student error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
