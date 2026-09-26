import type { Stop } from "./types";

export type LatLng = { lat: number; lng: number };

export function coordinatesOf(stop: Stop): LatLng | null {
  return stop.latitude != null && stop.longitude != null
    ? { lat: stop.latitude, lng: stop.longitude }
    : null;
}

/**
 * Stops added through the Places search store their place id inside google_maps_url
 * (official Maps URL format: ...&query_place_id=<id>). Manually entered links return null.
 */
export function placeIdOf(stop: Stop): string | null {
  if (!stop.google_maps_url) return null;
  try {
    return new URL(stop.google_maps_url).searchParams.get("query_place_id");
  } catch {
    return null;
  }
}

export function mapsUrlForPlace(name: string, placeId: string) {
  const params = new URLSearchParams({ api: "1", query: name, query_place_id: placeId });
  return `https://www.google.com/maps/search/?${params}`;
}

export function byStartTime(a: Stop, b: Stop) {
  return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
}
