import React from "react";
import CalendarEvent from "./CalendarEvent";
import { formatHour } from "./calendarUtils";

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 80;

type Stop = {
  id: string | number;
  start_time: string;
  end_time: string;
  description: string;
};

type Props = {
  stops: Stop[];
};

export default function CalendarGrid({ stops }: Props) {
  const totalHours = END_HOUR - START_HOUR;

  return (
    <div
      className="relative"
      style={{
        height: `${totalHours * HOUR_HEIGHT}px`,
      }}
    >
      {/* Time grid */}
      {Array.from(
        { length: totalHours + 1 },
        (_, index) => {
          const hour = START_HOUR + index;

          return (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-gray-200"
              style={{
                top: `${index * HOUR_HEIGHT}px`,
              }}
            >
              <div className="absolute left-0 -top-3 w-16 px-2 text-xs text-gray-500">
                {formatHour(hour)}
              </div>
            </div>
          );
        },
      )}

      {/* Events */}
      <div className="absolute left-16 right-0 top-0 bottom-0">
        {stops.map((stop) => (
          <CalendarEvent
            key={stop.id}
            title={stop.description}
            start={stop.start_time}
            end={stop.end_time}
          />
        ))}
      </div>
    </div>
  );
}