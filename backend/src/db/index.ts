import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || '';
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  max: 10,
  keepAlive: true,
  allowExitOnIdle: false,
});

pool.on('error', (err) => {
  console.error('Database pool error (connection dropped):', err.message);
});

pool.connect()
  .then((client) => {
    console.log('Database connected successfully');
    client.release();
  })
  .catch((err) => {
    console.error('Database connection FAILED on startup:', err.message);
    console.error('   → Check your DATABASE_URL and network connectivity');
  });

export const db = drizzle(pool, { schema });
export { schema };
