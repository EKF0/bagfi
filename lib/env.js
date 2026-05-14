// Runtime environment variable validation
// Ensures required environment variables are present at startup

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'
];

/**
 * Validates that all required environment variables are present
 * Throws an error with clear messaging if any are missing
 * @throws {Error} If any required environment variable is missing
 */
export function validateEnvironment() {
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  if (missing.length > 0) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      ...missing.map(key => `  - ${key}`),
      '',
      'Please check your .env file and ensure all required variables are set.',
      'See .env.example for reference.'
    ].join('\n');
    
    throw new Error(errorMessage);
  }
}