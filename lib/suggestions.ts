// Rule-based ideas for a free gap between two activities: nearby places from Google Places,
// filtered to ones that fit the gap (open, reachable, not planned yet) and ranked by rating and distance.

import { loadGoogleLibrary } from "./googleMaps";
import { metersBetween } from "./routes";
import { hoursForWeekday, placeLocal, visitStatus, type Period } from "./openingHours";

type LatLng = { lat: number; lng: number };

export type Category = "food" | "coffee" | "sights" | "outdoors" | "shopping" | "history";

export const CATEGORIES: Record<Category, { label: string; types: string[]; minutes: number }> = {
  shopping: { label: "Shopping", types: ["shopping_mall"], minutes: 90 },
  history: { label: "History", types: ["historical_landmark", "historical_place", "monument"], minutes: 60 },
  food: { label: "Food", types: ["restaurant"], minutes: 75 },
  coffee: { label: "Coffee", types: ["cafe", "coffee_shop", "bakery"], minutes: 45 },
  sights: { label: "Sights", types: ["museum", "art_gallery", "tourist_attraction", "historical_landmark"], minutes: 90 },
  outdoors: { label: "Outdoors", types: ["park", "botanical_garden"], minutes: 60 },
};

export const PRICE_LEVELS: Record<string, string> = {
  FREE: "Free",
  INEXPENSIVE: "$",
  MODERATE: "$$",
  EXPENSIVE: "$$$",
  VERY_EXPENSIVE: "$$$$",
};

/** A free stretch between two located activities. Times are UTC ISO strings. */
export type Gap = {
  openStart?: boolean; // No previous activity to travel from.
  openEnd?: boolean; // No next activity to return to.
  start: string; // when the previous activity ends
  end: string; // when the next activity starts
  from: { name: string; position: LatLng };
  to: { name: string; position: LatLng };
};

export type Suggestion = {
  placeId: string;
  name: string;
  position: LatLng;
  category: string | null;
  price: string | null;
  rating: number | null;
  ratingCount: number | null;
  photoUrl: string | null;
  hours: string | null;
  // Walking time to whichever neighbouring activity is closer.
  walk: { minutes: number; near: string };
  start: string; // suggested slot (UTC ISO)
  end: string;
};

const MINUTE = 60_000;
const SLOT = 15 * MINUTE;
const MIN_VISIT_MINUTES = 30;
// Gaps shorter than this (after travel) don't get ideas.
export const MIN_FREE_MINUTES = 45;
// Ideas must be a short walk from the previous or the next activity.
const MAX_WALK_MINUTES = 20;

// Meal windows in local time, as minutes since midnight.
const MEALS = [
  { from: 11 * 60 + 30, to: 14 * 60 + 30 },
  { from: 17 * 60 + 30, to: 21 * 60 + 30 },
];

/** The meal window (as timestamps) the gap overlaps by at least 45 minutes, if any. */
function mealIn(gap: Gap) {
  const start = new Date(gap.start);
  const end = new Date(gap.end);
  const midnight = new Date(start);
  midnight.setHours(0, 0, 0, 0);
  return MEALS.map(({ from, to }) => ({
    from: midnight.getTime() + from * MINUTE,
    to: midnight.getTime() + to * MINUTE,
  })).find(({ from, to }) => Math.min(end.getTime(), to) - Math.max(start.getTime(), from) >= 45 * MINUTE);
}

/** A sensible first category: food around meal times, otherwise coffee for short gaps and sights for long ones. */
export function defaultCategory(gap: Gap, freeMinutes: number): Category {
  if (mealIn(gap)) return "food";
  return freeMinutes < 90 ? "coffee" : "sights";
}

/** Rough walking estimate; actual routes must be checked before accepting AI additions. */
export function walkMinutes(a: LatLng, b: LatLng) {
  return Math.ceil((metersBetween(a, b) * 1.3) / 75);
}

const roundUp = (ms: number) => Math.ceil(ms / SLOT) * SLOT;
const roundDown = (ms: number) => Math.floor(ms / SLOT) * SLOT;

const FIELDS = [
  "id",
  "displayName",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "primaryTypeDisplayName",
  "photos",
  "regularOpeningHours",
  "utcOffsetMinutes",
  "businessStatus",
];

// One Places request per gap and category per session.
const cache = new Map<string, Promise<Suggestion[]>>();

/**
 * Up to `limit` ideas for the gap. `exclude` holds place ids and lowercase names already in the trip.
 * The cache key includes the gap's times and positions, so moving an activity gives fresh ideas.
 */
