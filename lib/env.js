// Runtime environment variable validation
// Ensures required environment variables are present at startup

// Required for all deployments
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

// Required for Solana deployment
const requiredSolanaVars = [
  'NEXT_PUBLIC_SOLANA_RPC_URL',
  'NEXT_PUBLIC_SOLANA_NETWORK'
];

// Required for Bags.fm integration (server-side only)
const requiredBagsVars = [
  'BAGS_API_KEY'
];

// Optional but recommended
const recommendedVars = [
  'NEXT_PUBLIC_SOLANA_WS_ENDPOINT',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_RPC_LATENCY_ALERT_THRESHOLD_MS'
];

// Optional server-side only recommended vars
const recommendedServerVars = [
  'TELEMETRY_ALERT_WEBHOOK_URL'
];

/**
 * Validates that all required environment variables are present
 * Throws an error with clear messaging if any are missing
 * @throws {Error} If any required environment variable is missing
 */
export function validateEnvironment() {
  const isClient = typeof window !== 'undefined';

  // Check base required vars (NEXT_PUBLIC_*)
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  // Check Solana vars (NEXT_PUBLIC_*)
  const missingSolana = requiredSolanaVars.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  // Check Bags vars ONLY on server — these are never available client-side
  const missingBags = isClient
    ? []
    : requiredBagsVars.filter(
        (key) => !process.env[key] || process.env[key].trim() === ''
      );

  // Build error message
  const errors = [];
  
  if (missing.length > 0) {
    errors.push(
      '❌ Missing required environment variables:',
      ...missing.map(key => `  - ${key}`)
    );
  }
  
  if (missingSolana.length > 0) {
    errors.push(
      '',
      '❌ Missing required Solana environment variables:',
      ...missingSolana.map(key => `  - ${key}`),
      '  See .env.example for Solana configuration options.'
    );
  }
  
  if (missingBags.length > 0) {
    errors.push(
      '',
      '❌ Missing required Bags.fm environment variables:',
      ...missingBags.map(key => `  - ${key}`),
      '  Get your API key at https://docs.bags.fm/faq/how-to-get-api-key',
      '  WARNING: BAGS_API_KEY must NEVER be exposed client-side!'
    );
  }

  if (errors.length > 0) {
    errors.push(
      '',
      'Please check your .env file and ensure all required variables are set.',
      'See .env.example for reference.'
    );
    
    // On the client, warn instead of crashing the entire app — the
    // fallback RPC endpoint will still allow the UI to render.
    if (isClient) {
      console.warn(errors.join('\n'));
      return;
    }

    throw new Error(errors.join('\n'));
  }

  // Validate Solana network value
  const validNetworks = ['mainnet-beta', 'devnet', 'testnet'];
  const solanaNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK;
  if (solanaNetwork && !validNetworks.includes(solanaNetwork)) {
    throw new Error(
      `❌ Invalid NEXT_PUBLIC_SOLANA_NETWORK: "${solanaNetwork}"\n` +
      `   Must be one of: ${validNetworks.join(', ')}`
    );
  }

  // Warn about recommended vars
  const missingRecommended = recommendedVars.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );
  
  if (missingRecommended.length > 0) {
    console.warn(
      '⚠️  Missing recommended environment variables:\n' +
      missingRecommended.map(key => `  - ${key}`).join('\n') + '\n' +
      '  These are optional but may improve performance.\n'
    );
  }

  // Warn about recommended server-side vars ONLY on server
  if (!isClient) {
    const missingServerRec = recommendedServerVars.filter(
      (key) => !process.env[key] || process.env[key].trim() === ''
    );
    if (missingServerRec.length > 0) {
      console.warn(
        '⚠️  Missing recommended server-side environment variables:\n' +
        missingServerRec.map(key => `  - ${key}`).join('\n') + '\n' +
        '  Configure these for enhanced production monitoring and webhook alerts.\n'
      );
    }
  }

  // Security check: ensure sensitive keys are not client-side
  if (typeof window !== 'undefined') {
    if (process.env.BAGS_API_KEY) {
      console.error(
        '🔒 SECURITY WARNING: BAGS_API_KEY appears to be exposed client-side!\n' +
        '   This key must ONLY be used in server routes.\n' +
        '   Remove it from NEXT_PUBLIC_ prefixed variables immediately.'
      );
    }
    if (process.env.TELEMETRY_ALERT_WEBHOOK_URL) {
      console.error(
        '🔒 SECURITY WARNING: TELEMETRY_ALERT_WEBHOOK_URL appears to be exposed client-side!\n' +
        '   This key must ONLY be used in server environments/routes.\n' +
        '   Remove it from client bundles immediately.'
      );
    }
  }
}

/**
 * Validates server-side only environment variables
 * Call this in API routes to ensure server vars are available
 * @throws {Error} If server-side variables are missing
 */
export function validateServerEnvironment() {
  const missing = requiredBagsVars.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  if (missing.length > 0) {
    throw new Error(
      '❌ Missing required server-side environment variables:\n' +
      missing.map(key => `  - ${key}`).join('\n') + '\n' +
      'These variables must be set in the server environment and never exposed client-side.'
    );
  }
}
