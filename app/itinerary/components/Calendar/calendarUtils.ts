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
// Stop times are local wall-clock strings (YYYY-MM-DDTHH:mm:ss), so the day is the date part.
export function dayKey(isoDateTime: string) {
  return isoDateTime.slice(0, 10);
}

export function formatDay(day: string, format: "long" | "short" = "long") {
  const date = new Date(`${day}T00:00:00`);
  return date.toLocaleDateString(LOCALE, format === "long"
    ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    : { weekday: "short", month: "short", day: "numeric" });
}
