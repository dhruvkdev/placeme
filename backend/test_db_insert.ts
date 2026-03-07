import 'dotenv/config';
import { db, schema } from './src/db/index.js';
import { eq } from 'drizzle-orm';

async function testQuery() {
    try {
        const users = await db.select().from(schema.users).where(eq(schema.users.role, 'RECRUITER'));
        if (users.length === 0) {
            console.log('No recruiter users found');
            return;
        }
        const recruiterId = users[0].id;

        const colleges = await db.select().from(schema.colleges).limit(1);
        if (colleges.length === 0) {
            console.log('No colleges found');
            return;
        }

        console.log('Trying to insert job for recruiter ' + recruiterId + ' and college ' + colleges[0].id);

        const insertedJobs = await db
            .insert(schema.jobs)
            .values([{
                recruiterId: recruiterId,
                collegeId: colleges[0].id,
                title: 'Test Job 123',
                description: 'Description\n\nType: Full-Time\nCTC: 10LPA',
                location: 'Remote',
                state: 'SUBMITTED'
            }])
            .returning();

        console.log('Success!', insertedJobs);
    } catch (err) {
        console.error('DB ERROR CAUGHT:');
        console.error(err);
    }
    process.exit(0);
}
testQuery();
