import { apiGet } from "./client";

export interface Badge {
  code: string;
  name: string;
  description: string;
  category: string;
  earned: boolean;
  earned_at: string | null;
  // Populated for locked milestone/streak badges — server-computed so the
  // UI can show progress bars and "3 more gigs to unlock" hints without
  // duplicating threshold logic on the client. Null for identity/skill
  // badges (they're binary).
  progress_current: number | null;
  progress_target: number | null;
  unlock_hint: string | null;
}

export interface BadgesResponse {
  badges: Badge[];
  earned_count: number;
  total_count: number;
}

export const getMyBadges = () => apiGet<BadgesResponse>("/api/v1/badges/me");
