/**
 * Telemetry utility
 * Simple logging and tracking that works in both client and server environments
 * TODO: Integrate @sentry/nextjs for production error tracking
 */

interface TelemetryEvent {
  type: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

const events: TelemetryEvent[] = [];

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
  
  // TODO: Send to Sentry in production
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN && typeof window !== 'undefined') {
  //   import('@sentry/nextjs').then(Sentry => {
  //     Sentry.captureMessage(message, { extra: data });
  //   });
  // }
}

export const telemetry = {
  // Track API requests
  trackApiRequest: (endpoint: string, method: string, status: number, durationMs: number) => {
    logEvent('api.request', `${method} ${endpoint}`, {
      endpoint,
      method,
      status_code: status,
      duration_ms: durationMs,
    });
  },
  
  // Track transaction simulations
  trackTransactionSimulation: (simulationSuccess: boolean, error?: Error) => {
    if (simulationSuccess) {
      logEvent('simulation', 'Transaction simulation successful');
    } else {
      logEvent('simulation', 'Transaction simulation failed', {
        error: error?.message
      });
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
    }
  },
  
  // Track errors with context
  trackError: (error: Error, context?: Record<string, any>) => {
    logEvent('error', error.message, {
      ...context,
      stack: error.stack
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
