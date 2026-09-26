"use client";

import React from "react";
import CalendarGrid from "./CalendarGrid";
import type { Stop } from "../../types";

type Props = {
  stops: Stop[];
  loading: boolean;
  error: string | null;
};

export default function Calendar({ stops, loading, error }: Props) {
  return (
    <div className="w-full h-full overflow-auto rounded-xl border bg-white">
      {loading && <p className="p-4 text-sm text-gray-500">Loading events…</p>}

      {error && (
        <p className="p-4 text-sm text-red-600">
          Couldn&apos;t load events: {error}
        </p>
      )}

      {!loading && !error && stops.length === 0 && (
        <p className="p-4 text-sm text-gray-500">
          No events yet — tap Add to create the first one.
        </p>
      )}

      {!loading && !error && stops.length > 0 && (
        <CalendarGrid stops={stops} />
      )}
    </div>
  );
}