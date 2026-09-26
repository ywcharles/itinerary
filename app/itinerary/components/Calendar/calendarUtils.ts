// UI locale; keep in sync with LANGUAGE in lib/googleMaps.ts.
export const LOCALE = "en-US";

export function getEventPosition(
  start: Date,
  end: Date,
  startHour: number,
  hourHeight: number,
) {
  const startMinutes =
    start.getHours() * 60 + start.getMinutes();

  const endMinutes =
    end.getHours() * 60 + end.getMinutes();

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
  return new Date(`${day}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`).toISOString();
}

export function formatDay(day: string, format: "long" | "short" = "long") {
  const date = new Date(`${day}T00:00:00`);
  return date.toLocaleDateString(LOCALE, format === "long"
    ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    : { weekday: "short", month: "short", day: "numeric" });
}
