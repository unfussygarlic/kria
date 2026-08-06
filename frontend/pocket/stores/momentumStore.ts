import { create } from "zustand";
import {
  getMyMomentum,
  getMyBreakdown,
  getUserMomentum,
  getSignalMeta,
  getMyPercentile,
  type MyMomentumData,
  type WorkerBreakdownData,
  type PublicMomentumData,
  type SignalMeta,
  type PercentileData,
} from "@/lib/api/momentum";

const MOMENTUM_TTL = 10 * 60 * 1000; // 10 min — score changes rarely mid-session
const BREAKDOWN_TTL = 10 * 60 * 1000;
const PERCENTILE_TTL = 30 * 60 * 1000; // 30 min — ranking shifts slowly

interface MomentumState {
  myMomentum: MyMomentumData | null;
  myBreakdown: WorkerBreakdownData | null;
  myPercentile: PercentileData | null;
  publicCache: Record<string, PublicMomentumData>;
  signalMeta: SignalMeta[];

  isLoadingMy: boolean;
  isLoadingBreakdown: boolean;

  // Internal timestamps for TTL
  _momentumFetchedAt: number;
  _breakdownFetchedAt: number;
  _percentileFetchedAt: number;

  fetchMyMomentum: () => Promise<void>;
  fetchMyBreakdown: () => Promise<void>;
  fetchMyPercentile: () => Promise<void>;
  fetchUserMomentum: (userId: string) => Promise<PublicMomentumData | null>;
  fetchSignalMeta: () => Promise<void>;
  clearMyMomentum: () => void;
}

export const useMomentumStore = create<MomentumState>((set, get) => ({
  myMomentum: null,
  myBreakdown: null,
  myPercentile: null,
  publicCache: {},
  signalMeta: [],
  isLoadingMy: false,
  isLoadingBreakdown: false,
  _momentumFetchedAt: 0,
  _breakdownFetchedAt: 0,
  _percentileFetchedAt: 0,

  fetchMyMomentum: async () => {
    const { isLoadingMy, myMomentum, _momentumFetchedAt } = get();
    if (isLoadingMy) return;

    const now = Date.now();
    const fresh = myMomentum && (now - _momentumFetchedAt) < MOMENTUM_TTL;
    if (fresh) return;

    // Only show the loading spinner on first load; subsequent refreshes are silent
    if (!myMomentum) set({ isLoadingMy: true });

    const result = await getMyMomentum();
    set({ isLoadingMy: false, _momentumFetchedAt: Date.now() });
    if (!result.error && result.data) {
      set({ myMomentum: result.data });
    }
  },

  fetchMyBreakdown: async () => {
    const { isLoadingBreakdown, myBreakdown, _breakdownFetchedAt } = get();
    if (isLoadingBreakdown) return;

    const now = Date.now();
    const fresh = myBreakdown && (now - _breakdownFetchedAt) < BREAKDOWN_TTL;
    if (fresh) return;

    if (!myBreakdown) set({ isLoadingBreakdown: true });

    const result = await getMyBreakdown();
    set({ isLoadingBreakdown: false, _breakdownFetchedAt: Date.now() });
    if (!result.error && result.data) {
      set({ myBreakdown: result.data });
    }
  },

  fetchMyPercentile: async () => {
    const { myPercentile, _percentileFetchedAt } = get();
    const now = Date.now();
    if (myPercentile && now - _percentileFetchedAt < PERCENTILE_TTL) return;
    const result = await getMyPercentile();
    if (!result.error && result.data) {
      set({ myPercentile: result.data, _percentileFetchedAt: Date.now() });
    }
  },

  fetchUserMomentum: async (userId: string) => {
    const cached = get().publicCache[userId];
    if (cached) return cached;
    const result = await getUserMomentum(userId);
    if (!result.error && result.data) {
      set((s) => ({
        publicCache: { ...s.publicCache, [userId]: result.data! },
      }));
      return result.data;
    }
    return null;
  },

  fetchSignalMeta: async () => {
    if (get().signalMeta.length > 0) return;
    const result = await getSignalMeta();
    if (!result.error && result.data) {
      set({ signalMeta: result.data });
    }
  },

  clearMyMomentum: () => set({
    myMomentum: null,
    myBreakdown: null,
    myPercentile: null,
    _momentumFetchedAt: 0,
    _breakdownFetchedAt: 0,
    _percentileFetchedAt: 0,
  }),
}));
