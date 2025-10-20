import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

/**
 * Environment variable schema with validation
 * Ensures all required environment variables are present at startup
 */
const envSchema = z.object({
  // Database (optional for initial setup)
  DATABASE_URL: z.string().optional(),

  // AI API Keys (optional for initial setup)
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Google OAuth (optional for initial setup)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Session
  SESSION_SECRET: z.string().default('development-session-secret-replace-in-production'),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional: Replit deployment
  REPLIT_DOMAINS: z.string().optional(),
});

/**
 * Validated environment variables
 * Type-safe access to environment variables throughout the application
 */
export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
  console.log('✓ Environment variables validated successfully');
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment variable validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }
  throw error;
}

export { env };

/**
 * Helper function to check if running in production
 */
export const isProduction = () => env.NODE_ENV === 'production';

/**
 * Helper function to check if running in development
 */
export const isDevelopment = () => env.NODE_ENV === 'development';

/**
 * Helper function to check if running in test environment
 */
export const isTest = () => env.NODE_ENV === 'test';
