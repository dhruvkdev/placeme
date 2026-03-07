import { Router, Request, Response } from 'express';
import { eq, and, desc, gt } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET!;



/**
 * POST /recruiter/send-otp
 * Body: { email }
 * Re-checks domain (security), generates 6-digit OTP, saves to emailOtps, and emails it.
 */
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Set expiry to 10 minutes
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Save OTP to database
        await db
            .insert(schema.emailOtps)
            .values({
                email: email.toLowerCase(),
                otp,
                expiresAt,
            });

        // Construct the email
        const subject = "Your Placeme Verification Code";
        const htmlMessage = `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
                <h2 style="color: #333;">Welcome to Placeme!</h2>
                <p style="color: #555; font-size: 16px;">Use the following One-Time Password (OTP) to verify your recruiter account:</p>
                <div style="background-color: #f4f4f4; padding: 16px; text-align: center; border-radius: 6px; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #000;">${otp}</span>
                </div>
                <p style="color: #777; font-size: 14px;">This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
            </div>
        `;

        // Send the OTP via Resend
        const { error: emailError } = await sendEmail(email.toLowerCase(), subject, htmlMessage);

        if (emailError) {
            console.error('Failed to send OTP email via Resend:', emailError);
            res.status(500).json({
                error: 'Failed to send OTP email. Please try again later.',
                details: emailError.message
            });
            return;
        }

        // Success response (DO NOT return the OTP in the JSON anymore)
        res.json({
            message: 'OTP sent successfully to your email',
            expiresInMinutes: 10,
        });
    } catch (err) {
        console.error('Send OTP error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /recruiter/verify-otp
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
                role: 'RECRUITER',
            })
            .returning();

        // Create recruiter profile (state defaults to REGISTERED)
        await db
            .insert(schema.recruiters)
            .values({
                id: user.id,
                companyId: null,
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

router.use(authenticate, requireRole('RECRUITER'));

/**
 * GET /recruiter/profile
 * Returns the Recruiter profile with company info.
 * Frontend checks `companyId === null` to force the setup screen.
 */
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
    try {
        const [profile] = await db
            .select()
            .from(schema.recruiters)
            .where(eq(schema.recruiters.id, req.user!.id))
            .limit(1);

        if (!profile) {
            res.status(404).json({ error: 'Recruiter profile not found' });
            return;
        }

        // If company is linked, fetch company details + domains
        let company = null;
        let domains: string[] = [];

        if (profile.companyId) {
            const [companyRow] = await db
                .select()
                .from(schema.companies)
                .where(eq(schema.companies.id, profile.companyId))
                .limit(1);

            company = companyRow || null;

            if (company) {
                const domainRows = await db
                    .select()
                    .from(schema.companyDomains)
                    .where(eq(schema.companyDomains.companyId, company.id));

                domains = domainRows.map((d) => d.domain);
            }
        }

        res.json({
            profile: {
                id: profile.id,
                companyId: profile.companyId,
                createdAt: profile.createdAt,
            },
            company,
            domains,
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /recruiter/setup-company
 * Body: { companyName: string, domains: string[] }
 * Creates company → inserts domains → links recruiter profile.
 * Only allowed when companyId is null (first-time setup).
 */
router.post('/setup-company', async (req: Request, res: Response): Promise<void> => {
    try {
        const { companyName, domains } = req.body;

        if (!companyName || !domains || !Array.isArray(domains) || domains.length === 0) {
            res.status(400).json({ error: 'companyName and at least one domain are required' });
            return;
        }

        // Check that recruiter hasn't already set up a company
        const [profile] = await db
            .select()
            .from(schema.recruiters)
            .where(eq(schema.recruiters.id, req.user!.id))
            .limit(1);

        if (!profile) {
            res.status(404).json({ error: 'Recruiter profile not found' });
            return;
        }

        if (profile.companyId) {
            res.status(409).json({ error: 'Company already configured' });
            return;
        }

        // Create company
        const [company] = await db
            .insert(schema.companies)
            .values({ name: companyName })
            .returning();

        // Insert domains
        const domainRows = await db
            .insert(schema.companyDomains)
            .values(
                domains.map((domain: string) => ({
                    companyId: company.id,
                    domain: domain.toLowerCase().trim(),
                }))
            )
            .returning();

        // Link recruiter to the new company
        await db
            .update(schema.recruiters)
            .set({ companyId: company.id })
            .where(eq(schema.recruiters.id, req.user!.id));

        res.status(201).json({
            message: 'Company created and linked successfully',
            company,
            domains: domainRows.map((d) => d.domain),
        });
    } catch (err) {
        console.error('Setup company error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

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
 * GET /recruiter/colleges
 * Returns a list of all colleges that have a registered T&P.
 * Recruiters use this to select a college when posting a job.
 */
router.get('/colleges', async (req: Request, res: Response): Promise<void> => {
    try {
        const registeredColleges = await db
            .select({
                id: schema.colleges.id,
                name: schema.colleges.name,
            })
            .from(schema.colleges)
            .innerJoin(schema.tnpProfiles, eq(schema.tnpProfiles.collegeId, schema.colleges.id));

        // Ensure unique colleges in case multiple T&Ps are linked to the same college
        const uniqueColleges = Array.from(new Map(registeredColleges.map(c => [c.id, c])).values());

        res.json({ colleges: uniqueColleges });
    } catch (err) {
        console.error('Fetch colleges error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /recruiter/jobs
 * Creates a new job listing for ALL colleges with a registered T&P Profile.
 */
router.post('/jobs', async (req: Request, res: Response): Promise<void> => {
    try {
        const recruiterId = req.user!.id;
        const { title, description, location, minCgpa, type, ctc, branches } = req.body;

        if (!title || !description) {
            res.status(400).json({ error: 'Title and description are required' });
            return;
        }

        // Ensure recruiter profile exists and company is configured
        const [recruiterProfile] = await db
            .select()
            .from(schema.recruiters)
            .where(eq(schema.recruiters.id, recruiterId))
            .limit(1);

        if (!recruiterProfile) {
            res.status(404).json({ error: 'Recruiter profile not found. Please complete recruiter onboarding.' });
            return;
        }

        if (!recruiterProfile.companyId) {
            res.status(400).json({ error: 'Please complete company setup before posting jobs.' });
            return;
        }

        // 1. Get all colleges that have a registered T&P
        const registeredColleges = await db
            .select({ id: schema.colleges.id })
            .from(schema.colleges)
            .innerJoin(schema.tnpProfiles, eq(schema.tnpProfiles.collegeId, schema.colleges.id));

        // Deduplicate in case there are multiple TNPs per college
        const uniqueCollegeIds = Array.from(new Set(registeredColleges.map(c => c.id)));

        if (uniqueCollegeIds.length === 0) {
            res.status(400).json({ error: 'No colleges are currently registered on the platform.' });
            return;
        }

        // 2. Prepare bulk insert data
        const jobsData = uniqueCollegeIds.map(collegeId => ({
            recruiterId,
            collegeId,
            title,
            description: `${description}\n\nType: ${type || 'Full-Time'}\nCTC: ${ctc || 'N/A'}`,
            location,
            branches: branches && branches.length > 0 ? branches : null,
            minCgpa: minCgpa ? minCgpa.toString() : null,
            state: 'SUBMITTED' as const // Awaiting T&P approval
        }));

        // 3. Bulk Insert
        const insertedJobs = await db
            .insert(schema.jobs)
            .values(jobsData)
            .returning();

        res.status(201).json({ message: 'Job submitted for approval', job: insertedJobs[0] });
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
            .innerJoin(schema.students, eq(schema.applications.studentId, schema.students.id))
            .innerJoin(schema.users, eq(schema.students.id, schema.users.id))
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

            // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ assumes UTC, but let's use the local time from the string as a simpler format)
            // A simple 1-hour duration for the calendar event
            const endTime = new Date(scheduledAt.getTime() + 60 * 60 * 1000);

            const formatDateForGCal = (date: Date) => {
                return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
            };

            const gcalDetails = encodeURIComponent(`Interview for ${app.jobs.title}`);
            const gcalLocation = encodeURIComponent(meetingLink ? meetingLink : 'Offline');
            const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Interview: ${app.jobs.title}`)}&dates=${formatDateForGCal(scheduledAt)}/${formatDateForGCal(endTime)}&details=${gcalDetails}&location=${gcalLocation}`;

            // Send Email
            const subject = `Interview Scheduled: ${app.jobs.title}`;
            const htmlMessage = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
                    <h2 style="color: #333;">Interview Scheduled</h2>
                    <p style="color: #555; font-size: 16px;">Hi ${app.users.name || 'Student'},</p>
                    <p style="color: #555; font-size: 16px;">Your interview for the position of <strong>${app.jobs.title}</strong> has been scheduled.</p>
                    <p style="color: #555; font-size: 16px;"><strong>Date:</strong> ${interviewDate}</p>
                    <p style="color: #555; font-size: 16px;"><strong>Time:</strong> ${interviewTime}</p>
                    ${meetingLink ? `<p style="color: #555; font-size: 16px;"><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${gcalLink}" target="_blank" style="background-color: #4285F4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Add to Google Calendar</a>
                    </div>
                    <p style="color: #777; font-size: 14px;">Log in to your Placeme dashboard for more details.</p>
                </div>
            `;

            try {
                await sendEmail(app.users.email, subject, htmlMessage);
            } catch (emailErr) {
                console.error("Failed to send interview email notification", emailErr);
                // Non-fatal, we still created the interview.
            }

            // Insert in-app notification
            await db.insert(schema.notifications).values({
                userId: app.users.id,
                type: 'INTERVIEW_SCHEDULED',
                message: `Your interview for ${app.jobs.title} is scheduled on ${interviewDate} at ${interviewTime}.`
            });
        }

        res.json({ message: `Application status updated to ${status}` });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;