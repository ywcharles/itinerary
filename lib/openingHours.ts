// Opening hours relative to a planned visit, evaluated in the place's own time zone.

/** Google's opening period: day 0 = Sunday; `close` is null for places open 24/7. */
export type Period = {
  open: { day: number; hour: number; minute: number };
  close: { day: number; hour: number; minute: number } | null;
};

export type VisitStatus =
  | { kind: "open" }
  | { kind: "closes-early"; closesAt: string }
  | { kind: "closed"; opensAt: string | null }
  | { kind: "unknown" };

const DAY = 24 * 60;
const WEEK = 7 * DAY;

/** A timestamp as place-local day of week (0 = Sunday) and minutes since midnight. */
export function placeLocal(timestamp: string, utcOffsetMinutes: number) {
  const shifted = new Date(new Date(timestamp).getTime() + utcOffsetMinutes * 60000);
  return { weekday: shifted.getUTCDay(), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}

export function formatClock(minutesOfDay: number) {
  const h = Math.floor(minutesOfDay / 60) % 24;
  const m = minutesOfDay % 60;
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

const weekMinute = ({ day, hour, minute }: { day: number; hour: number; minute: number }) =>
  day * DAY + hour * 60 + minute;

/** Whether the place is open for the whole visit, closes during it, or is closed on arrival. */
export function visitStatus(
  periods: Period[],
  start: string,
  end: string,
  utcOffsetMinutes: number | null,
): VisitStatus {
  if (!periods.length || utcOffsetMinutes == null) return { kind: "unknown" };
  if (periods.some((p) => !p.close)) return { kind: "open" };

  const arrival = placeLocal(start, utcOffsetMinutes);
  const visitStart = arrival.weekday * DAY + arrival.minutes;
  const visitEnd = visitStart + Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000);

  // Periods as [open, close) week-minute ranges; ones crossing Saturday→Sunday also get a copy shifted back a week.
  const ranges = periods.flatMap((p) => {
    const open = weekMinute(p.open);
    let close = weekMinute(p.close!);
    if (close <= open) close += WEEK;
    return [[open, close], [open - WEEK, close - WEEK]];
  });

  const current = ranges.find(([open, close]) => open <= visitStart && visitStart < close);
  if (current) {
    return visitEnd <= current[1]
      ? { kind: "open" }
      : { kind: "closes-early", closesAt: formatClock(((current[1] % WEEK) + WEEK) % DAY) };
  }

  // Closed on arrival: when does it open later that same day?
  const dayEnd = (arrival.weekday + 1) * DAY;
  const next = ranges
    .map(([open]) => open)
    .filter((open) => open > visitStart && open < dayEnd)
    .sort((a, b) => a - b)[0];
  return { kind: "closed", opensAt: next != null ? formatClock(next % DAY) : null };
}

/** Google's weekdayDescriptions run Monday→Sunday; this returns the hours text for one weekday (0 = Sunday). */
export function hoursForWeekday(weekdayDescriptions: string[], weekday: number) {
  const line = weekdayDescriptions[(weekday + 6) % 7];
  return line ? line.replace(/^[^:]+:\s*/, "") : null;
}
