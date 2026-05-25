/**
 * Telemetry utility
 * Structured logging, Sentry error tracking, and real-time alerting.
 * Works in both client and server environments.
 */

import * as Sentry from "@sentry/nextjs";

interface TelemetryEvent {
  type: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

interface BagsRequestRecord {
  status: number;
  timestamp: number;
}

const events: TelemetryEvent[] = [];
const recentBagsRequests: BagsRequestRecord[] = [];
let bagsSpikeAlertActive = false;

// Alert Thresholds
const DEFAULT_LATENCY_THRESHOLD_MS = 10000; // 10 seconds

/**
 * Format and send system alerts using configured Webhook URLs or secure Client API route.
 */
export async function sendAlert(title: string, message: string, data?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  
  // Format embed payload for Discord-compatible webhooks
  const payload = {
    embeds: [
      {
        title: `🚨 BagFi System Alert: ${title}`,
        description: message,
        color: 0xff0000, // Red
        fields: Object.entries(data || {}).map(([key, val]) => ({
          name: key,
          value: typeof val === 'object' 
            ? JSON.stringify(val).substring(0, 1024) 
            : String(val).substring(0, 1024),
          inline: true
        })),
        timestamp
      }
    ]
  };

  // Log alert securely in server/client consoles
  console.error(`[TELEMETRY ALERT] [${title}] ${message}`, data || '');

  const isServer = typeof window === 'undefined';
  const webhookUrl = process.env.TELEMETRY_ALERT_WEBHOOK_URL;

  if (isServer) {
    if (webhookUrl && webhookUrl !== 'https://discord.com/api/webhooks/mock') {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          console.warn(`[Telemetry] Alert webhook returned non-2xx status: ${response.status}`);
        }
      } catch (e) {
        console.error('[Telemetry] Webhook dispatch failed:', e);
      }
    }
  } else {
    // Client-side secure alert forwarding to server to protect the webhook URL secret
    try {
      await fetch('/api/telemetry/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, data })
      });
    } catch (e) {
      console.warn('[Telemetry] Client alert forwarding failed:', e);
    }
  }
}

/**
 * Generic event logger
 */
