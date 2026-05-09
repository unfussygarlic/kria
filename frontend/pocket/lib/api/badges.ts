import { apiGet } from "./client";

export interface Badge {
  code: string;
  name: string;
  description: string;
  category: string;
  earned: boolean;
  earned_at: string | null;
}

export interface BadgesResponse {
  badges: Badge[];
  earned_count: number;
  total_count: number;
}

export const getMyBadges = () => apiGet<BadgesResponse>("/api/v1/badges/me");
