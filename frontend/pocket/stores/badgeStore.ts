import { create } from "zustand";
import { getMyBadges, type Badge } from "@/lib/api/badges";

interface BadgeState {
  badges: Badge[];
  earnedCount: number;
  totalCount: number;
  isLoading: boolean;
  fetchBadges: () => Promise<void>;
}

export const useBadgeStore = create<BadgeState>((set) => ({
  badges: [],
  earnedCount: 0,
  totalCount: 0,
  isLoading: false,

  fetchBadges: async () => {
    set({ isLoading: true });
    try {
      const result = await getMyBadges();
      if (!result.error && result.data) {
        set({
          badges: result.data.badges,
          earnedCount: result.data.earned_count,
          totalCount: result.data.total_count,
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
