import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq, and, gt, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

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
 * Re-checks domain (security), generates 6-digit OTP, saves to emailOtps, and emails it.
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

        // Save OTP to database
        await db
            .insert(schema.emailOtps)
            .values({
                email: email.toLowerCase(),
                otp,
                expiresAt,
            });

        // Construct the email
        const subject = "Your MockMate Verification Code";
        const htmlMessage = `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
                <h2 style="color: #333;">Welcome to MockMate!</h2>
                <p style="color: #555; font-size: 16px;">Use the following One-Time Password (OTP) to verify your student account:</p>
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

/**
 * GET /student/dashboard
 * Returns overview metrics for the student.
 */
router.get('/dashboard', authenticate, requireRole('STUDENT'), async (req: Request, res: Response): Promise<void> => {
    try {
        const studentId = req.user!.id;

        const [student] = await db
            .select()
            .from(schema.students)
            .where(eq(schema.students.id, studentId))
            .limit(1);

        if (!student) {
            res.status(404).json({ error: 'Student profile not found' });
            return;
        }

        let profileCompleteness = 50;
        if (student.cgpa) profileCompleteness += 20;
        if (student.branch) profileCompleteness += 15;
        if (student.graduationYear) profileCompleteness += 15;
        if (student.state === 'VERIFIED') profileCompleteness = 100;

        const appRows = await db
            .select()
            .from(schema.applications)
            .where(eq(schema.applications.studentId, studentId));

        const applicationCount = appRows.length;

        const intRows = await db
            .select()
            .from(schema.interviews)
            .innerJoin(schema.applications, eq(schema.interviews.applicationId, schema.applications.id))
            .where(eq(schema.applications.studentId, studentId));

        const interviewCount = intRows.length;

        res.json({
            stats: {
                atsScore: 82, // Mocked for now
                applications: applicationCount,
                interviews: interviewCount,
                profileCompleteness,
            }
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /student/jobs
 * Returns published jobs available for the student.
 */
router.get('/jobs', authenticate, requireRole('STUDENT'), async (req: Request, res: Response): Promise<void> => {
    try {
        const publishedJobs = await db
            .select({
                id: schema.jobs.id,
                title: schema.jobs.title,
                description: schema.jobs.description,
                location: schema.jobs.location,
                minCgpa: schema.jobs.minCgpa,
                createdAt: schema.jobs.createdAt,
                companyName: schema.companies.name,
                companyWebsite: schema.companies.website,
            })
            .from(schema.jobs)
            .innerJoin(schema.recruiters, eq(schema.jobs.recruiterId, schema.recruiters.id))
            .innerJoin(schema.companies, eq(schema.recruiters.companyId, schema.companies.id))
            .where(eq(schema.jobs.state, 'PUBLISHED'))
            .orderBy(desc(schema.jobs.createdAt));

        res.json({ jobs: publishedJobs });
    } catch (err) {
        console.error('Fetch jobs error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /student/jobs/:jobId/apply
 * Apply for a specific job.
 */
router.post('/jobs/:jobId/apply', authenticate, requireRole('STUDENT'), async (req: Request, res: Response): Promise<void> => {
    try {
        const jobId = req.params.jobId as string;
        const studentId = req.user!.id;

        const [student] = await db
            .select()
            .from(schema.students)
            .where(eq(schema.students.id, studentId))
            .limit(1);

        if (!student) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }

        if (student.state !== 'VERIFIED') {
            res.status(403).json({ error: 'Your profile must be verified to apply for jobs' });
            return;
        }

        const [job] = await db
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.id, jobId))
            .limit(1);

        if (!job || job.state !== 'PUBLISHED') {
            res.status(404).json({ error: 'Job not found or not published' });
            return;
        }

        if (job.minCgpa && student.cgpa && parseFloat(student.cgpa) < parseFloat(job.minCgpa)) {
            res.status(403).json({ error: `Requires minimum CGPA of ${job.minCgpa}` });
            return;
        }

        const [existingApp] = await db
            .select()
            .from(schema.applications)
            .where(and(eq(schema.applications.studentId, studentId), eq(schema.applications.jobId, jobId)))
            .limit(1);

        if (existingApp) {
            res.status(409).json({ error: 'Already applied for this job' });
            return;
        }

        const [application] = await db
            .insert(schema.applications)
            .values({
                studentId,
                jobId,
                state: 'APPLIED',
            })
            .returning();

        await db
            .insert(schema.applicationStateLogs)
            .values({
                applicationId: application.id,
                oldState: 'APPLIED',
                newState: 'APPLIED',
                changedBy: studentId,
            });

        res.status(201).json({ message: 'Applied successfully', application });
    } catch (err) {
        console.error('Apply job error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /student/applications
 * Returns a list of applications made by the student.
 */
router.get('/applications', authenticate, requireRole('STUDENT'), async (req: Request, res: Response): Promise<void> => {
    try {
        const studentId = req.user!.id;

        const apps = await db
            .select({
                id: schema.applications.id,
                state: schema.applications.state,
                appliedAt: schema.applications.appliedAt,
                jobTitle: schema.jobs.title,
                jobLocation: schema.jobs.location,
                companyName: schema.companies.name,
            })
            .from(schema.applications)
            .innerJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
            .innerJoin(schema.recruiters, eq(schema.jobs.recruiterId, schema.recruiters.id))
            .innerJoin(schema.companies, eq(schema.recruiters.companyId, schema.companies.id))
            .where(eq(schema.applications.studentId, studentId))
            .orderBy(desc(schema.applications.appliedAt));

        res.json({ applications: apps });
    } catch (err) {
        console.error('Fetch applications error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;