import { create } from "zustand";
import { getMyBadges, type Badge } from "@/lib/api/badges";

export type { Badge };

const BADGES_TTL = 5 * 60 * 1000; // 5 min — badges change only after gig events

interface BadgeState {
  badges: Badge[];
  earnedCount: number;
  totalCount: number;
  isLoading: boolean;
  _fetchedAt: number;
  fetchBadges: () => Promise<void>;
}

export const useBadgeStore = create<BadgeState>((set, get) => ({
  badges: [],
  earnedCount: 0,
  totalCount: 0,
  isLoading: false,
  _fetchedAt: 0,

  fetchBadges: async () => {
    const { isLoading, badges, _fetchedAt } = get();
    if (isLoading) return;

    const now = Date.now();
    const fresh = badges.length > 0 && (now - _fetchedAt) < BADGES_TTL;
    if (fresh) return;

    if (badges.length === 0) set({ isLoading: true });

    try {
      const result = await getMyBadges();
      if (!result.error && result.data) {
        set({
          badges: result.data.badges,
          earnedCount: result.data.earned_count,
          totalCount: result.data.total_count,
          _fetchedAt: Date.now(),
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
