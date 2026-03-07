import 'dotenv/config';
import { db, schema } from './src/db/index.js';
import { eq, isNull } from 'drizzle-orm';

async function fixMissingRecruiterProfiles() {
    try {
        console.log('Finding missing recruiter profiles...');

        // Find users with role='RECRUITER'
        const users = await db.select().from(schema.users).where(eq(schema.users.role, 'RECRUITER'));

        // Find existing recruiters
        const recruiters = await db.select().from(schema.recruiters);
        const recruiterIds = new Set(recruiters.map(r => r.id));

        // Find missing ones
        const missingUsers = users.filter(u => !recruiterIds.has(u.id));

        if (missingUsers.length === 0) {
            console.log('No missing recruiter profiles found. Everything is fine.');
            process.exit(0);
        }

        console.log(`Found ${missingUsers.length} missing recruiter profiles. Fixing...`);

        const insertData = missingUsers.map(u => ({
            id: u.id,
            companyId: null
        }));

        await db.insert(schema.recruiters).values(insertData);

        console.log('Successfully fixed missing recruiter profiles!');
    } catch (err) {
        console.error('Error fixing db:', err);
    }
    process.exit(0);
}

fixMissingRecruiterProfiles();
