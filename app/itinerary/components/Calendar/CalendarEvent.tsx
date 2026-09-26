import React from "react";
import {
  getEventPosition,
  formatTime,
} from "./calendarUtils";

const START_HOUR = 6;
const HOUR_HEIGHT = 80;

type Props = {
  title: string;
  start: string;
  end: string;
};

export default function CalendarEvent({
  title,
  start,
  end,
}: Props) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const { top, height } = getEventPosition(
    startDate,
    endDate,
    START_HOUR,
    HOUR_HEIGHT,
  );

  return (
    <div
      className="absolute left-2 right-4 rounded-lg bg-secondary border border-secondary p-3 overflow-hidden"
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      <p>{title}</p>

      <p className="text-xs text-white mt-1">
        {formatTime(startDate)} – {formatTime(endDate)}
      </p>
    </div>
  );
}