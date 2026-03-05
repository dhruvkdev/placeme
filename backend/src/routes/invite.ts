import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, and, gt } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 10;

/**
 * GET /invite/validate?token=xyz
 * Public endpoint. Checks if a token is valid, not expired, and not used.
 * Returns the email associated with the invitation.
 */
router.get('/validate', async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.query.token as string;

        if (!token) {
            res.status(400).json({ error: 'Token is required' });
            return;
        }

        const [invitation] = await db
            .select()
            .from(schema.invitations)
            .where(
                and(
                    eq(schema.invitations.token, token),
                    eq(schema.invitations.isUsed, false),
                    gt(schema.invitations.expiresAt, new Date())
                )
            )
            .limit(1);

        if (!invitation) {
            res.status(404).json({ valid: false, error: 'Invalid, expired, or already used token' });
            return;
        }

        res.json({
            valid: true,
            email: invitation.email,
            role: invitation.role,
        });
    } catch (err) {
        console.error('Validate error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /invite/register
 * Body: { token, name, password }
 * Public endpoint. Validates the invitation token, creates the user (role TNP),
 * creates a tnp_profiles row, marks the invitation as used, and returns a JWT.
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, name, password } = req.body;

        if (!token || !name || !password) {
            res.status(400).json({ error: 'Token, name, and password are required' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        // Find valid invitation
        const [invitation] = await db
            .select()
            .from(schema.invitations)
            .where(
                and(
                    eq(schema.invitations.token, token),
                    eq(schema.invitations.isUsed, false),
                    gt(schema.invitations.expiresAt, new Date())
                )
            )
            .limit(1);

        if (!invitation) {
            res.status(404).json({ error: 'Invalid, expired, or already used token' });
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const [user] = await db
            .insert(schema.users)
            .values({
                name,
                email: invitation.email,
                passwordHash,
                role: 'TNP',
            })
            .returning();

        // Create tnp_profiles row (collegeId null for now — they set it up later)
        await db
            .insert(schema.tnpProfiles)
            .values({
                id: user.id,
            });

        // Mark invitation as used
        await db
            .update(schema.invitations)
            .set({ isUsed: true })
            .where(eq(schema.invitations.id, invitation.id));

        // Sign JWT
        const jwtToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token: jwtToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
