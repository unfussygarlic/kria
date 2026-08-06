/**
 * Earnings store — this-week / last-week / lifetime totals for the runner.
 *
 * Powers Home's hero earnings card. 5-min TTL because completed-gig counts
 * only change when a runner finishes a shift and gets rated, which happens
 * infrequently within a single session.
 */
import { create } from "zustand";
import { getEarningsSummary, type EarningsSummary } from "@/lib/api/earnings";

const TTL_MS = 5 * 60 * 1000;

interface EarningsState {
  summary: EarningsSummary | null;
  isLoading: boolean;
  _fetchedAt: number;
  fetchSummary: (force?: boolean) => Promise<void>;
}

export const useEarningsStore = create<EarningsState>((set, get) => ({
  summary: null,
  isLoading: false,
  _fetchedAt: 0,

  fetchSummary: async (force = false) => {
    const now = Date.now();
    const { summary, _fetchedAt } = get();
    if (!force && summary && now - _fetchedAt < TTL_MS) return;

    set({ isLoading: true });
    const result = await getEarningsSummary();
    if (result.data) {
      set({ summary: result.data, isLoading: false, _fetchedAt: Date.now() });
    } else {
      // Keep whatever was there; just clear loading. Home renders a subtle
      // fallback if summary stays null.
      set({ isLoading: false });
    }
  },
}));
