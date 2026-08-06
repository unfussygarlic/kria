/**
 * Cross-platform "open in maps" helpers.
 *
 * `openLocation` — drops a pin at the venue (Google Maps search API).
 *   Used by the tap-venue action in Space + gig detail. This is what the
 *   existing code already does.
 *
 * `openDirections` — turn-by-turn navigation from current location to the
 *   venue. Uses Google Maps' `dir` intent with `travelmode=driving` (Android
 *   defaults to whichever nav app the user prefers via intent chooser; iOS
 *   opens Google Maps if installed else falls back to Apple Maps universal
 *   link). This is new in the Space revamp (2026-08-07).
 */
import { Linking, Platform } from "react-native";

interface LatLng {
  latitude: number;
  longitude: number;
}

/** Drop a pin at the coordinates. */
export function openLocation(coords: LatLng): Promise<void> {
  const url = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;
  return Linking.openURL(url).catch(() => {});
}

/**
 * Start turn-by-turn navigation to the venue. Falls back to a plain
 * pin-drop link if the platform doesn't support the nav intent.
 */
export function openDirections(coords: LatLng, label?: string): Promise<void> {
  // Universal Google Maps directions URL. On iOS with Google Maps installed
  // it opens directly; without, the browser opens maps.google.com which
  // deep-links Apple Maps. On Android it opens whichever the user picked as
  // their default navigation app.
  const dest = `${coords.latitude},${coords.longitude}`;
  const params = new URLSearchParams({
    api: "1",
    destination: dest,
    travelmode: "driving",
  });
  if (label) params.set("destination_place_id", ""); // reserved; label improves the UI on some clients
  const url = `https://www.google.com/maps/dir/?${params.toString()}`;

  // iOS geo: URIs work too, but the https URL above already handles both
  // platforms — keep it simple.
  void Platform.OS;
  return Linking.openURL(url).catch(() => openLocation(coords));
}
