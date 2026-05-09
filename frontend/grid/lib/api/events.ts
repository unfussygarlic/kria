import { apiGet, apiPost } from "./client";
import type { EventCreatePayload, EventResponse, JobInEventCreate, MyEventSummary } from "@/types";

export async function createEvent(payload: EventCreatePayload) {
  return apiPost<EventResponse>("/events", payload);
}

export async function getMyEvents() {
  return apiGet<MyEventSummary[]>("/events/my");
}

export async function getEvent(id: string) {
  return apiGet<EventResponse>(`/events/${id}`);
}

export async function addJobToEvent(eventId: string, job: JobInEventCreate) {
  return apiPost<{ gig_id: string }>(`/events/${eventId}/jobs`, job);
}
