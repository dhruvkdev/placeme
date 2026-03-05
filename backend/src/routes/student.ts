import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq, and, gt } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 10;

// ──────────────────────────────────────
// PUBLIC ROUTES (no auth required)
// ──────────────────────────────────────

/**
 * POST /student/check-email
 * Body: { email }
 * Splits email at @, checks domain against collegeDomains.
 * Returns eligibility + college info or error.
 */
router.post('/check-email', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        const domain = email.split('@')[1]?.toLowerCase();

        if (!domain) {
            res.status(400).json({ error: 'Invalid email format' });
            return;
        }

        // Check if a user with this email already exists
        const [existingUser] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, email.toLowerCase()))
            .limit(1);

        if (existingUser) {
            res.status(409).json({ error: 'An account with this email already exists' });
            return;
        }

        // Look up the domain in collegeDomains
        const [domainMatch] = await db
            .select()
            .from(schema.collegeDomains)
            .where(eq(schema.collegeDomains.domain, domain))
            .limit(1);

        if (!domainMatch) {
            res.status(404).json({
                eligible: false,
                error: 'Your college is not associated with our application yet.',
            });
            return;
        }

        // Fetch the college name
        const [college] = await db
            .select()
            .from(schema.colleges)
            .where(eq(schema.colleges.id, domainMatch.collegeId))
            .limit(1);

        res.json({
            eligible: true,
            collegeId: domainMatch.collegeId,
            collegeName: college?.name || 'Unknown College',
        });
    } catch (err) {
        console.error('Check email error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /student/send-otp
 * Body: { email }
 * Re-checks domain (security), generates 6-digit OTP, saves to emailOtps.
 * 
 * TODO: Wire up email provider (Nodemailer/Resend) to actually send the OTP.
 * For now, the OTP is returned in the API response for testing.
 */
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        const domain = email.split('@')[1]?.toLowerCase();

        if (!domain) {
            res.status(400).json({ error: 'Invalid email format' });
            return;
        }

        // Re-verify domain (don't trust the client)
        const [domainMatch] = await db
            .select()
            .from(schema.collegeDomains)
            .where(eq(schema.collegeDomains.domain, domain))
            .limit(1);

        if (!domainMatch) {
            res.status(404).json({ error: 'Your college is not associated with our application yet.' });
            return;
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Set expiry to 10 minutes
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Save OTP
        await db
            .insert(schema.emailOtps)
            .values({
                email: email.toLowerCase(),
                otp,
                expiresAt,
            });

        // TODO: Send OTP via email provider (Nodemailer/Resend) — deferred to later phase
        // For now, return OTP in response for testing
        res.json({
            message: 'OTP sent successfully',
            otp, // Remove this line once email provider is set up
            expiresInMinutes: 10,
        });
    } catch (err) {
        console.error('Send OTP error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /student/verify-otp
 * Body: { email, otp, password }
 * Validates OTP → creates user (STUDENT) + student row → returns JWT.
 */
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp, password } = req.body;

        if (!email || !otp || !password) {
            res.status(400).json({ error: 'Email, OTP, and password are required' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        // Verify OTP
        const [otpRecord] = await db
            .select()
            .from(schema.emailOtps)
            .where(
                and(
                    eq(schema.emailOtps.email, email.toLowerCase()),
                    eq(schema.emailOtps.otp, otp),
                    eq(schema.emailOtps.isUsed, false),
                    gt(schema.emailOtps.expiresAt, new Date())
                )
            )
            .limit(1);

        if (!otpRecord) {
            res.status(400).json({ error: 'Invalid or expired OTP' });
            return;
        }

        // Find the matching college via domain
        const domain = email.split('@')[1]?.toLowerCase();
        const [domainMatch] = await db
            .select()
            .from(schema.collegeDomains)
            .where(eq(schema.collegeDomains.domain, domain!))
            .limit(1);

        if (!domainMatch) {
            res.status(404).json({ error: 'Your college is not associated with our application yet.' });
            return;
        }

        // Check if user already exists (race condition guard)
        const [existingUser] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, email.toLowerCase()))
            .limit(1);

        if (existingUser) {
            res.status(409).json({ error: 'An account with this email already exists' });
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const [user] = await db
            .insert(schema.users)
            .values({
                email: email.toLowerCase(),
                passwordHash,
                role: 'STUDENT',
            })
            .returning();

        // Create student profile (state defaults to REGISTERED)
        await db
            .insert(schema.students)
            .values({
                id: user.id,
                collegeId: domainMatch.collegeId,
            });

        // Mark OTP as used
        await db
            .update(schema.emailOtps)
            .set({ isUsed: true })
            .where(eq(schema.emailOtps.id, otpRecord.id));

        // Sign JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────
// AUTHENTICATED ROUTES (student must be logged in)
// ──────────────────────────────────────

/**
 * GET /student/profile
 * Returns the authenticated student's profile + state.
 */
router.get('/profile', authenticate, requireRole('STUDENT'), async (req: Request, res: Response): Promise<void> => {
    try {
        const [student] = await db
            .select()
            .from(schema.students)
            .where(eq(schema.students.id, req.user!.id))
            .limit(1);

        if (!student) {
            res.status(404).json({ error: 'Student profile not found' });
            return;
        }

        // Get college info
        const [college] = await db
            .select()
            .from(schema.colleges)
            .where(eq(schema.colleges.id, student.collegeId))
            .limit(1);

        res.json({
            student: {
                id: student.id,
                collegeId: student.collegeId,
                cgpa: student.cgpa,
                branch: student.branch,
                graduationYear: student.graduationYear,
                state: student.state,
                verifiedBy: student.verifiedBy,
                verifiedAt: student.verifiedAt,
                createdAt: student.createdAt,
            },
            college: college || null,
        });
    } catch (err) {
        console.error('Get student profile error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /student/profile
 * Body: { cgpa, branch, graduationYear }
 * Updates academic details and sets state to PENDING_VERIFICATION.
 */
router.put('/profile', authenticate, requireRole('STUDENT'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { cgpa, branch, graduationYear } = req.body;

        if (!cgpa || !branch || !graduationYear) {
            res.status(400).json({ error: 'cgpa, branch, and graduationYear are required' });
            return;
        }

        // Verify the student exists
        const [student] = await db
            .select()
            .from(schema.students)
            .where(eq(schema.students.id, req.user!.id))
            .limit(1);

        if (!student) {
            res.status(404).json({ error: 'Student profile not found' });
            return;
        }

        // Only allow profile completion if REGISTERED or REJECTED (re-submit)
        if (student.state !== 'REGISTERED' && student.state !== 'REJECTED') {
            res.status(409).json({ error: `Cannot update profile in state: ${student.state}` });
            return;
        }

        // Update student profile
        const [updated] = await db
            .update(schema.students)
            .set({
                cgpa: cgpa.toString(),
                branch,
                graduationYear: parseInt(graduationYear),
                state: 'PENDING_VERIFICATION',
            })
            .where(eq(schema.students.id, req.user!.id))
            .returning();

        res.json({
            message: 'Profile updated. Awaiting verification.',
            student: {
                id: updated.id,
                cgpa: updated.cgpa,
                branch: updated.branch,
                graduationYear: updated.graduationYear,
                state: updated.state,
            },
        });
    } catch (err) {
        console.error('Update student profile error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
