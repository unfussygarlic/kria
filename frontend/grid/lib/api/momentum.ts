import { apiGet } from "./client";
import type { MomentumBreakdownResponse } from "@/types";

export async function fetchUserBreakdown(userId: string) {
  return apiGet<MomentumBreakdownResponse>(`/momentum/user/${userId}/breakdown`);
}
