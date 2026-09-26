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

  return date.toLocaleTimeString([], {
    hour: "numeric",
  });
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}