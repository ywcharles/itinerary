"use client";

import React, { useEffect, useRef } from "react";
import CalendarGrid, { TimeRange } from "./CalendarGrid";
import { dayKey, DEFAULT_SCROLL_HOUR, HOUR_HEIGHT, START_HOUR } from "./calendarUtils";
import type { Stop } from "../../types";

type Props = {
  day: string;
  stops: Stop[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateRange: (range: TimeRange) => void;
  onTimeChange: (id: string, range: TimeRange) => void;
  onEdit: (id: string) => void;
  onSuggest: (fromId: string, toId: string, freeMinutes: number) => void;
};

export default function Calendar({ day, stops, loading, error, selectedId, onSelect, onCreateRange, onTimeChange, onEdit, onSuggest }: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  // Open on daytime: 7 AM, or an hour before the day's first activity if that's earlier.
  // Only when the day changes or the stops finish loading, so dragging/editing never jumps.
  useEffect(() => {
    if (loading || !scroller.current) return;
    const firstStart = stops
      .filter((stop) => dayKey(stop.start_time) === day)
      .map((stop) => new Date(stop.start_time))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const firstHour = firstStart ? firstStart.getHours() + firstStart.getMinutes() / 60 - 1 : Infinity;
    const hour = Math.max(START_HOUR, Math.min(DEFAULT_SCROLL_HOUR, firstHour));
    scroller.current.scrollTop = (hour - START_HOUR) * HOUR_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, loading]);

  return (
    <div ref={scroller} className="relative w-full h-full overflow-auto rounded-xl border border-line bg-surface">
      {/* Status banner; the grid stays usable so events can be dragged in even when empty. */}
      {(loading || error || stops.length === 0) && (
        <div className="sticky top-0 z-30 border-b border-line bg-surface/95 px-4 py-2 text-sm">
          {loading && <span className="text-muted">Loading events…</span>}
          {!loading && error && (
            <span className="text-red-600 dark:text-red-400">Couldn&apos;t load events: {error}</span>
          )}
          {!loading && !error && stops.length === 0 && (
            <span className="text-muted">
              No events on this day yet. Tap Add or drag on the grid to create one.
            </span>
          )}
        </div>
      )}

      <CalendarGrid
        day={day}
        stops={stops}
        selectedId={selectedId}
        onSelect={onSelect}
        onCreateRange={onCreateRange}
        onTimeChange={onTimeChange}
        onEdit={onEdit}
        onSuggest={onSuggest}
      />
    </div>
  );
}
