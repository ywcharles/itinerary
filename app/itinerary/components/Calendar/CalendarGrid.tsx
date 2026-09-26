import React, { useState } from "react";
import CalendarEvent from "./CalendarEvent";
import { formatHour, formatTime } from "./calendarUtils";
import { Stop } from "../../data";

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 80;
const SNAP_MINUTES = 15;
const DEFAULT_DURATION_MINUTES = 60;

export type TimeRange = { start: string; end: string };

type Props = {
  day: string;
  stops: Stop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateRange: (range: TimeRange) => void;
};

// Minutes since midnight for a y offset inside the grid, snapped to SNAP_MINUTES.
function minutesAt(offsetY: number) {
  const raw = START_HOUR * 60 + (offsetY / HOUR_HEIGHT) * 60;
  const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.min(Math.max(snapped, START_HOUR * 60), END_HOUR * 60);
}

function toIso(day: string, minutes: number) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${day}T${hh}:${mm}:00`;
}

export default function CalendarGrid({ day, stops, selectedId, onSelect, onCreateRange }: Props) {
  const totalHours = END_HOUR - START_HOUR;
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);

  const offsetY = (e: React.PointerEvent<HTMLDivElement>) =>
    e.clientY - e.currentTarget.getBoundingClientRect().top;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only start a drag on empty grid space, not on an existing event.
    if (e.target !== e.currentTarget || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const minutes = minutesAt(offsetY(e));
    setDrag({ from: minutes, to: minutes });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    setDrag({ ...drag, to: minutesAt(offsetY(e)) });
  };

  const handlePointerUp = () => {
    if (!drag) return;
    let start = Math.min(drag.from, drag.to);
    let end = Math.max(drag.from, drag.to);
    // A plain click (no drag) proposes a default-length slot.
    if (end - start < SNAP_MINUTES) {
      end = Math.min(start + DEFAULT_DURATION_MINUTES, END_HOUR * 60);
      start = end - DEFAULT_DURATION_MINUTES;
    }
    setDrag(null);
    onCreateRange({ start: toIso(day, start), end: toIso(day, end) });
  };

  const preview = drag && {
    top: ((Math.min(drag.from, drag.to) - START_HOUR * 60) / 60) * HOUR_HEIGHT,
    height: (Math.abs(drag.to - drag.from) / 60) * HOUR_HEIGHT,
  };

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

      {/* Events; drag on empty space to create a new one */}
      <div
        className="absolute left-16 right-0 top-0 bottom-0 cursor-crosshair touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDrag(null)}
      >
        {stops.map((stop) => (
          <CalendarEvent
            key={stop.id}
            title={stop.name}
            start={stop.start_time}
            end={stop.end_time}
            selected={stop.id === selectedId}
            onClick={() => onSelect(stop.id)}
          />
        ))}

        {preview && preview.height > 0 && (
          <div
            className="pointer-events-none absolute left-2 right-4 rounded-lg border-2 border-dashed border-primary bg-primary/10 px-3 py-1 text-xs text-primary"
            style={{ top: `${preview.top}px`, height: `${preview.height}px` }}
          >
            {formatTime(new Date(toIso(day, Math.min(drag.from, drag.to))))} –{" "}
            {formatTime(new Date(toIso(day, Math.max(drag.from, drag.to))))}
          </div>
        )}
      </div>
    </div>
  );
}
