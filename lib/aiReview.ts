import type { Stop } from "../app/itinerary/types";

export type ReviewCandidate = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  start: string;
  end: string;
  category: string | null;
  hours: string | null;
};
export type ReviewProposal = {
  id: string;
  title: string;
  reason: string;
  kind: "reschedule" | "add";
  stopId: string;
  candidateId: string;
  start: string;
  end: string;
};
export type DayReview = { summary: string; observations: string[]; proposals: ReviewProposal[] };
export type ReviewBounds = { dayStart: string; dayEnd: string; lockedIds: string[] };

export function stopFingerprint(stops: Stop[]): string {
  return JSON.stringify([...stops].sort((a, b) => a.id.localeCompare(b.id)).map((s) => [
    s.id, s.itinerary_id, s.name, s.start_time, s.end_time, s.latitude, s.longitude,
    s.google_maps_url, s.description, s.stop_order, s.image_url,
  ]));
}

export function dayInZone(timestamp: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp));
  const value = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Convert a wall-clock time in an IANA timezone into an ISO timestamp. */
export function timeInZone(day: string, timeZone: string, hour = 0, minute = 0): string {
  const [year, month, date] = day.split("-").map(Number);
  const target = Date.UTC(year, month - 1, date, hour, minute);
  let instant = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(instant));
    const value = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const shownAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
    const correction = target - shownAsUtc;
    instant += correction;
    if (correction === 0) break;
  }
  return new Date(instant).toISOString();
}

/** Exact start and end instants for a destination-local calendar day (including DST days). */
export function dayBoundsInZone(day: string, timeZone: string) {
  const [year, month, date] = day.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
  return { dayStart: timeInZone(day, timeZone), dayEnd: timeInZone(nextDay, timeZone) };
}

export function isIsoTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
}

export function validateProposal(p: ReviewProposal, stops: Stop[], candidates: ReviewCandidate[], bounds: ReviewBounds): string | null {
  if (p.kind !== "reschedule" && p.kind !== "add") return "This change type is not supported.";
  if (!isIsoTime(p.start) || !isIsoTime(p.end)) return "The suggested times are invalid.";
  const start = Date.parse(p.start), end = Date.parse(p.end);
  if (end - start < 15 * 60_000) return "Activities need at least 15 minutes.";
  if (start < Date.parse(bounds.dayStart) || end > Date.parse(bounds.dayEnd)) return "The change must stay within this day.";
  let omittedId = "";
  if (p.kind === "reschedule") {
    const stop = stops.find((s) => s.id === p.stopId);
    if (!stop) return "This activity no longer exists.";
    if (bounds.lockedIds.includes(stop.id)) return "This activity is locked.";
    if (Date.parse(stop.start_time) < Date.parse(bounds.dayStart) || Date.parse(stop.end_time) > Date.parse(bounds.dayEnd)) return "Overnight activities must be edited manually.";
    if (Date.parse(stop.start_time) === start && Date.parse(stop.end_time) === end) return "The suggested times are unchanged.";
    omittedId = stop.id;
  } else {
    const candidate = candidates.find((c) => c.id === p.candidateId);
    if (!candidate) return "This place was not in the verified search results.";
    if (Date.parse(candidate.start) !== start || Date.parse(candidate.end) !== end) return "Use the time slot returned by the place search.";
    if (stops.some((s) => s.name.toLowerCase() === candidate.name.toLowerCase() || s.google_maps_url?.includes(encodeURIComponent(candidate.id)))) return "This place is already in the itinerary.";
  }
  if (stops.some((s) => s.id !== omittedId && start < Date.parse(s.end_time) && end > Date.parse(s.start_time))) return "This change overlaps another activity.";
  return null;
}

export function parseReview(value: unknown): DayReview {
  if (!value || typeof value !== "object") throw new Error("Invalid review response.");
  const v = value as Record<string, unknown>;
  const text = (x: unknown, max: number) => typeof x === "string" && x.length > 0 && x.length <= max;
  if (!text(v.summary, 1500) || !Array.isArray(v.observations) || v.observations.length > 4 || !v.observations.every((x) => text(x, 600)) || !Array.isArray(v.proposals) || v.proposals.length > 3) throw new Error("Invalid review response.");
  const proposals = v.proposals.map((item, i) => {
    if (!item || typeof item !== "object") throw new Error("Invalid suggestion.");
    const p = item as Record<string, unknown>;
    if (!text(p.title, 160) || !text(p.reason, 800) || !["reschedule", "add"].includes(String(p.kind)) || typeof p.stopId !== "string" || typeof p.candidateId !== "string" || !isIsoTime(p.start) || !isIsoTime(p.end)) throw new Error("Invalid suggestion.");
    return { id: `proposal-${i + 1}`, title: p.title, reason: p.reason, kind: p.kind, stopId: p.stopId, candidateId: p.candidateId, start: new Date(p.start).toISOString(), end: new Date(p.end).toISOString() } as ReviewProposal;
  });
  return { summary: v.summary as string, observations: v.observations as string[], proposals };
}

export const reviewSchema = {
  type: "object", required: ["summary", "observations", "proposals"], additionalProperties: false,
  properties: {
    summary: { type: "string" },
    observations: { type: "array", items: { type: "string" }, maxItems: 4 },
    proposals: { type: "array", maxItems: 3, items: {
      type: "object", additionalProperties: false,
      required: ["title", "reason", "kind", "stopId", "candidateId", "start", "end"],
      properties: {
        title: { type: "string" }, reason: { type: "string" }, kind: { type: "string", enum: ["reschedule", "add"] },
        stopId: { type: "string" }, candidateId: { type: "string" }, start: { type: "string" }, end: { type: "string" },
      },
    } },
  },
};
