import { apiGet } from "./client";

export interface SearchResultItem {
  result_type: "gig" | "event";
  id: string;
  title: string;
  category: string | null;
  event_date: string | null;   // "YYYY-MM-DD"
  city: string | null;
  pay_rate: number | null;
  pay_type: "hourly" | "flat" | "daily" | null;
  slots_total: number | null;
  slots_filled: number | null;
  open_job_count: number | null; // events only
}

export interface SearchResponse {
  results: SearchResultItem[];
  has_more: boolean;
  page: number;
}

export type SearchType = "all" | "gigs" | "events";
export type WhenFilter = "today" | "this_week" | "this_month" | "next_month";

export interface SearchParams {
  q?: string;
  type?: SearchType;
  category?: string;
  when?: WhenFilter;
  page?: number;
  limit?: number;
}

export function searchJobs(params: SearchParams) {
  const qs = new URLSearchParams();
  if (params.q)        qs.set("q", params.q);
  if (params.type)     qs.set("type", params.type);
  if (params.category) qs.set("category", params.category);
  if (params.when)     qs.set("when", params.when);
  if (params.page)     qs.set("page", String(params.page));
  if (params.limit)    qs.set("limit", String(params.limit));
  return apiGet<SearchResponse>(`/api/v1/search?${qs.toString()}`);
}
