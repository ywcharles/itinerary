import React, { useMemo, useState } from "react";
import CalendarEvent from "./CalendarEvent";
import { formatHour, formatTime, toTimestamp } from "./calendarUtils";
import type { Stop } from "../../types";

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
  onTimeChange: (id: string, range: TimeRange) => void;
};

// Minutes since midnight for a y offset inside the grid, snapped to SNAP_MINUTES.
type Lane = { column: number; columns: number };

/**
 * Side-by-side columns for overlapping events, like Google Calendar: events that
 * overlap (directly or through a chain) share a group, and each takes the first free column.
 */
function layoutLanes(stops: Stop[], day: string): Map<string, Lane> {
  const dayStart = new Date(`${day}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const items = stops
    .map((stop) => ({
      id: stop.id,
      start: Math.max(new Date(stop.start_time).getTime(), dayStart),
      end: Math.min(new Date(stop.end_time).getTime(), dayEnd),
    }))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const lanes = new Map<string, Lane>();
  let group: { id: string; column: number }[] = [];
  let columnEnds: number[] = [];
  let groupEnd = -Infinity;

  const closeGroup = () => {
    group.forEach(({ id, column }) => lanes.set(id, { column, columns: columnEnds.length }));
    group = [];
    columnEnds = [];
  };

  for (const item of items) {
    if (item.start >= groupEnd) closeGroup();
    let column = columnEnds.findIndex((end) => end <= item.start);
    if (column === -1) column = columnEnds.length;
    columnEnds[column] = item.end;
    group.push({ id: item.id, column });
    groupEnd = Math.max(groupEnd, item.end);
  }
  closeGroup();
  return lanes;
}

function minutesAt(offsetY: number) {
  const raw = START_HOUR * 60 + (offsetY / HOUR_HEIGHT) * 60;
  const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.min(Math.max(snapped, START_HOUR * 60), END_HOUR * 60);
}

export default function CalendarGrid({ day, stops, selectedId, onSelect, onCreateRange, onTimeChange }: Props) {
  const totalHours = END_HOUR - START_HOUR;
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const lanes = useMemo(() => layoutLanes(stops, day), [stops, day]);

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
    onCreateRange({ start: toTimestamp(day, start), end: toTimestamp(day, end) });
  };

  const preview = drag && {
    top: ((Math.min(drag.from, drag.to) - START_HOUR * 60) / 60) * HOUR_HEIGHT,
    height: (Math.abs(drag.to - drag.from) / 60) * HOUR_HEIGHT,
  };

  return (
    <div
      // Top/bottom margin keeps the first and last hour labels from being clipped.
      className="relative my-3"
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
              className="absolute left-0 right-0 border-t border-line"
              style={{
                top: `${index * HOUR_HEIGHT}px`,
              }}
            >
              <div className="absolute left-0 -top-2 w-16 bg-white px-2 text-[11px] text-muted">
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
        {stops.map((stop, index) => (
          <CalendarEvent
            key={stop.id}
            number={index + 1}
            day={day}
            lane={lanes.get(stop.id) ?? { column: 0, columns: 1 }}
            title={stop.name}
            start={stop.start_time}
            end={stop.end_time}
            selected={stop.id === selectedId}
            onClick={() => onSelect(stop.id)}
            onTimeChange={(start, end) => onTimeChange(stop.id, { start, end })}
          />
        ))}

        {preview && preview.height > 0 && (
          <div
            className="pointer-events-none absolute left-2 right-4 rounded-lg border-2 border-dashed border-primary bg-primary/10 px-3 py-1 text-xs text-primary"
            style={{ top: `${preview.top}px`, height: `${preview.height}px` }}
          >
            {formatTime(new Date(toTimestamp(day, Math.min(drag.from, drag.to))))} –{" "}
            {formatTime(new Date(toTimestamp(day, Math.max(drag.from, drag.to))))}
          </div>
        )}
      </div>
    </div>
  );
}
