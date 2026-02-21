import { create } from "zustand";
import {
  getMyMomentum,
  getMyBreakdown,
  getUserMomentum,
  type MyMomentumData,
  type MomentumBreakdownData,
  type PublicMomentumData,
} from "@/lib/api/momentum";

interface MomentumState {
  // My own scores (loaded on Arena mount)
  myMomentum: MyMomentumData | null;
  myBreakdown: MomentumBreakdownData | null;

  // Cache of other users' public scores keyed by user_id
  publicCache: Record<string, PublicMomentumData>;

  isLoadingMy: boolean;
  isLoadingBreakdown: boolean;

  fetchMyMomentum: () => Promise<void>;
  fetchMyBreakdown: () => Promise<void>;
  fetchUserMomentum: (userId: string) => Promise<PublicMomentumData | null>;
  clearMyMomentum: () => void;
}

export const useMomentumStore = create<MomentumState>((set, get) => ({
  myMomentum: null,
  myBreakdown: null,
  publicCache: {},
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
    // Serve from cache if available
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

  clearMyMomentum: () => set({ myMomentum: null, myBreakdown: null }),
}));
