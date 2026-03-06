import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireRole('ADMIN'));

/**
 * POST /admin/invite-tnp
 * Body: { email }
 * Creates an invitation for a T&P coordinator.
 * Returns the magic link (email sending deferred to Phase 2).
 */
router.post('/invite-tnp', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // Check if user already exists with this email
        const [existingUser] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, email))
            .limit(1);

        if (existingUser) {
            res.status(409).json({ error: 'A user with this email already exists' });
            return;
        }

        // Check if there's already a pending invitation for this email
        const [existingInvite] = await db
            .select()
            .from(schema.invitations)
            .where(eq(schema.invitations.email, email))
            .limit(1);

        if (existingInvite && !existingInvite.isUsed) {
            res.status(409).json({ error: 'An invitation for this email is already pending' });
            return;
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');

        // Set expiry to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Insert invitation
        const [invitation] = await db
            .insert(schema.invitations)
            .values({
                email,
                role: 'TNP',
                token,
                expiresAt,
                invitedBy: req.user!.id,
            })
            .returning();

        // For now, return the link instead of emailing it
        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-account?token=${token}`;

        const emailSubject = "Invitation to Join as T&P Coordinator";
        const emailHtml = `
            <h2>You've been invited!</h2>
            <p>You have been invited to join the platform as a Training & Placement Coordinator.</p>
            <p>Click the link below to set up your account. This link will expire in 7 days.</p>
            <a href="${inviteLink}">Set up my account</a>
        `;

        const { error: emailError } = await sendEmail(email, emailSubject, emailHtml);

        if (emailError) {
            console.error('Failed to send Resend email:', emailError);
            // You can choose to return a 500 here, but returning a 201 with a warning 
            // is often better since the DB record was successfully created.
            res.status(201).json({
                message: 'Invitation created, but failed to send email.',
                inviteLink, 
                warning: emailError.message,
                invitation: {
                    id: invitation.id,
                    email: invitation.email,
                },
            });
            return;
        }

        res.status(201).json({
            message: 'Invitation created and email sent successfully',
            // You can remove inviteLink from the response later for better security in prod
            inviteLink, 
            invitation: {
                id: invitation.id,
                email: invitation.email,
                expiresAt: invitation.expiresAt,
            },
        });
    }catch (err) {
        console.error('Invite error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
