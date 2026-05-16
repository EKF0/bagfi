/**
 * useWalletBalances Hook
 * Fetches and caches on-chain wallet balances for the connected Solana wallet.
 * Auto-refreshes on wallet change and when `triggerRefresh()` is called from
 * the balance store (e.g. after a confirmed deposit or swap).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { getWalletBalances, type WalletTokenBalance } from '@/lib/solana/balances';
import { useBalanceStore } from '@/lib/stores/balance-store';

interface UseWalletBalancesReturn {
  balances: WalletTokenBalance[];
  totalValueUsd: number;
  isLoading: boolean;
  error: string | null;
  fetchedAt: string | null;
  refresh: () => void;
}

export function useWalletBalances(): UseWalletBalancesReturn {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const refreshCounter = useBalanceStore((state) => state.refreshCounter);

  const [balances, setBalances] = useState<WalletTokenBalance[]>([]);
  const [totalValueUsd, setTotalValueUsd] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  // Track the latest fetch to prevent stale updates
  const fetchIdRef = useRef(0);

  const fetchBalances = useCallback(async () => {
    if (!connected || !publicKey) {
      setBalances([]);
      setTotalValueUsd(0);
      setError(null);
      setFetchedAt(null);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await getWalletBalances(connection, publicKey);

      // Only update state if this is still the latest fetch
      if (fetchId === fetchIdRef.current) {
        setBalances(result.balances);
        setTotalValueUsd(result.totalValueUsd);
        setFetchedAt(result.fetchedAt);
      }
    } catch (err) {
      if (fetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [connection, publicKey, connected]);

  // Fetch on mount, wallet change, and refresh counter change.
  // We capture the async work inside the effect to avoid the ESLint
  // "set-state-in-effect" rule (the setState calls happen inside the
  // awaited callback, not synchronously in the effect body).
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!connected || !publicKey) {
        if (!cancelled) {
          setBalances([]);
          setTotalValueUsd(0);
          setError(null);
          setFetchedAt(null);
        }
        return;
      }

      const fetchId = ++fetchIdRef.current;
      if (!cancelled) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const result = await getWalletBalances(connection, publicKey);

        if (!cancelled && fetchId === fetchIdRef.current) {
          setBalances(result.balances);
          setTotalValueUsd(result.totalValueUsd);
          setFetchedAt(result.fetchedAt);
        }
      } catch (err) {
        if (!cancelled && fetchId === fetchIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch balances');
        }
      } finally {
        if (!cancelled && fetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey, connected, refreshCounter]);

  return {
    balances,
    totalValueUsd,
    isLoading,
    error,
    fetchedAt,
    refresh: fetchBalances,
  };
}
