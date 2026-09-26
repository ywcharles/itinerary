"use client";

import React from "react";
import { Stop } from "../../data";
import CalendarGrid from "./CalendarGrid";

type Props = {
  stops: Stop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function Calendar({ stops, selectedId, onSelect }: Props) {
  return (
    <div className="w-full h-full overflow-auto rounded-xl border bg-white">
      <CalendarGrid stops={stops} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}
