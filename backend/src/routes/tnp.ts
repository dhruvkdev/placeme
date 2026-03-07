import { Router, Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
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
 * GET /tnp/dashboard
 * Retrieves high level analytics of the college for the TNP dashboard.
 */
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
    try {
        const [profile] = await db
            .select()
            .from(schema.tnpProfiles)
            .where(eq(schema.tnpProfiles.id, req.user!.id))
            .limit(1);

        if (!profile || !profile.collegeId) {
            res.status(400).json({ error: 'College not configured yet' });
            return;
        }

        const stats = {
            totalStudents: 0,
            placedStudents: 0,
            activeDrives: 0,
            avgCtc: "N/A"
        };

        const collegeStudents = await db
            .select({ id: schema.students.id, state: schema.students.state, branch: schema.students.branch })
            .from(schema.students)
            .where(eq(schema.students.collegeId, profile.collegeId));

        stats.totalStudents = collegeStudents.length;
        stats.placedStudents = collegeStudents.filter(s => s.state === 'PLACED').length;

        const activeJobs = await db
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.state, 'PUBLISHED'));

        stats.activeDrives = activeJobs.length;

        // Pending approvals (Jobs submitted by recruiters awaiting T&P approval)
        const pendingApprovals = await db
            .select({
                id: schema.jobs.id,
                role: schema.jobs.title,
                type: schema.jobs.description, // We packed type in description
                ctc: schema.jobs.description,  // We packed ctc in description
                branches: schema.jobs.branches,
                company: schema.companies.name
            })
            .from(schema.jobs)
            .innerJoin(schema.recruiters, eq(schema.jobs.recruiterId, schema.recruiters.id))
            .innerJoin(schema.companies, eq(schema.recruiters.companyId, schema.companies.id))
            .where(
                and(
                    eq(schema.jobs.state, 'SUBMITTED'),
                    eq(schema.jobs.collegeId, profile.collegeId)
                )
            );

        const mappedApprovals = pendingApprovals.map(job => {
            const desc = job.type || '';
            const typeMatch = desc.match(/Type:\s*(.*)/);
            const ctcMatch = desc.match(/CTC:\s*(.*)/);

            return {
                id: job.id,
                company: job.company,
                role: job.role,
                type: typeMatch ? typeMatch[1] : 'Full-Time',
                ctc: ctcMatch ? ctcMatch[1] : 'N/A',
                branches: job.branches && job.branches.length > 0 ? job.branches.join(', ') : 'All Branches'
            }
        });

        // ==========================================
        //         ANALYTICS CALCULATIONS
        // ==========================================

        const analytics = {
            branchWisePlacements: [] as { branch: string, val: number }[],
            ctcDistribution: [] as { range: string, h: string, val: number }[],
            topHiringPartners: [] as { comp: string, count: number, avg: string }[],
            yoyGrowth: "+ 18.4%" // Static for now
        };

        // 1. Branch-wise Placements
        const branchCounts: Record<string, { total: number, placed: number }> = {};
        collegeStudents.forEach(s => {
            const branch = s.branch || 'Unknown';
            if (!branchCounts[branch]) branchCounts[branch] = { total: 0, placed: 0 };
            branchCounts[branch].total++;
            if (s.state === 'PLACED') branchCounts[branch].placed++;
        });

        for (const [branch, counts] of Object.entries(branchCounts)) {
            if (counts.total > 0) {
                const percentage = Math.round((counts.placed / counts.total) * 100);
                analytics.branchWisePlacements.push({ branch, val: percentage });
            }
        }
        analytics.branchWisePlacements.sort((a, b) => b.val - a.val);

        // Fetch accepted offers for CTC and Top Hiring Partners
        const acceptedOffers = await db
            .select({
                jobDesc: schema.jobs.description,
                jobCtc: schema.jobs.description, // Fallback parsing
                companyName: schema.companies.name
            })
            .from(schema.applications)
            .innerJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
            .leftJoin(schema.recruiters, eq(schema.jobs.recruiterId, schema.recruiters.id))
            .leftJoin(schema.companies, eq(schema.recruiters.companyId, schema.companies.id))
            .innerJoin(schema.students, eq(schema.applications.studentId, schema.students.id))
            .where(
                and(
                    eq(schema.students.collegeId, profile.collegeId),
                    eq(schema.applications.state, 'ACCEPTED')
                )
            );

        // 2. CTC Distribution & 3. Top Hiring Partners
        const ctcRanges = {
            "< 5 LPA": 0,
            "5-10 LPA": 0,
            "10-20 LPA": 0,
            "20+ LPA": 0
        };
        const companyStats: Record<string, { count: number, totalCtc: number, validCtcs: number }> = {};
        let totalPlacedCtc = 0;
        let validPlacedCtcCount = 0;

        acceptedOffers.forEach(offer => {
            const compName = offer.companyName || 'T&P Cell';

            // Try to parse numerical CTC from description
            let numericalCtc = 0;
            const descStr = offer.jobDesc || '';
            const ctcMatch = descStr.match(/CTC:\s*(\d+(\.\d+)?)\s*LPA/i);
            if (ctcMatch && ctcMatch[1]) {
                numericalCtc = parseFloat(ctcMatch[1]);
            }

            // Stats for avg CTC
            if (numericalCtc > 0) {
                totalPlacedCtc += numericalCtc;
                validPlacedCtcCount++;

                // Company specific stats
                if (!companyStats[compName]) companyStats[compName] = { count: 0, totalCtc: 0, validCtcs: 0 };
                companyStats[compName].totalCtc += numericalCtc;
                companyStats[compName].validCtcs++;
            }
            if (!companyStats[compName]) companyStats[compName] = { count: 0, totalCtc: 0, validCtcs: 0 };
            companyStats[compName].count++;

            // Distribution
            if (numericalCtc > 0 && numericalCtc < 5) ctcRanges["< 5 LPA"]++;
            else if (numericalCtc >= 5 && numericalCtc < 10) ctcRanges["5-10 LPA"]++;
            else if (numericalCtc >= 10 && numericalCtc < 20) ctcRanges["10-20 LPA"]++;
            else if (numericalCtc >= 20) ctcRanges["20+ LPA"]++;
        });

        // Calculate overall average CTC
        if (validPlacedCtcCount > 0) {
            stats.avgCtc = (totalPlacedCtc / validPlacedCtcCount).toFixed(1) + " LPA";
        }

        // Format CTC Distribution
        const maxCtcCount = Math.max(1, ...Object.values(ctcRanges));
        analytics.ctcDistribution = [
            { range: "< 5 LPA", val: ctcRanges["< 5 LPA"], h: `${Math.max(10, Math.round((ctcRanges["< 5 LPA"] / maxCtcCount) * 100))}%` },
            { range: "5-10 LPA", val: ctcRanges["5-10 LPA"], h: `${Math.max(10, Math.round((ctcRanges["5-10 LPA"] / maxCtcCount) * 100))}%` },
            { range: "10-20 LPA", val: ctcRanges["10-20 LPA"], h: `${Math.max(10, Math.round((ctcRanges["10-20 LPA"] / maxCtcCount) * 100))}%` },
            { range: "20+ LPA", val: ctcRanges["20+ LPA"], h: `${Math.max(10, Math.round((ctcRanges["20+ LPA"] / maxCtcCount) * 100))}%` }
        ];

        // Format Top Hiring Partners
        for (const [comp, cStats] of Object.entries(companyStats)) {
            const avgStr = cStats.validCtcs > 0 ? (cStats.totalCtc / cStats.validCtcs).toFixed(1) + " LPA" : "N/A";
            analytics.topHiringPartners.push({ comp, count: cStats.count, avg: avgStr });
        }
        // Take top 5
        analytics.topHiringPartners.sort((a, b) => b.count - a.count);
        analytics.topHiringPartners = analytics.topHiringPartners.slice(0, 5);

        res.json({ stats, pendingApprovals: mappedApprovals, analytics });
    } catch (err) {
        console.error('TNP Dashboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /tnp/students
 * Lists all students from the T&P's college.
 */
router.get('/students', async (req: Request, res: Response): Promise<void> => {
    try {
        const [profile] = await db
            .select()
            .from(schema.tnpProfiles)
            .where(eq(schema.tnpProfiles.id, req.user!.id))
            .limit(1);

        if (!profile || !profile.collegeId) {
            res.status(400).json({ error: 'College not configured yet' });
            return;
        }

        const students = await db
            .select({
                id: schema.users.id, // we might want email/custom ID
                name: schema.users.name,
                branch: schema.students.branch,
                cgpa: schema.students.cgpa,
                status: schema.students.state,
                company: schema.companies.name // To be accurate, needs a join with applications or a placements table
            })
            .from(schema.students)
            .innerJoin(schema.users, eq(schema.students.id, schema.users.id))
            .leftJoin(schema.applications, and(eq(schema.applications.studentId, schema.students.id), eq(schema.applications.state, 'ACCEPTED')))
            .leftJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
            .leftJoin(schema.recruiters, eq(schema.jobs.recruiterId, schema.recruiters.id))
            .leftJoin(schema.companies, eq(schema.recruiters.companyId, schema.companies.id))
            .where(eq(schema.students.collegeId, profile.collegeId));

        const mappedStudents = students.map((s, index) => ({
            id: `STD00${index + 1}`,
            name: s.name || `Student ${index + 1}`,
            branch: s.branch || 'Unknown',
            cgpa: s.cgpa || 'N/A',
            status: s.status === 'PLACED' ? 'Placed' : 'Unplaced',
            company: s.company || '-'
        }));

        res.json({ students: mappedStudents });
    } catch (err) {
        console.error('TNP Students error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /tnp/jobs/:jobId/approve
 */
router.post('/jobs/:jobId/approve', async (req: Request, res: Response): Promise<void> => {
    try {
        const { jobId } = req.params;

        // Verify job exists and is in SUBMITTED state
        const [job] = await db
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.id, jobId as string))
            .limit(1);

        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        if (job.state !== 'SUBMITTED') {
            res.status(409).json({ error: `Cannot approve job in state: ${job.state}` });
            return;
        }

        await db.update(schema.jobs).set({ state: 'PUBLISHED' }).where(eq(schema.jobs.id, jobId as string));
        res.json({ message: 'Job approved successfully' });
    } catch (err) {
        console.error('Approve job error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /tnp/jobs/:jobId/reject
 */
router.post('/jobs/:jobId/reject', async (req: Request, res: Response): Promise<void> => {
    try {
        const { jobId } = req.params;

        // Verify job exists and is in SUBMITTED state
        const [job] = await db
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.id, jobId as string))
            .limit(1);

        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        if (job.state !== 'SUBMITTED') {
            res.status(409).json({ error: `Cannot reject job in state: ${job.state}` });
            return;
        }

        await db.update(schema.jobs).set({ state: 'ARCHIVED' }).where(eq(schema.jobs.id, jobId as string));
        res.json({ message: 'Job rejected successfully' });
    } catch (err) {
        console.error('Reject job error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /tnp/jobs
 * Lists all jobs posted for the T&P's college (by recruiters or T&P itself).
 */
router.get('/jobs', async (req: Request, res: Response): Promise<void> => {
    try {
        const [profile] = await db
            .select()
            .from(schema.tnpProfiles)
            .where(eq(schema.tnpProfiles.id, req.user!.id))
            .limit(1);

        if (!profile || !profile.collegeId) {
            res.status(400).json({ error: 'College not configured yet' });
            return;
        }

        const jobsList = await db
            .select({
                id: schema.jobs.id,
                title: schema.jobs.title,
                description: schema.jobs.description,
                location: schema.jobs.location,
                branches: schema.jobs.branches,
                minCgpa: schema.jobs.minCgpa,
                state: schema.jobs.state,
                createdAt: schema.jobs.createdAt,
                recruiterId: schema.jobs.recruiterId,
                postedByTnpId: schema.jobs.postedByTnpId,
                companyName: schema.companies.name,
            })
            .from(schema.jobs)
            .leftJoin(schema.recruiters, eq(schema.jobs.recruiterId, schema.recruiters.id))
            .leftJoin(schema.companies, eq(schema.recruiters.companyId, schema.companies.id))
            .where(eq(schema.jobs.collegeId, profile.collegeId))
            .orderBy(desc(schema.jobs.createdAt));

        const formattedJobs = jobsList.map((job) => {
            let type = 'N/A';
            let ctc = 'N/A';
            const descStr = job.description || '';
            const typeMatch = descStr.match(/Type:\s*(.*)/);
            const ctcMatch = descStr.match(/CTC:\s*(.*)/);
            if (typeMatch) type = typeMatch[1];
            if (ctcMatch) ctc = ctcMatch[1];

            return {
                id: job.id,
                title: job.title,
                description: job.description,
                location: job.location,
                branches: job.branches,
                minCgpa: job.minCgpa,
                state: job.state,
                createdAt: job.createdAt,
                type,
                ctc,
                companyName: job.companyName || 'T&P Cell',
                isTnpPosted: !!job.postedByTnpId,
            };
        });

        res.json({ jobs: formattedJobs });
    } catch (err) {
        console.error('Fetch TNP jobs error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /tnp/jobs
 * T&P can post jobs by its own. These jobs skip SUBMITTED state and are PUBLISHED directly.
 */
router.post('/jobs', async (req: Request, res: Response): Promise<void> => {
    try {
        const [profile] = await db
            .select()
            .from(schema.tnpProfiles)
            .where(eq(schema.tnpProfiles.id, req.user!.id))
            .limit(1);

        if (!profile || !profile.collegeId) {
            res.status(400).json({ error: 'College not configured yet' });
            return;
        }

        const { title, description, location, minCgpa, type, ctc, branches } = req.body;

        if (!title || !description) {
            res.status(400).json({ error: 'Title and description are required' });
            return;
        }

        const [job] = await db
            .insert(schema.jobs)
            .values({
                postedByTnpId: profile.id,
                collegeId: profile.collegeId,
                title,
                description: `${description}\n\nType: ${type || 'N/A'}\nCTC: ${ctc || 'N/A'}`,
                location,
                branches: branches && branches.length > 0 ? branches : null,
                minCgpa: minCgpa ? minCgpa.toString() : null,
                state: 'PUBLISHED' // TNP's own jobs are pre-approved
            })
            .returning();

        res.status(201).json({ message: 'Job posted successfully', job });
    } catch (err) {
        console.error('Post TNP job error:', err);
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
        const studentId = req.params.studentId as string;

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
        const studentId = req.params.studentId as string;

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
            .set({ state: 'PROFILE_COMPLETED' })
            .where(eq(schema.students.id, studentId));

        // Audit trail
        await db
            .insert(schema.studentStateLogs)
            .values({
                studentId,
                oldState: 'PENDING_VERIFICATION',
                newState: 'PROFILE_COMPLETED',
                changedBy: req.user!.id,
            });

        res.json({ message: 'Student rejected' });
    } catch (err) {
        console.error('Reject student error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /tnp/applications
 * Lists all applications for students belonging to the T&P's college.
 */
router.get('/applications', async (req: Request, res: Response): Promise<void> => {
    try {
        const [profile] = await db
            .select()
            .from(schema.tnpProfiles)
            .where(eq(schema.tnpProfiles.id, req.user!.id))
            .limit(1);

        if (!profile || !profile.collegeId) {
            res.status(400).json({ error: 'College not configured yet' });
            return;
        }

        const applications = await db
            .select({
                id: schema.applications.id,
                state: schema.applications.state,
                appliedAt: schema.applications.appliedAt,
                studentId: schema.applications.studentId,
                studentName: schema.users.name,
                studentEmail: schema.users.email,
                studentBranch: schema.students.branch,
                studentCgpa: schema.students.cgpa,
                jobTitle: schema.jobs.title,
                jobLocation: schema.jobs.location,
                companyName: schema.companies.name,
            })
            .from(schema.applications)
            .innerJoin(schema.students, eq(schema.applications.studentId, schema.students.id))
            .innerJoin(schema.users, eq(schema.students.id, schema.users.id))
            .innerJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
            .leftJoin(schema.recruiters, eq(schema.jobs.recruiterId, schema.recruiters.id))
            .leftJoin(schema.companies, eq(schema.recruiters.companyId, schema.companies.id))
            .where(eq(schema.students.collegeId, profile.collegeId))
            .orderBy(desc(schema.applications.appliedAt));

        const formatted = applications.map((app) => ({
            id: app.id,
            state: app.state,
            appliedAt: app.appliedAt,
            studentId: app.studentId,
            studentName: app.studentName || 'Student',
            studentEmail: app.studentEmail,
            studentBranch: app.studentBranch,
            studentCgpa: app.studentCgpa,
            jobTitle: app.jobTitle,
            jobLocation: app.jobLocation || 'Remote',
            companyName: app.companyName || 'T&P Cell',
        }));

        res.json({ applications: formatted });
    } catch (err) {
        console.error('TNP applications error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const VALID_APPLICATION_STATES = [
    'APPLIED',
    'SHORTLISTED',
    'INTERVIEW_SCHEDULED',
    'INTERVIEWED',
    'HR_ROUND',
    'OFFERED',
    'ACCEPTED',
    'REJECTED',
] as const;

type ApplicationState = typeof VALID_APPLICATION_STATES[number];

/**
 * POST /tnp/applications/:appId/status
 * Allows T&P to update an application's state for students in their college.
 */
router.post('/applications/:appId/status', async (req: Request, res: Response): Promise<void> => {
    try {
        const { appId } = req.params;
        const { status } = req.body as { status?: ApplicationState | string };

        if (!status || !VALID_APPLICATION_STATES.includes(status as ApplicationState)) {
            res.status(400).json({
                error: `Invalid status. Must be one of: ${VALID_APPLICATION_STATES.join(', ')}`,
            });
            return;
        }

        const [profile] = await db
            .select()
            .from(schema.tnpProfiles)
            .where(eq(schema.tnpProfiles.id, req.user!.id))
            .limit(1);

        if (!profile || !profile.collegeId) {
            res.status(400).json({ error: 'College not configured yet' });
            return;
        }

        const [app] = await db
            .select({
                id: schema.applications.id,
                state: schema.applications.state,
                studentCollegeId: schema.students.collegeId,
            })
            .from(schema.applications)
            .innerJoin(schema.students, eq(schema.applications.studentId, schema.students.id))
            .where(
                and(
                    eq(schema.applications.id, appId as string),
                    eq(schema.students.collegeId, profile.collegeId),
                ),
            )
            .limit(1);

        if (!app) {
            res.status(404).json({ error: 'Application not found for your college' });
            return;
        }

        if (app.state === status) {
            res.status(409).json({ error: `Application is already in state: ${status}` });
            return;
        }

        await db
            .update(schema.applications)
            .set({ state: status as ApplicationState })
            .where(eq(schema.applications.id, appId as string));

        await db
            .insert(schema.applicationStateLogs)
            .values({
                applicationId: appId as string,
                oldState: app.state,
                newState: status as ApplicationState,
                changedBy: req.user!.id,
            });

        res.json({ message: `Application status updated to ${status}` });
    } catch (err) {
        console.error('TNP update application status error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;