export function fetchSuggestions(gap: Gap, category: Category, exclude: Set<string>, limit = 4): Promise<Suggestion[]> {
  const key = JSON.stringify([gap, category, [...exclude].sort(), limit]);
  const cached = cache.get(key);
  if (cached) return cached;

  const request = (async () => {
    const { Place } = await loadGoogleLibrary("places");
    const { from, to } = gap;
    const center = {
      lat: (from.position.lat + to.position.lat) / 2,
      lng: (from.position.lng + to.position.lng) / 2,
    };
    // Search around the midpoint, wide enough to cover both ends.
    const radius = Math.min(3000, Math.max(1000, metersBetween(from.position, to.position) / 2 + 800));
    const { places } = await Place.searchNearby({
      locationRestriction: { center, radius },
      includedPrimaryTypes: CATEGORIES[category].types,
      rankPreference: "POPULARITY",
      maxResultCount: 20,
      fields: FIELDS,
    });

    const gapStart = new Date(gap.start).getTime();
    const gapEnd = new Date(gap.end).getTime();
    // Meals start at meal time (e.g. lunch not before 11:30), not as soon as you could get there.
    const meal = category === "food" ? mealIn(gap) : undefined;

    const ranked = places.flatMap((place) => {
      if (!place.location || !place.displayName) return [];
      if (place.businessStatus && place.businessStatus !== "OPERATIONAL") return [];
      if (exclude.has(place.id) || exclude.has(place.displayName.toLowerCase())) return [];

      const position = place.location.toJSON();
      const walkIn = walkMinutes(from.position, position);
      const walkOut = walkMinutes(position, to.position);
      if (Math.min(walkIn, walkOut) > MAX_WALK_MINUTES) return [];
      const latestEnd = roundDown(gapEnd - (gap.openEnd ? 0 : walkOut) * MINUTE);
      const arrival = roundUp(gapStart + (gap.openStart ? 0 : walkIn) * MINUTE);
      const atMealTime = meal ? roundUp(Math.max(arrival, meal.from)) : arrival;
      // Fall back to arriving right away if waiting for meal time leaves too little room.
      let start = latestEnd - atMealTime >= MIN_VISIT_MINUTES * MINUTE ? atMealTime : arrival;
      let end = Math.min(start + CATEGORIES[category].minutes * MINUTE, latestEnd);
      if (end - start < MIN_VISIT_MINUTES * MINUTE) return [];

      const periods: Period[] = (place.regularOpeningHours?.periods ?? []).map((p) => ({
        open: { day: p.open.day, hour: p.open.hour, minute: p.open.minute },
        close: p.close ? { day: p.close.day, hour: p.close.hour, minute: p.close.minute } : null,
      }));
      const offset = place.utcOffsetMinutes ?? null;
      let status = visitStatus(periods, new Date(start).toISOString(), new Date(end).toISOString(), offset);
      while (status.kind === "closed" || status.kind === "closes-early") {
        start += SLOT;
        end = Math.min(start + CATEGORIES[category].minutes * MINUTE, latestEnd);
        if (end - start < MIN_VISIT_MINUTES * MINUTE) return [];
        status = visitStatus(periods, new Date(start).toISOString(), new Date(end).toISOString(), offset);
      }
      const startIso = new Date(start).toISOString();
      const endIso = new Date(end).toISOString();

      // Rating pulled toward 4.0 for places with few reviews; walking and unknown hours cost points.
      const rating = place.rating ?? null;
      const count = place.userRatingCount ?? 0;
      const trusted = ((rating ?? 4) * count + 4 * 100) / (count + 100);
      const score = trusted - 0.03 * (walkIn + walkOut) - (status.kind === "unknown" ? 0.3 : 0);

      const weekday = offset != null ? placeLocal(startIso, offset).weekday : new Date(start).getDay();
      const suggestion: Suggestion = {
        placeId: place.id,
        name: place.displayName,
        position,
        category: place.primaryTypeDisplayName ?? null,
        price: place.priceLevel ? PRICE_LEVELS[place.priceLevel] ?? null : null,
        rating,
        ratingCount: place.userRatingCount ?? null,
        photoUrl: place.photos?.[0]?.getURI({ maxHeight: 200 }) ?? null,
        hours: hoursForWeekday(place.regularOpeningHours?.weekdayDescriptions ?? [], weekday),
        walk: walkIn <= walkOut ? { minutes: walkIn, near: from.name } : { minutes: walkOut, near: to.name },
        start: startIso,
        end: endIso,
      };
      return [{ suggestion, score }];
    });

    return ranked
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ suggestion }) => suggestion);
  })();

  // Drop failed lookups from the cache so they are retried next time.
  request.catch(() => cache.delete(key));
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(key, request);
  return request;
}
