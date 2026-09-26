import React from "react";
import {
  getEventPosition,
  formatTime,
  formatDay,
  dayKey,
} from "./calendarUtils";

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 80;

type Props = {
  title: string;
  start: string;
  end: string;
  selected: boolean;
  onClick: () => void;
};

export default function CalendarEvent({
  title,
  start,
  end,
  selected,
  onClick,
}: Props) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  // Events that run past midnight are drawn to the bottom of the day's grid.
  const endsLaterDay = dayKey(endDate) !== dayKey(startDate);
  const visibleEnd = new Date(startDate);
  if (endsLaterDay) visibleEnd.setHours(END_HOUR, 0, 0, 0);

  const { top, height } = getEventPosition(
    startDate,
    endsLaterDay ? visibleEnd : endDate,
    START_HOUR,
    HOUR_HEIGHT,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute left-2 right-4 flex flex-col justify-start rounded-lg bg-secondary border p-3 overflow-hidden text-left cursor-pointer ${
        selected ? "border-primary ring-2 ring-primary" : "border-secondary"
      }`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      <p>{title}</p>

      <p className="text-xs text-white mt-1">
        {formatTime(startDate)} – {endsLaterDay && `${formatDay(dayKey(endDate), "short")}, `}{formatTime(endDate)}
      </p>
    </button>
  );
}