// Trips this browser created or opened, so people find their way back without an account.
// Only stored locally: other people's trips are never listed.

export type RecentTrip = { slug: string; name: string; visitedAt: number };

const KEY = "recentTrips";
const MAX = 8;
const EVENT = "recenttripschange";

function read(): RecentTrip[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t?.slug === "string" && typeof t?.name === "string") : [];
  } catch {
    return [];
  }
}

export function rememberTrip(slug: string, name: string) {
  try {
    const trips = [{ slug, name, visitedAt: Date.now() }, ...read().filter((t) => t.slug !== slug)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(trips));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage blocked (private mode): the trip just isn't remembered.
  }
}

export function forgetTrip(slug: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(read().filter((t) => t.slug !== slug)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage blocked: nothing to forget.
  }
}

// For useSyncExternalStore: a stable string snapshot, parsed by the caller.
export function recentTripsSnapshot() {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function subscribeRecentTrips(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function parseRecentTrips(snapshot: string): RecentTrip[] {
  try {
    const parsed = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t?.slug === "string" && typeof t?.name === "string") : [];
  } catch {
    return [];
  }
}
