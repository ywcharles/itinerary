"use client";

import React from "react";
import { mockStops } from "../../data";
import CalendarGrid from "./CalendarGrid";

export default function Calendar() {
  return (
    <div className="w-full h-full overflow-auto rounded-xl border bg-white">
      <CalendarGrid stops={mockStops} />
    </div>
  );
}