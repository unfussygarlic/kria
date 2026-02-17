import { apiGet, apiPost } from "@/lib/api/client";
import { EventResponse, MyEventSummary } from "@/types/database";
import { GigCategory, PayType } from "@/types/database";

export interface JobInEventCreate {
  category: GigCategory;
  title: string;
  description?: string | null;
  pay_amount: number;
  pay_type: PayType;
  slots_total: number;
  shift_start_time: string;
  shift_end_time: string;
  report_time?: string | null;
  dress_code?: string | null;
  gender_preference?: string;
  languages_required?: string[];
  requirements_note?: string | null;
}

export interface EventCreatePayload {
  title: string;
  description?: string | null;
  venue_name: string;
  city: string;
  state?: string | null;
  event_date: string;
  event_end_date?: string | null;
  is_multi_day?: boolean;
  jobs: JobInEventCreate[];
}

export const getMyEvents = () =>
  apiGet<MyEventSummary[]>("/api/v1/events/my");

export const getEvent = (id: string) =>
  apiGet<EventResponse>(`/api/v1/events/${id}`);

export const createEvent = (payload: EventCreatePayload) =>
  apiPost<EventResponse>("/api/v1/events", payload);

export const addJobToEvent = (eventId: string, job: JobInEventCreate) =>
  apiPost<EventResponse>(`/api/v1/events/${eventId}/jobs`, job);
