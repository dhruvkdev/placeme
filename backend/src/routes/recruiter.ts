import { Router, Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('RECRUITER'));

/**
 * GET /recruiter/dashboard
 * Returns stats and upcoming interviews.
 */
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
    try {
        const recruiterId = req.user!.id;

        const jobs = await db
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.recruiterId, recruiterId));

        const jobIds = jobs.map(j => j.id);

        let totalApplicants = 0;
        let shortlisted = 0;
        let interviewsScheduled = 0;
        let upcomingInterviews: any[] = [];

        if (jobIds.length > 0) {
            const apps = await db
                .select({
                    id: schema.applications.id,
                    state: schema.applications.state,
                    studentId: schema.applications.studentId,
                    studentName: schema.users.name,
                    jobTitle: schema.jobs.title,
                })
                .from(schema.applications)
                .innerJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
                .innerJoin(schema.students, eq(schema.applications.studentId, schema.students.id))
                .innerJoin(schema.users, eq(schema.students.id, schema.users.id))
                .where(eq(schema.jobs.recruiterId, recruiterId));

            totalApplicants = apps.length;
            shortlisted = apps.filter(a => ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'HR_ROUND', 'OFFERED', 'ACCEPTED'].includes(a.state)).length;

            const interviewApps = apps.filter(a => a.state === 'INTERVIEW_SCHEDULED');
            interviewsScheduled = interviewApps.length;

            if (interviewApps.length > 0) {
                const ints = await db
                    .select()
                    .from(schema.interviews)
                // In a real app we'd IN clause the application IDs
                // Simplified for now
            }
        }

        res.json({
            stats: {
                activeJobs: jobs.filter(j => j.state === 'PUBLISHED').length,
                totalApplicants,
                shortlisted,
                interviewsScheduled
            },
            upcomingInterviews // Mocked or simplified for now due to complex joins
        });
    } catch (err) {
        console.error('Recruiter dashboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /recruiter/jobs
 * Creates a new job listing.
 */
router.post('/jobs', async (req: Request, res: Response): Promise<void> => {
    try {
        const recruiterId = req.user!.id;
        const { title, description, location, minCgpa, type, ctc } = req.body;

        if (!title || !description) {
            res.status(400).json({ error: 'Title and description are required' });
            return;
        }

        const [job] = await db
            .insert(schema.jobs)
            .values({
                recruiterId,
                title,
                description: `${description}\n\nType: ${type}\nCTC: ${ctc}`, // Storing type/ctc in description for now since schema doesn't have them
                location,
                minCgpa: minCgpa ? minCgpa.toString() : null,
                state: 'SUBMITTED' // Awaiting T&P approval
            })
            .returning();

        res.status(201).json({ message: 'Job submitted for approval', job });
    } catch (err) {
        console.error('Post job error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /recruiter/applicants
 * Returns a list of applicants for the recruiter's jobs.
 */
router.get('/applicants', async (req: Request, res: Response): Promise<void> => {
    try {
        const recruiterId = req.user!.id;

        const apps = await db
            .select({
                id: schema.applications.id,
                state: schema.applications.state,
                appliedAt: schema.applications.appliedAt,
                studentId: schema.applications.studentId,
                studentName: schema.users.name,
                studentEmail: schema.users.email,
                studentCgpa: schema.students.cgpa,
                studentBranch: schema.students.branch,
                jobTitle: schema.jobs.title,
                collegeName: schema.colleges.name,
            })
            .from(schema.applications)
            .innerJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
            .innerJoin(schema.students, eq(schema.applications.studentId, schema.students.id))
            .innerJoin(schema.users, eq(schema.students.id, schema.users.id))
            .innerJoin(schema.colleges, eq(schema.students.collegeId, schema.colleges.id))
            .where(eq(schema.jobs.recruiterId, recruiterId))
            .orderBy(desc(schema.applications.appliedAt));

        res.json({ applicants: apps });
    } catch (err) {
        console.error('Fetch applicants error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /recruiter/applications/:appId/status
 * Updates an applicant's status (e.g. shortlisting).
 */
const VALID_APPLICATION_STATES = [
    'APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED',
    'HR_ROUND', 'OFFERED', 'ACCEPTED', 'REJECTED'
] as const;

type ApplicationState = typeof VALID_APPLICATION_STATES[number];

router.post('/applications/:appId/status', async (req: Request, res: Response): Promise<void> => {
    try {
        const { appId } = req.params;
        const { status, interviewDate, interviewTime, meetingLink } = req.body;
        const recruiterId = req.user!.id;

        // Validate the incoming status
        if (!status || !VALID_APPLICATION_STATES.includes(status as ApplicationState)) {
            res.status(400).json({
                error: `Invalid status. Must be one of: ${VALID_APPLICATION_STATES.join(', ')}`
            });
            return;
        }

        const [app] = await db
            .select()
            .from(schema.applications)
            .innerJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
            .where(and(eq(schema.applications.id, appId as string), eq(schema.jobs.recruiterId, recruiterId)))
            .limit(1);

        if (!app) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }

        const oldState = app.applications.state;

        if (oldState === status) {
            res.status(409).json({ error: `Application is already in state: ${status}` });
            return;
        }

        await db
            .update(schema.applications)
            .set({ state: status as ApplicationState })
            .where(eq(schema.applications.id, appId as string));

        // Audit trail
        await db
            .insert(schema.applicationStateLogs)
            .values({
                applicationId: appId as string,
                oldState: oldState,
                newState: status as ApplicationState,
                changedBy: recruiterId,
            });

        if (status === 'INTERVIEW_SCHEDULED' && interviewDate && interviewTime) {
            const scheduledAt = new Date(`${interviewDate}T${interviewTime}`);
            await db
                .insert(schema.interviews)
                .values({
                    applicationId: appId as string,
                    scheduledAt,
                    mode: meetingLink ? 'online' : 'offline',
                    meetingLink
                });
        }

        res.json({ message: `Application status updated to ${status}` });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;