"use client";

import React from "react";
import CalendarGrid, { TimeRange } from "./CalendarGrid";
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
};

export default function Calendar({ day, stops, loading, error, selectedId, onSelect, onCreateRange, onTimeChange }: Props) {
  return (
    <div className="relative w-full h-full overflow-auto rounded-xl border border-line bg-white">
      {/* Status banner; the grid stays usable so events can be dragged in even when empty. */}
      {(loading || error || stops.length === 0) && (
        <div className="sticky top-0 z-30 border-b border-line bg-white/95 px-4 py-2 text-sm">
          {loading && <span className="text-muted">Loading events…</span>}
          {!loading && error && (
            <span className="text-red-600">Couldn&apos;t load events: {error}</span>
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
      />
    </div>
  );
}
