import { apiGet, apiPost } from "./client";

export interface SubscriptionStatus {
  plan: string;
  trial_ends_at: string | null;
  trial_duration_days: number;
  days_remaining: number;
  hours_remaining: number;
  is_expired: boolean;
}

export async function getSubscription() {
  return apiGet<SubscriptionStatus>("/api/v1/subscriptions/me");
}

export async function initializeSubscription() {
  return apiPost<SubscriptionStatus>("/api/v1/subscriptions/initialize", {});
}
