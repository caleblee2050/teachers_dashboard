import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartnotesync';

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  Warning: DATABASE_URL not set. Using default localhost database.');
  console.warn('   For production, set DATABASE_URL in your .env file.');
}

console.log('🔌 Connecting to Supabase with session pooling...');
console.log('   Host:', DATABASE_URL.split('@')[1]?.split('/')[0] || 'unknown');

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Supabase pooler requires SSL
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to Supabase database');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

export const db = drizzle({ client: pool, schema });