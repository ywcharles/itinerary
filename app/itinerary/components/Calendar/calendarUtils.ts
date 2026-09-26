// UI locale; keep in sync with LANGUAGE in lib/googleMaps.ts.
export const LOCALE = "en-US";

// The day grid covers the whole day; it opens scrolled to daytime (see DEFAULT_SCROLL_HOUR).
export const START_HOUR = 0;
export const END_HOUR = 24;
export const HOUR_HEIGHT = 80;
export const DEFAULT_SCROLL_HOUR = 7;

export function getEventPosition(
  start: Date,
  end: Date,
  startHour: number,
  hourHeight: number,
) {
  const startMinutes =
    start.getHours() * 60 + start.getMinutes();

  // An end on a later day (e.g. midnight at the bottom of the grid) counts past 24:00.
  const endMinutes =
    end.getHours() * 60 + end.getMinutes() +
    (dayKey(end) > dayKey(start) ? 24 * 60 : 0);

  const calendarStartMinutes = startHour * 60;

  const top =
    ((startMinutes - calendarStartMinutes) / 60) *
    hourHeight;

  const height =
    ((endMinutes - startMinutes) / 60) *
    hourHeight;

  return {
    top,
    height,
  };
}

export function formatHour(hour: number) {
  const date = new Date();

  date.setHours(hour, 0, 0, 0);

  return date.toLocaleTimeString(LOCALE, {
    hour: "numeric",
  });
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day (YYYY-MM-DD) of a timestamp. Stop times are stored as UTC ISO strings. */
export function dayKey(timestamp: string | Date) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local time (HH:mm) of a timestamp, as used by <input type="time">. */
export function timeOfDay(timestamp: string | Date) {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** UTC ISO timestamp for a local day plus minutes since local midnight. */
export function toTimestamp(day: string, minutes: number) {
  // Built from local midnight, so 24:00 (end of day) works too.
  const date = new Date(`${day}T00:00:00`);
  date.setMinutes(minutes);
  return date.toISOString();
}

export function formatDay(day: string, format: "long" | "short" = "long") {
  const date = new Date(`${day}T00:00:00`);
  return date.toLocaleDateString(LOCALE, format === "long"
    ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    : { weekday: "short", month: "short", day: "numeric" });
}

// Caps runaway ranges from bad data (e.g. an end date typed years ahead).
const MAX_SPAN_DAYS = 14;

/** The local day an event ends on; ending exactly at midnight still belongs to the day before. */
export function endDayKey(end: string | Date) {
  return dayKey(new Date(new Date(end).getTime() - 1));
}

/** Every local day (YYYY-MM-DD) from start to end, inclusive. */
export function daysCovered(start: string | Date, end: string | Date) {
  const days: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = endDayKey(end);
  while (days.length < MAX_SPAN_DAYS) {
    const key = dayKey(cursor);
    days.push(key);
    if (key >= last) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
