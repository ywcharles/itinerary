import type { Stop } from "../app/itinerary/types";
import type { Category, Gap } from "./suggestions";

/** Search within daytime calendar hours, including free time at either end of the day. */
export function reviewGaps(stops: Stop[], day: string): Gap[] {
  const start = new Date(`${day}T08:00:00`).getTime();
  const end = new Date(`${day}T22:00:00`).getTime();
  const ordered = [...stops].sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));
  const anchor = (s: Stop) => s.latitude != null && s.longitude != null
    ? { name: s.name, position: { lat: s.latitude, lng: s.longitude } } : null;
  const gaps: Gap[] = [];
  const add = (fromTime: number, toTime: number, from: Stop, to: Stop, openStart = false, openEnd = false) => {
    const a = anchor(from), b = anchor(to);
    const lo = Math.max(start, fromTime), hi = Math.min(end, toTime);
    if (a && b && hi - lo >= 45 * 60_000) gaps.push({ start: new Date(lo).toISOString(), end: new Date(hi).toISOString(), from: a, to: b, openStart, openEnd });
  };
  if (!ordered.length) return gaps;
  add(start, Date.parse(ordered[0].start_time), ordered[0], ordered[0], true);
  // Track the latest-ending activity so overlapping activities never create a false gap.
  let previous = ordered[0];
  for (const next of ordered.slice(1)) {
    add(Date.parse(previous.end_time), Date.parse(next.start_time), previous, next);
    if (Date.parse(next.end_time) > Date.parse(previous.end_time)) previous = next;
  }
  add(Date.parse(previous.end_time), end, previous, previous, false, true);
  return gaps.sort((a, b) => (Date.parse(b.end) - Date.parse(b.start)) - (Date.parse(a.end) - Date.parse(a.start))).slice(0, 3);
}

export function requestedCategories(preferences: string): Category[] {
  const categories: Category[] = [];
  if (/shop|mall|retail/i.test(preferences)) categories.push("shopping");
  if (/histor|heritage|monument|ancient/i.test(preferences)) categories.push("history");
  if (/museum|art|culture|sight/i.test(preferences)) categories.push("sights");
  if (/outdoor|garden|park|nature/i.test(preferences)) categories.push("outdoors");
  if (/food|lunch|dinner|restaurant|breakfast/i.test(preferences)) categories.push("food");
  if (/coffee|cafe|bakery/i.test(preferences)) categories.push("coffee");
  return categories.slice(0, 2);
}
