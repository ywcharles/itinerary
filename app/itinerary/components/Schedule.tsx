import React from "react";
import Calendar from "./Calendar/Calendar";
import { TimeRange } from "./Calendar/CalendarGrid";
import { formatDay } from "./Calendar/calendarUtils";
import type { Stop } from "../types";

type Props = {
  days: string[];
  day: string;
  onDayChange: (day: string) => void;
  stops: Stop[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (range?: TimeRange) => void;
  onTimeChange: (id: string, range: TimeRange) => void;
};

const Schedule = ({ days, day, onDayChange, stops, loading, error, selectedId, onSelect, onAdd, onTimeChange }: Props) => {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm h-full w-full flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">{formatDay(day)}</h2>
        <button
          type="button"
          onClick={() => onAdd()}
          className="rounded-lg bg-primary px-3.5 h-9 text-sm text-white font-medium shadow-sm transition-colors hover:bg-primary/90"
        >
          + Add activity
        </button>
      </div>

      {days.length > 1 && (
        <div role="tablist" aria-label="Trip days" className="flex gap-1 overflow-x-auto rounded-xl bg-canvas p-1">
          {days.map((d, index) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === day}
              onClick={() => onDayChange(d)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                d === day ? "bg-white font-medium text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <span className="font-medium">Day {index + 1}</span>
              <span className="ml-1.5 text-xs opacity-75">{formatDay(d, "short")}</span>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">Drag on an empty slot to plan something. Drag an activity to move it, or its edge to change the length.{days.length > 1 && " Use ← → to switch days."}</p>

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
        />
      </div>
    </div>
  );
};

export default Schedule;
