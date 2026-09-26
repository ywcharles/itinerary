"use client";

import React from "react";
import { Stop } from "../../data";
import CalendarGrid, { TimeRange } from "./CalendarGrid";

type Props = {
  day: string;
  stops: Stop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateRange: (range: TimeRange) => void;
};

export default function Calendar({ day, stops, selectedId, onSelect, onCreateRange }: Props) {
  return (
    <div className="w-full h-full overflow-auto rounded-xl border bg-white">
      <CalendarGrid
        day={day}
        stops={stops}
        selectedId={selectedId}
        onSelect={onSelect}
        onCreateRange={onCreateRange}
      />
    </div>
  );
}
