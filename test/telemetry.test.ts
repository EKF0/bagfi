import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Sentry NextJS SDK
const mockCaptureMessage = vi.fn();
const mockCaptureException = vi.fn();
const mockAddBreadcrumb = vi.fn();

vi.mock('@sentry/nextjs', () => {
  return {
    init: vi.fn(),
    captureMessage: (...args: any[]) => mockCaptureMessage(...args),
    captureException: (...args: any[]) => mockCaptureException(...args),
    addBreadcrumb: (...args: any[]) => mockAddBreadcrumb(...args),
  };
});

// Import telemetry and the sendAlert function
import { telemetry, sendAlert } from '@/lib/telemetry';

describe('Telemetry Service', () => {
  let originalFetch: typeof global.fetch;
  const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    global.fetch = mockFetch;
    
    // Configure environment variables for testing
    process.env.TELEMETRY_ALERT_WEBHOOK_URL = 'https://discord.com/api/webhooks/mock-test-id';
    process.env.NEXT_PUBLIC_RPC_LATENCY_ALERT_THRESHOLD_MS = '2000'; // 2 seconds

    telemetry.clearEvents();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Webhook Alerts & Sentry Capturing', () => {
    it('should dispatch alert webhook and capture exception on trackError', async () => {
      const error = new Error('Database connection timeout');
      telemetry.trackError(error, { db_id: 'supabase_01' });

      // Sentry check
      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        extra: { db_id: 'supabase_01' }
      });

      // Webhook call check (fetch was triggered in sendAlert)
      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe('https://discord.com/api/webhooks/mock-test-id');
      
      const requestOptions = fetchCall[1] as RequestInit;
      expect(requestOptions.method).toBe('POST');
      
      const payload = JSON.parse(requestOptions.body as string);
      expect(payload.embeds[0].title).toContain('Application Exception');
      expect(payload.embeds[0].description).toBe('Database connection timeout');
    });

    it('should immediately alert and report to Sentry on Solana Simulation Failure', async () => {
      telemetry.trackSolanaSimulation({
        success: false,
        durationMs: 450,
        action: 'swap',
        error: 'InstructionError(0, Custom(6001))',
        logs: ['Log 1', 'Log 2', 'Instruction failed: Slippage Exceeded']
      });

      expect(mockCaptureException).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(payload.embeds[0].title).toContain('Transaction Simulation Failure');
      expect(payload.embeds[0].description).toContain('Solana transaction pre-flight simulation failed');
    });

    it('should log normally on successful Solana simulation without alerting', async () => {
      telemetry.trackSolanaSimulation({
        success: true,
        durationMs: 120,
        action: 'claim'
      });

      expect(mockCaptureException).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      
      const events = telemetry.getEvents();
      expect(events[0].type).toBe('solana.simulation');
      expect(events[0].message).toContain('Simulation Success');
    });
  });

  describe('RPC Latency & Transaction Failures', () => {
    it('should trigger alert and Sentry on Solana transaction confirmation failure', async () => {
      telemetry.trackSolanaConfirmation({
        signature: '5K3x...',
        durationMs: 1500,
        status: 'failed',
        error: 'Node timeout',
        action: 'deposit'
      });

      expect(mockCaptureMessage).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(payload.embeds[0].title).toContain('Solana Transaction Failed');
      expect(payload.embeds[0].description).toContain('Transaction execution status returned "failed"');
    });

    it('should trigger RPC Latency Breach alert if confirmation exceeds threshold limit', async () => {
      // Threshold set to 2000ms in beforeEach
      telemetry.trackSolanaConfirmation({
        signature: 'TxLat123',
        durationMs: 3500, // Exceeds 2000ms
        status: 'confirmed',
        action: 'rebalance'
      });

      expect(mockCaptureMessage).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(payload.embeds[0].title).toContain('RPC Latency Breach');
      expect(payload.embeds[0].description).toContain('Solana RPC confirmation latency of 3500ms exceeded');
    });

    it('should not trigger latency alert if confirmation is within threshold limits', async () => {
      telemetry.trackSolanaConfirmation({
        signature: 'TxLatFast',
        durationMs: 800, // Below 2000ms
        status: 'confirmed',
        action: 'rebalance'
      });

      expect(mockCaptureMessage).not.toHaveBeenCalled();
      expect(mockFetch).not.not.toHaveBeenCalled(); // fetch was not triggered
    });
  });

  describe('Bags API Rate Limit & Server Error Sliding Window Spikes', () => {
    it('should trigger Bags API Spike alert only when error count reaches 3 in sliding window', async () => {
      // 1st rate limit error
      telemetry.trackBagsRequest({
        endpoint: '/solana/bags/pools',
        method: 'GET',
        status: 429,
        durationMs: 40,
        error: 'Too Many Requests'
      });
      expect(mockFetch).not.toHaveBeenCalled(); // Only 1 error, no spike alert yet

      // 2nd rate limit error
      telemetry.trackBagsRequest({
        endpoint: '/solana/bags/pools',
        method: 'GET',
        status: 502,
        durationMs: 25,
        error: 'Bad Gateway'
      });
      expect(mockFetch).not.toHaveBeenCalled(); // Only 2 errors, still no alert

      // 3rd rate limit error -> Should trigger spike alert!
      telemetry.trackBagsRequest({
        endpoint: '/solana/bags/pools',
        method: 'GET',
        status: 429,
        durationMs: 30,
        error: 'Too Many Requests'
      });
      expect(mockFetch).toHaveBeenCalledTimes(1); // Spike alert dispatched!

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(payload.embeds[0].title).toContain('Bags API Spike Error');
      expect(payload.embeds[0].description).toContain('Multiple failures (3) detected on Bags.fm API');

      // 4th rate limit error -> Spike alert already active, shouldn't trigger another fetch (no spamming)
      telemetry.trackBagsRequest({
        endpoint: '/solana/bags/pools',
        method: 'GET',
        status: 429,
        durationMs: 15,
        error: 'Too Many Requests'
      });
      expect(mockFetch).toHaveBeenCalledTimes(1); // Webhook remains called only once
    });
  });
});
