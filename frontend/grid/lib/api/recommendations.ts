import { apiPatch, apiPost } from "./client";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
  confidence: string;
}

export function geocodeVenue(venue_name: string, city: string) {
  return apiPost<GeocodeResult>("/recommendations/geocode", { venue_name, city });
}

export function updateGigLocation(gig_id: string, latitude: number, longitude: number, formatted_address: string) {
  return apiPatch<void>(`/gigs/${gig_id}/location`, { latitude, longitude, formatted_address });
}
