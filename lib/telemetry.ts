import * as Sentry from '@sentry/node';

// Initialize Sentry if DSN is available
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
    environment: process.env.NODE_ENV || 'development',
    // Set sampling rate for error events - 1.0 = 100% of errors
    sampleRate: 1.0,
  });
}

export const telemetry = {
  // Track API requests
  trackApiRequest: (endpoint: string, method: string, status: number, durationMs: number) => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.addBreadcrumb({
        category: 'api.request',
        message: `${method} ${endpoint}`,
        data: {
          endpoint,
          method,
          status_code: status,
          duration_ms: durationMs,
        },
        type: 'http',
      });
      
      // Also capture as a span for performance monitoring
      const transaction = Sentry.startTransaction({
        name: `${method} ${endpoint}`,
        op: 'http.client',
      });
      transaction.setHttpStatus(status);
      transaction.finish();
    }
  },
  
  // Track transaction simulations
  trackTransactionSimulation: (simulationSuccess: boolean, error?: Error) => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      if (simulationSuccess) {
        Sentry.captureMessage('Transaction simulation successful');
      } else {
        Sentry.captureException(error || new Error('Transaction simulation failed'));
      }
    }
  },
  
  // Track swap transactions
  trackSwapTransaction: (fromToken: string, toToken: string, amount: string, success: boolean, txHash?: string, error?: Error) => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      if (success && txHash) {
        Sentry.captureMessage(`Swap successful: ${amount} ${fromToken} → ${toToken}`, {
          extra: {
            fromToken,
            toToken,
            amount,
            transactionHash: txHash,
          }
        });
      } else {
        Sentry.captureException(error || new Error('Swap transaction failed'), {
          extra: {
            fromToken,
            toToken,
            amount,
          }
        });
      }
    }
  },
  
  // Track quote requests
  trackQuoteRequest: (fromChain: string, toChain: string, fromToken: string, toToken: string, amount: string, success: boolean, error?: Error) => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      if (success) {
        Sentry.addBreadcrumb({
          category: 'quote.request',
          message: `Quote fetched: ${amount} ${fromToken} (${fromChain}) → ${toToken} (${toChain})`,
          data: {
            fromChain,
            toChain,
            fromToken,
            toToken,
            amount,
          },
          type: 'info',
        });
      } else {
        Sentry.captureException(error || new Error('Quote request failed'), {
          extra: {
            fromChain,
            toChain,
            fromToken,
            toToken,
            amount,
          }
        });
      }
    }
  },
  
  // Track errors with context
  trackError: (error: Error, context?: Record<string, any>) => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, { extra: context });
    }
  },
  
  // Track user interactions
  trackUserAction: (action: string, properties?: Record<string, any>) => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.addBreadcrumb({
        category: 'user.action',
        message: action,
        data: properties,
        type: 'user',
      });
    }
  }
};

export default telemetry;