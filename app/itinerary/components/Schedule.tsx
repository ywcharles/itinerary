import React, { useEffect, useRef } from "react";
import Calendar from "./Calendar/Calendar";
import { TimeRange } from "./Calendar/CalendarGrid";
import { formatDay } from "./Calendar/calendarUtils";
import type { Stop } from "../types";
import DayWeather from "./DayWeather";

type Props = {
  days: string[];
  day: string;
  onDayChange: (day: string) => void;
  stops: Stop[];
  aiPreview?: Stop | null;
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (range?: TimeRange) => void;
  onTimeChange: (id: string, range: TimeRange) => void;
  onEdit: (id: string) => void;
  onSuggest: (fromId: string, toId: string, freeMinutes: number) => void;
};

const Schedule = ({ days, day, onDayChange, stops, loading, error, selectedId, onSelect, onAdd, onTimeChange, onEdit, onSuggest, aiPreview }: Props) => {
  const weatherLocation = stops.find((s) => s.latitude != null && s.longitude != null);
  // Keep the selected day's tab visible when switching days (e.g. with the arrow keys).
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    tabsRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [day]);

  return (
    <div className="rounded-2xl border border-line bg-surface shadow-sm h-full min-w-0 w-full flex flex-col p-3 sm:p-4 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{formatDay(day)}</h2>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:ml-auto sm:w-auto">
          {!loading && stops.length > 0 && <DayWeather day={day} location={weatherLocation} />}
        <button
          type="button"
          onClick={() => onAdd()}
          className="rounded-lg bg-primary px-3.5 h-11 lg:h-9 text-sm text-white font-medium shadow-sm transition-colors hover:bg-primary/90"
        >
          + Add activity
        </button>
        </div>
      </div>

      {days.length > 1 && (
        // One line; scrolls sideways on long trips.
        <div ref={tabsRef} role="tablist" aria-label="Trip days" className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-canvas p-1">
          {days.map((d, index) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === day}
              onClick={() => onDayChange(d)}

              className={`min-h-11 lg:min-h-0 shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                d === day ? "bg-surface font-medium text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <span className="font-medium">Day {index + 1}</span>
              <span className="ml-1.5 text-xs opacity-75">{formatDay(d, "short")}</span>
            </button>
          ))}
        </div>
      )}
      <div className="w-full flex-1 min-h-0">
        <Calendar
          day={day}
          stops={stops}
          loading={loading}
          error={error}
          selectedId={selectedId}
          onSelect={onSelect}
          onCreateRange={onAdd}
          onTimeChange={onTimeChange}
          onEdit={onEdit}
          onSuggest={onSuggest}
          aiPreview={aiPreview}
        />
      </div>
    </div>
  );
};

export default Schedule;
