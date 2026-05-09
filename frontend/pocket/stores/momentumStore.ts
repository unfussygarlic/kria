import { create } from "zustand";
import {
  getMyMomentum,
  getMyBreakdown,
  getUserMomentum,
  getSignalMeta,
  type MyMomentumData,
  type WorkerBreakdownData,
  type PublicMomentumData,
  type SignalMeta,
} from "@/lib/api/momentum";

interface MomentumState {
  myMomentum: MyMomentumData | null;
  myBreakdown: WorkerBreakdownData | null;
  publicCache: Record<string, PublicMomentumData>;
  signalMeta: SignalMeta[];

  isLoadingMy: boolean;
  isLoadingBreakdown: boolean;

  fetchMyMomentum: () => Promise<void>;
  fetchMyBreakdown: () => Promise<void>;
  fetchUserMomentum: (userId: string) => Promise<PublicMomentumData | null>;
  fetchSignalMeta: () => Promise<void>;
  clearMyMomentum: () => void;
}

export const useMomentumStore = create<MomentumState>((set, get) => ({
  myMomentum: null,
  myBreakdown: null,
  publicCache: {},
  signalMeta: [],
  isLoadingMy: false,
  isLoadingBreakdown: false,

  fetchMyMomentum: async () => {
    if (get().isLoadingMy) return;
    set({ isLoadingMy: true });
    const result = await getMyMomentum();
    set({ isLoadingMy: false });
    if (!result.error && result.data) {
      set({ myMomentum: result.data });
    }
  },

  fetchMyBreakdown: async () => {
    if (get().isLoadingBreakdown) return;
    set({ isLoadingBreakdown: true });
    const result = await getMyBreakdown();
    set({ isLoadingBreakdown: false });
    if (!result.error && result.data) {
      set({ myBreakdown: result.data });
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
    if (get().signalMeta.length > 0) return; // already loaded
    const result = await getSignalMeta();
    if (!result.error && result.data) {
      set({ signalMeta: result.data });
    }
  },

  clearMyMomentum: () => set({ myMomentum: null, myBreakdown: null }),
}));
