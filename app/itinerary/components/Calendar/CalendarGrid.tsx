import React, { useMemo, useState } from "react";
import CalendarEvent from "./CalendarEvent";
import {
  dayKey,
  END_HOUR,
  formatHour,
  formatTime,
  getEventPosition,
  HOUR_HEIGHT,
  START_HOUR,
  toTimestamp,
} from "./calendarUtils";
import { useTravelLegs } from "../../hooks/useTravelLegs";
import { formatDuration } from "@/lib/routes";
import { MIN_FREE_MINUTES } from "@/lib/suggestions";
import type { Stop } from "../../types";

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
  onEdit: (id: string) => void;
  // Opens ideas for the free time between two activities.
  onSuggest: (fromId: string, toId: string, freeMinutes: number) => void;
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

export default function CalendarGrid({ day, stops, selectedId, onSelect, onCreateRange, onTimeChange, onEdit, onSuggest }: Props) {
  const totalHours = END_HOUR - START_HOUR;
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const lanes = useMemo(() => layoutLanes(stops, day), [stops, day]);
  // Travel time between consecutive activities, shown in the gap between them.
  const travel = useTravelLegs(stops).filter(({ from }) => dayKey(from.end_time) === day);

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
      {/* Time grid: hour labels in a gutter, solid hour lines and dotted half-hour lines */}
      <div className="absolute left-16 top-0 bottom-0 border-l border-line" />
      {Array.from(
        { length: totalHours + 1 },
        (_, index) => {
          const hour = START_HOUR + index;

          return (
            <React.Fragment key={hour}>
              <div
                className="absolute left-14 right-0 border-t border-line"
                style={{ top: `${index * HOUR_HEIGHT}px` }}
              >
                <div className="absolute right-full -top-2 w-14 pr-2 text-right text-[11px] leading-4 text-muted">
                  {index > 0 && index < totalHours ? formatHour(hour) : ""}
                </div>
              </div>
              {index < totalHours && (
                <div
                  className="absolute left-16 right-0 border-t border-dotted border-line"
                  style={{ top: `${(index + 0.5) * HOUR_HEIGHT}px` }}
                />
              )}
            </React.Fragment>
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
        {/* Travel between consecutive stops: a dotted connector through the gap with a small time pill. */}
        {travel.map(({ from, to, leg, gapMinutes }) => {
          const gridEnd = new Date(toTimestamp(day, END_HOUR * 60));
          const arrival = new Date(to.start_time);
          const { top, height } = getEventPosition(
            new Date(from.end_time),
            arrival > gridEnd ? gridEnd : arrival,
            START_HOUR,
            HOUR_HEIGHT,
          );
          const gap = Math.max(height, 0);
          const shortBy = Math.ceil(leg.durationMinutes - gapMinutes);
          const tooTight = shortBy > 0;
          const verb = leg.mode === "WALKING" ? "walk" : "drive";
          const canSuggest = gapMinutes - leg.durationMinutes >= MIN_FREE_MINUTES;
          return (
            <div
              key={`${from.id}->${to.id}`}
              className="pointer-events-none absolute left-0.5 right-2"
              style={{ top: `${top}px`, height: `${gap}px` }}
            >
              <span
                title={
                  tooTight
                    ? `${formatDuration(leg.durationMinutes)} ${verb} to ${to.name}, but only ${Math.max(0, Math.round(gapMinutes))} min until it starts`
                    : `${formatDuration(leg.durationMinutes)} ${verb} to ${to.name} · ${(leg.distanceMeters / 1000).toFixed(1)} km`
                }
                // Always on the right, where it never covers a title; centered in the gap
                // (for back-to-back activities it sits on the boundary).
                // Plain text in the gap; when there's no room it needs a white backing to sit on the blocks.
                className={`pointer-events-auto absolute right-1 top-1/2 z-20 inline-flex -translate-y-1/2 items-center gap-1 whitespace-nowrap text-[11px] leading-4 ${
                  gap < 16 ? "rounded-sm bg-surface px-1 ring-1 ring-line" : ""
                } ${tooTight ? "font-medium text-red-600 dark:text-red-400" : "text-muted"}`}
              >
                <span aria-hidden>{leg.mode === "WALKING" ? "🚶" : "🚗"}</span>
                {formatDuration(leg.durationMinutes)}
                {tooTight && <span className="font-semibold">· {shortBy} min short</span>}
              </span>
              {canSuggest && (
                <button
                  type="button"
                  onClick={() => onSuggest(from.id, to.id, gapMinutes - leg.durationMinutes)}
                  className="pointer-events-auto absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-dashed border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  ✨ Ideas for this gap
                </button>
              )}
            </div>
          );
        })}

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
            onEdit={() => onEdit(stop.id)}
          />
        ))}

        {preview && preview.height > 0 && (
          <div
            className="pointer-events-none absolute left-0.5 right-2 rounded-[4px] border border-dashed border-primary bg-primary/10 px-1.5 py-1 text-[11px] text-primary"
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