function logEvent(type: string, message: string, data?: Record<string, any>) {
  const event: TelemetryEvent = {
    type,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  
  events.push(event);
  
  // Keep only last 100 events in memory
  if (events.length > 100) {
    events.shift();
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Telemetry] ${type}: ${message}`, data || '');
  }

  // Push warning or info level breadcrumbs to Sentry
  Sentry.addBreadcrumb({
    category: type,
    message: message,
    data: data,
    level: type === 'error' || type.includes('failed') ? 'error' : 'info',
  });
}

export const telemetry = {
  // Track API requests (Generic)
  trackApiRequest: (endpoint: string, method: string, status: number, durationMs: number) => {
    logEvent('api.request', `${method} ${endpoint}`, {
      endpoint,
      method,
      status_code: status,
      duration_ms: durationMs,
    });
  },

  // Track Bags API requests (Specialized)
  trackBagsRequest: (params: {
    endpoint: string;
    method: string;
    status: number;
    durationMs: number;
    requestId?: string;
    rateLimitRemaining?: number;
    rateLimitReset?: number;
    error?: string;
  }) => {
    const isError = params.status >= 400;
    logEvent('bags.api', `${params.method} ${params.endpoint} (${params.status})`, {
      ...params,
      is_error: isError,
    });

    // Check sliding window alerting for 429 and 5xx spikes
    if (params.status === 429 || params.status >= 500) {
      recentBagsRequests.push({
        status: params.status,
        timestamp: Date.now()
      });

      // Keep only last 10 tracked bags requests in window
      if (recentBagsRequests.length > 10) {
        recentBagsRequests.shift();
      }

      // Count failures in the sliding window (pruning events older than 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const recentFailures = recentBagsRequests.filter(
        req => req.timestamp > fiveMinutesAgo && (req.status === 429 || req.status >= 500)
      );

      if (recentFailures.length >= 3) {
        if (!bagsSpikeAlertActive) {
          bagsSpikeAlertActive = true;
          sendAlert(
            'Bags API Spike Error',
            `Multiple failures (${recentFailures.length}) detected on Bags.fm API in a short window. Last status: ${params.status}`,
            {
              last_endpoint: `${params.method} ${params.endpoint}`,
              total_failures_in_window: recentFailures.length,
              last_error: params.error || 'N/A'
            }
          );
        }
      }

      // Report Bags API Errors to Sentry
      Sentry.captureMessage(`Bags API Error: ${params.status} on ${params.endpoint}`, {
        level: params.status === 429 ? 'warning' : 'error',
        extra: params
      });
    } else {
      // Cooldown spike alerts if a successful request goes through and window clears
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      const activeErrors = recentBagsRequests.filter(
        req => req.timestamp > tenMinutesAgo && (req.status === 429 || req.status >= 500)
      );
      if (activeErrors.length === 0) {
        bagsSpikeAlertActive = false;
      }
    }
  },
  
  // Track Solana Transaction Simulations
  trackSolanaSimulation: (params: {
    success: boolean;
    durationMs: number;
    computeUnits?: number;
    logs?: string[];
    error?: string;
    action?: string; // e.g., 'swap', 'deposit', 'claim'
  }) => {
    logEvent('solana.simulation', `Simulation ${params.success ? 'Success' : 'Failed'} (${params.action})`, {
      ...params,
      logs: params.success ? undefined : params.logs?.slice(-10), // Only keep last 10 logs on failure
    });

    if (!params.success) {
      // Immediate Alert for Simulation Pre-flight Failures
      sendAlert(
        'Transaction Simulation Failure',
        `Solana transaction pre-flight simulation failed for action: ${params.action || 'unknown'}.`,
        {
          action: params.action || 'unknown',
          error: params.error || 'Unknown simulation error',
          duration_ms: params.durationMs,
          logs: params.logs?.slice(-5)
        }
      );

      Sentry.captureException(new Error(`Solana simulation failed: ${params.error || 'unknown'}`), {
        extra: params
      });
    }
  },

  // Track Solana Transaction Confirmation
  trackSolanaConfirmation: (params: {
    signature: string;
    durationMs: number;
    status: 'confirmed' | 'finalized' | 'failed' | 'timeout';
    error?: string;
    action?: string;
  }) => {
    logEvent('solana.confirmation', `Tx ${params.status}: ${params.action}`, {
      ...params,
      explorer_url: `https://solscan.io/tx/${params.signature}`
    });

    // Alert on failed transactions
    if (params.status === 'failed' || params.status === 'timeout') {
      sendAlert(
        'Solana Transaction Failed',
        `Transaction execution status returned "${params.status}" during action: ${params.action || 'unknown'}.`,
        {
          signature: params.signature,
          status: params.status,
          action: params.action || 'unknown',
          error: params.error || 'N/A',
          duration_ms: params.durationMs
        }
      );

      Sentry.captureMessage(`Solana Tx Failed (${params.status}): ${params.signature}`, {
        level: 'error',
        extra: params
      });
    }

    // Check RPC Latency thresholds
    const latencyThreshold = process.env.NEXT_PUBLIC_RPC_LATENCY_ALERT_THRESHOLD_MS
      ? parseInt(process.env.NEXT_PUBLIC_RPC_LATENCY_ALERT_THRESHOLD_MS, 10)
      : DEFAULT_LATENCY_THRESHOLD_MS;

    if (params.durationMs > latencyThreshold) {
      sendAlert(
        'RPC Latency Breach',
        `Solana RPC confirmation latency of ${params.durationMs}ms exceeded threshold limit of ${latencyThreshold}ms.`,
        {
          signature: params.signature,
          duration_ms: params.durationMs,
          threshold_ms: latencyThreshold,
          action: params.action || 'unknown'
        }
      );

      Sentry.captureMessage(`Solana RPC Latency Breach: ${params.durationMs}ms`, {
        level: 'warning',
        extra: params
      });
    }
  },
  
  // Track transaction simulations (Deprecated: use trackSolanaSimulation)
  trackTransactionSimulation: (simulationSuccess: boolean, error?: Error) => {
    if (simulationSuccess) {
      logEvent('simulation', 'Transaction simulation successful');
    } else {
      logEvent('simulation', 'Transaction simulation failed', {
        error: error?.message
      });
      Sentry.captureException(error || new Error('Transaction simulation failed'));
    }
  },
  
  // Track swap transactions
  trackSwapTransaction: (fromToken: string, toToken: string, amount: string, success: boolean, txHash?: string, error?: Error) => {
    if (success && txHash) {
      logEvent('swap.success', `Swap successful: ${amount} ${fromToken} → ${toToken}`, {
        fromToken,
        toToken,
        amount,
        transactionHash: txHash,
      });
    } else {
      logEvent('swap.failed', 'Swap transaction failed', {
        fromToken,
        toToken,
        amount,
        error: error?.message
      });
      Sentry.captureException(error || new Error(`Swap transaction failed: ${amount} ${fromToken} → ${toToken}`));
    }
  },
  
  // Track quote requests
  trackQuoteRequest: (fromChain: string, toChain: string, fromToken: string, toToken: string, amount: string, success: boolean, error?: Error) => {
    if (success) {
      logEvent('quote.success', `Quote fetched: ${amount} ${fromToken} (${fromChain}) → ${toToken} (${toChain})`, {
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
      });
    } else {
      logEvent('quote.failed', 'Quote request failed', {
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        error: error?.message
      });
      Sentry.captureException(error || new Error('Quote request failed'));
    }
  },
  
  // Track errors with context
  trackError: (error: Error, context?: Record<string, any>) => {
    logEvent('error', error.message, {
      ...context,
      stack: error.stack
    });

    // Send exception to Sentry
    Sentry.captureException(error, {
      extra: context
    });

    // Alert on critical errors
    sendAlert('Application Exception', error.message, {
      ...context,
      error_name: error.name,
      stack_trace: error.stack?.substring(0, 300)
    });
  },
  
  // Track user interactions
  trackUserAction: (action: string, properties?: Record<string, any>) => {
    logEvent('user.action', action, properties);
  },
  
  // Get all events (for debugging)
  getEvents: () => [...events],
  
  // Clear events
  clearEvents: () => {
    events.length = 0;
  }
};

export default telemetry;
