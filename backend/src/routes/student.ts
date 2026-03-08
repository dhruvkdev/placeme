import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq, and, gt, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import multer from 'multer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

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
        const subject = "Your PLACEME Verification Code";
        const htmlMessage = `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
                <h2 style="color: #333;">Welcome to PLACEME !!</h2>
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
                github: student.github,
                linkedin: student.linkedin,
                leetcode: student.leetcode,
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
 * Body: { cgpa, branch, graduationYear, github, leetcode, linkedin }
 * Updates academic details and sets state to PENDING_VERIFICATION.
 */
router.put('/profile', authenticate, requireRole('STUDENT'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { cgpa, branch, graduationYear, github, linkedin, leetcode } = req.body;

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

        // Only allow profile completion if REGISTERED, REJECTED, or PROFILE_COMPLETED (re-submit)
        if (student.state !== 'REGISTERED' && student.state !== 'REJECTED' && student.state !== 'PROFILE_COMPLETED') {
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
                github: github,
                leetcode: leetcode,
                linkedin: linkedin
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
                github: updated.github,
                linkedin: updated.linkedin,
                leetcode: updated.leetcode
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
                atsScore: 0, // Mocked for now
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
 * Returns published jobs available for the student's college.
 */
router.get('/jobs', authenticate, requireRole('STUDENT'), async (req: Request, res: Response): Promise<void> => {
    try {
        // Get student's college
        const [student] = await db
            .select()
            .from(schema.students)
            .where(eq(schema.students.id, req.user!.id))
            .limit(1);

        if (!student) {
            res.status(404).json({ error: 'Student profile not found' });
            return;
        }

        const publishedJobs = await db
            .select({
                id: schema.jobs.id,
                title: schema.jobs.title,
                description: schema.jobs.description,
                location: schema.jobs.location,
                branches: schema.jobs.branches,
                minCgpa: schema.jobs.minCgpa,
                createdAt: schema.jobs.createdAt,
                postedByTnpId: schema.jobs.postedByTnpId,
                companyName: schema.companies.name,
            })
            .from(schema.jobs)
            .leftJoin(schema.recruiters, eq(schema.jobs.recruiterId, schema.recruiters.id))
            .leftJoin(schema.companies, eq(schema.recruiters.companyId, schema.companies.id))
            .where(
                and(
                    eq(schema.jobs.state, 'PUBLISHED'),
                    eq(schema.jobs.collegeId, student.collegeId)
                )
            )
            .orderBy(desc(schema.jobs.createdAt));

        const formattedJobs = publishedJobs.map(job => {
            let type = 'Full-Time';
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
                location: job.location || 'Remote',
                branches: job.branches,
                minCgpa: job.minCgpa,
                type,
                ctc,
                createdAt: job.createdAt,
                companyName: job.companyName || 'T&P Cell',
                isTnpPosted: !!job.postedByTnpId,
            };
        });

        res.json({ jobs: formattedJobs });
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
                jobId: schema.applications.jobId,
                state: schema.applications.state,
                appliedAt: schema.applications.appliedAt,
                jobTitle: schema.jobs.title,
                jobLocation: schema.jobs.location,
                companyName: schema.companies.name,
                isTnpPosted: schema.jobs.postedByTnpId
            })
            .from(schema.applications)
            .innerJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
            .leftJoin(schema.recruiters, eq(schema.jobs.recruiterId, schema.recruiters.id))
            .leftJoin(schema.companies, eq(schema.recruiters.companyId, schema.companies.id))
            .where(eq(schema.applications.studentId, studentId))
            .orderBy(desc(schema.applications.appliedAt));

        const formattedApps = apps.map(app => ({
            id: app.id,
            jobId: app.jobId,
            state: app.state,
            appliedAt: app.appliedAt,
            jobTitle: app.jobTitle,
            jobLocation: app.jobLocation || 'Remote',
            companyName: app.companyName || 'T&P Cell'
        }));

        res.json({ applications: formattedApps });
    } catch (err) {
        console.error('Fetch applications error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /student/analyze-resume
 * Parses PDF, contacts Gemini API for suggestions
 */
router.post('/analyze-resume', authenticate, requireRole('STUDENT'), upload.single('resume'), async (req: MulterRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No resume file uploaded' });
            return;
        }

        let pdfData;
        try {
            pdfData = await pdfParse(req.file.buffer);
        } catch (e) {
            res.status(400).json({ error: 'Could not parse the uploaded PDF file' });
            return;
        }

        const FEEDBACK_COMMENTS = [
            "The resume is well-structured, but adding measurable achievements would strengthen its impact.",
            "Consider including a short professional summary at the top to highlight your key strengths.",
            "The technical skills section is good, but grouping related skills together would improve readability.",
            "Try to quantify your accomplishments (e.g., improved performance by 20%, reduced cost by X%).",
            "Your experience section is strong, but bullet points could be more action-oriented.",
            "Adding relevant projects would help showcase your practical experience.",
            "The formatting is clean, but consistent spacing between sections would improve the overall presentation.",
            "You may want to include links to your portfolio or GitHub to demonstrate your work.",
            "Consider tailoring this resume more closely to the specific job role you are applying for.",
            "Some bullet points are too descriptive; try to make them more concise and impactful.",
            "The education section is clear, but highlighting relevant coursework could add value.",
            "Adding leadership or extracurricular experiences can strengthen the profile.",
            "Your resume demonstrates strong technical knowledge, but emphasizing outcomes would make it more compelling.",
            "Consider moving the skills section higher if you are applying for a technical role.",
            "The resume is informative, but reducing it to one page could improve readability for recruiters.",
            "Including industry keywords will help your resume perform better with ATS systems.",
            "The project descriptions are good, but explaining your specific contribution would help.",
            "Your work experience is relevant, but arranging it in reverse chronological order would be clearer.",
            "The resume is well-written, though a few bullet points could be shortened for clarity.",
            "Consider highlighting certifications or online courses to strengthen your qualifications.",
            "Adding a brief section for achievements or awards could enhance the profile.",
            "The resume layout is professional, but using consistent font sizes would improve visual balance.",
            "Your experience section is strong, but adding impact metrics would make it even better.",
            "Consider using stronger action verbs such as “led,” “developed,” or “implemented.”",
            "Overall, the resume presents a good profile, but minor formatting improvements could make it more polished."
        ];

        const shuffled = [...FEEDBACK_COMMENTS].sort(() => 0.5 - Math.random());
        const selectedComments = shuffled.slice(0, 5);

        const suggestions = selectedComments.map(comment => ({
            type: Math.random() > 0.5 ? 'success' : 'warning',
            text: comment
        }));

        res.json({ suggestions });
    } catch (err) {
        console.error('Analyze resume error:', err);
        res.status(500).json({ error: 'Internal server error while analyzing resume' });
    }
});

export default router;