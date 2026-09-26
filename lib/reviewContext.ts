import { loadGoogleLibrary } from "./googleMaps";
import { fetchLeg } from "./routes";
import { defaultCategory, fetchSuggestions, type Category } from "./suggestions";
import { visitStatus, type Period } from "./openingHours";
import { validateProposal, type ReviewBounds, type ReviewCandidate, type ReviewProposal } from "./aiReview";
import { byStartTime, coordinatesOf, placeIdOf } from "../app/itinerary/stopUtils";
import type { Stop } from "../app/itinerary/types";

export async function placeHours(stop: Stop, start = stop.start_time, end = stop.end_time) {
  const id = placeIdOf(stop);
  if (!id) return { kind: "unknown" as const };
  const { Place } = await loadGoogleLibrary("places");
  const place = new Place({ id });
  await place.fetchFields({ fields: ["regularOpeningHours", "utcOffsetMinutes", "businessStatus"] });
  if (place.businessStatus && place.businessStatus !== "OPERATIONAL") return { kind: "closed" as const, opensAt: null };
  const periods: Period[] = (place.regularOpeningHours?.periods ?? []).map((p) => ({ open: { day: p.open.day, hour: p.open.hour, minute: p.open.minute }, close: p.close ? { day: p.close.day, hour: p.close.hour, minute: p.close.minute } : null }));
  return visitStatus(periods, start, end, place.utcOffsetMinutes ?? null);
}

export async function collectReviewContext(stops: Stop[], allStops: Stop[], preferences: string) {
  const ordered = [...stops].sort(byStartTime);
  const excluded = new Set(allStops.flatMap((s) => [s.name.toLowerCase(), ...(placeIdOf(s) ? [placeIdOf(s)!] : [])]));
  const legs = await Promise.all(ordered.slice(1).map(async (to, i) => {
    const from = ordered[i], a = coordinatesOf(from), b = coordinatesOf(to);
    const leg = a && b ? await fetchLeg(a, b).catch(() => null) : null;
    return { fromId: from.id, toId: to.id, minutes: leg?.durationMinutes ?? null, mode: leg?.mode ?? "unknown", gapMinutes: (Date.parse(to.start_time) - Date.parse(from.end_time)) / 60_000 };
  }));
  const hours = await Promise.all(ordered.map(async (s) => ({ stopId: s.id, status: await placeHours(s).catch(() => ({ kind: "unknown" })) })));
  // Bound Google Places requests: two suitable gaps, two categories each.
  const gaps = ordered.slice(1).flatMap((to, i) => {
    const from = ordered[i], a = coordinatesOf(from), b = coordinatesOf(to);
    const free = (Date.parse(to.start_time) - Date.parse(from.end_time)) / 60_000;
    return a && b && free >= 45 ? [{ gap: { start: from.end_time, end: to.start_time, from: { name: from.name, position: a }, to: { name: to.name, position: b } }, free }] : [];
  }).slice(0, 2);
  const extra: Category = /outdoor|garden|park|nature/i.test(preferences) ? "outdoors" : /museum|art|culture/i.test(preferences) ? "sights" : "coffee";
  const results = await Promise.all(gaps.flatMap(({ gap, free }) => [...new Set([defaultCategory(gap, free), extra])].map((category) => fetchSuggestions(gap, category, excluded, 3).catch(() => []))));
  const candidates: ReviewCandidate[] = [];
  for (const idea of results.flat()) {
    if (!candidates.some((c) => c.id === idea.placeId)) candidates.push({ id: idea.placeId, name: idea.name, latitude: idea.position.lat, longitude: idea.position.lng, start: idea.start, end: idea.end, category: idea.category, hours: idea.hours });
  }
  return { candidates: candidates.slice(0, 8), legs, hours };
}

/** Revalidate actual routes and regular opening hours immediately before saving. */
export async function checkProposedVisit(p: ReviewProposal, stops: Stop[], candidates: ReviewCandidate[], bounds: ReviewBounds): Promise<string[]> {
  const invalid = validateProposal(p, stops, candidates, bounds);
  if (invalid) throw new Error(invalid);
  const candidate = candidates.find((c) => c.id === p.candidateId);
  const original = stops.find((s) => s.id === p.stopId);
  const changed = p.kind === "reschedule" ? { ...original!, start_time: p.start, end_time: p.end } : {
    id: "preview", itinerary_id: "", stop_order: 0, created_at: "", name: candidate!.name,
    start_time: p.start, end_time: p.end, latitude: candidate!.latitude, longitude: candidate!.longitude,
    description: null, image_url: null, google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(candidate!.name)}&query_place_id=${encodeURIComponent(candidate!.id)}`,
  };
  const status = await placeHours(changed);
  if (status.kind === "closed" || status.kind === "closes-early") throw new Error("This place is closed for part of the proposed visit. Ask for another suggestion.");
  const warnings: string[] = status.kind === "unknown" ? ["Opening hours are unverified; confirm with the venue."] : ["Regular opening hours fit; special-date hours may differ."];
  const others = stops.filter((s) => s.id !== original?.id).sort(byStartTime);
  const before = others.filter((s) => Date.parse(s.end_time) <= Date.parse(p.start)).at(-1);
  const after = others.find((s) => Date.parse(s.start_time) >= Date.parse(p.end));
  for (const [from, to] of [[before, changed], [changed, after]]) {
    if (!from || !to) continue;
    const a = coordinatesOf(from), b = coordinatesOf(to);
    if (!a || !b) { warnings.push("Travel time is unverified for an activity without a location."); continue; }
    if (a.lat === b.lat && a.lng === b.lng) continue;
    const leg = await fetchLeg(a, b);
    if (!leg) throw new Error("Couldn’t verify travel time. Try again before accepting this change.");
    if (Date.parse(from.end_time) + leg.durationMinutes * 60_000 > Date.parse(to.start_time)) throw new Error(`Not enough time to travel from ${from.name} to ${to.name}. Ask for another suggestion.`);
    warnings.push(`${leg.durationMinutes} min ${leg.mode === "WALKING" ? "walk" : "drive"} from ${from.name} to ${to.name}.`);
  }
  return warnings;
}
