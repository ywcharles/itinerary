"use client";

import React, { useMemo, useState } from "react";
import AddStopDialog from "./components/AddStopDialog";
import { TimeRange } from "./components/Calendar/CalendarGrid";
import { dayKey, formatDay } from "./components/Calendar/calendarUtils";
import Details from "./components/Details";
import Maps from "./components/Maps";
import Schedule from "./components/Schedule";
import { mockStops, mockTrip, Stop } from "./data";

export default function ItineraryView() {
  const trip = mockTrip;
  const [stops, setStops] = useState<Stop[]>(mockStops);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [day, setDay] = useState(() => dayKey(mockStops[0].start_time));
  const [addRange, setAddRange] = useState<TimeRange | null>(null);

  const days = useMemo(
    () => [...new Set([...stops.map((stop) => dayKey(stop.start_time)), day])].sort(),
    [stops, day],
  );
  const dayStops = useMemo(
    () =>
      stops
        .filter((stop) => dayKey(stop.start_time) === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [stops, day],
  );
  const selectedStop = dayStops.find((stop) => stop.id === selectedId) ?? null;

  const updateDescription = (id: string, description: string) => {
    setStops((prev) =>
      prev.map((stop) => (stop.id === id ? { ...stop, description } : stop)),
    );
  };

  const openAdd = (range?: TimeRange) => {
    setAddRange(range ?? { start: `${day}T12:00:00`, end: `${day}T13:00:00` });
  };

  const addStop = (stop: Stop) => {
    setStops((prev) => [...prev, stop]);
    setDay(dayKey(stop.start_time));
    setSelectedId(stop.id);
    setAddRange(null);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 p-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">{trip.name} trip</h1>
        <p className="text-sm text-gray-500">
          {formatDay(days[0], "short")}
          {days.length > 1 && ` – ${formatDay(days[days.length - 1], "short")}`}
          {` · ${days.length} ${days.length === 1 ? "day" : "days"}`}
        </p>
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        <div className="w-1/2 h-full">
          <Schedule
            days={days}
            day={day}
            onDayChange={setDay}
            stops={dayStops}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={openAdd}
          />
        </div>
        <div className="w-1/2 h-full flex flex-col gap-4">
          <div className="flex-[3] min-h-64">
            <Maps
              stops={dayStops}
              selectedId={selectedStop?.id ?? null}
              onSelect={setSelectedId}
              fallbackCenter={trip.center}
            />
          </div>
          <div className="flex-[2] min-h-0">
            <Details stop={selectedStop} onDescriptionChange={updateDescription} />
          </div>
        </div>
      </div>

      {addRange && (
        <AddStopDialog
          trip={trip}
          initialRange={addRange}
          onAdd={addStop}
          onClose={() => setAddRange(null)}
        />
      )}
    </div>
  );
}
