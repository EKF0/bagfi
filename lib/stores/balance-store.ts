/**
 * Balance Refresh Store
 * Zustand store that provides a cross-component refresh trigger.
 * Any transaction flow (deposit modal, swap terminal) can call
 * `triggerRefresh()` after a confirmed signature, and every
 * `useWalletBalances()` hook will automatically refetch.
 */

import { create } from 'zustand';

interface BalanceStoreState {
  /** Monotonically increasing counter — when it changes, hooks refetch. */
  refreshCounter: number;
  /** Call after any confirmed on-chain transaction. */
  triggerRefresh: () => void;
}

export const useBalanceStore = create<BalanceStoreState>((set) => ({
  refreshCounter: 0,
  triggerRefresh: () => set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
}));
