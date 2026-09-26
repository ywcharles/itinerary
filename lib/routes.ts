import { LANGUAGE, loadGoogleLibrary } from "./googleMaps";

type LatLng = { lat: number; lng: number };

export type Leg = {
  mode: "WALKING" | "DRIVING";
  durationMinutes: number;
  distanceMeters: number;
  path: LatLng[];
};

// Walk if it's reasonably short, otherwise drive.
const MAX_WALK_MINUTES = 25;
// Stops closer than this are treated as the same place (no route needed).
const SAME_PLACE_METERS = 30;

// Routes API calls cost money, so each origin/destination pair is computed once per session.
const legCache = new Map<string, Promise<Leg | null>>();

async function computeLeg(from: LatLng, to: LatLng, mode: Leg["mode"]): Promise<Leg | null> {
  const { Route } = await loadGoogleLibrary("routes");
  const { routes } = await Route.computeRoutes({
    origin: from,
    destination: to,
    travelMode: mode,
    language: LANGUAGE,
    fields: ["path", "durationMillis", "distanceMeters"],
  });
  const route = routes?.[0];
  if (!route?.path || route.durationMillis == null) return null;
  return {
    mode,
    durationMinutes: Math.max(1, Math.round(route.durationMillis / 60000)),
    distanceMeters: route.distanceMeters ?? 0,
    path: route.path.map((point) => ({ lat: point.lat, lng: point.lng })),
  };
}

export function metersBetween(a: LatLng, b: LatLng) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Route between two stops, or null when they're at the same place or no route exists. */
export function fetchLeg(from: LatLng, to: LatLng): Promise<Leg | null> {
  if (metersBetween(from, to) < SAME_PLACE_METERS) return Promise.resolve(null);

  const key = `${from.lat},${from.lng}->${to.lat},${to.lng}`;
  const cached = legCache.get(key);
  if (cached) return cached;

  const request = (async () => {
    const walk = await computeLeg(from, to, "WALKING");
    if (walk && walk.durationMinutes <= MAX_WALK_MINUTES) return walk;
    return (await computeLeg(from, to, "DRIVING")) ?? walk;
  })();

  // Drop failed lookups from the cache so they are retried next time.
  request.catch(() => legCache.delete(key));
  legCache.set(key, request);
  return request;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
