import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema'; // make sure you export your tables here

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

// Create the Neon client
const client = neon(process.env.DATABASE_URL);

// Create the Drizzle instance
export const db = drizzle(client, { schema });
