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

// Supabase Transaction Pooler (port 6543) does not support prepared statements
const isTransactionPooler = DATABASE_URL.includes(':6543');

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5, // 풀 크기 축소 (Reduce pool size for stability)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10초로 증가 (Increase timeout)
  keepAlive: true, // TCP Keep-Alive 활성화 (Enable Keep-Alive)
  // Always use SSL with rejectUnauthorized: false for widest compatibility
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection immediately
pool.connect().then(client => {
  console.log('✅ Successfully connected to database');
  client.release();
}).catch(err => {
  console.error('❌ Failed to connect to database:', err);
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
  // Don't exit process on pool error, just log it.
  // The pool will try to reconnect or create new clients.
});

// If using transaction pooler, we might need specific drizzle config, 
// but node-postgres usually handles it fine if we don't use prepared statements explicitly.
// Drizzle defaults to not using prepared statements unless specified.
export const db = drizzle({ client: pool, schema });