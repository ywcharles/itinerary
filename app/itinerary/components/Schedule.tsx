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
};

const Schedule = ({ days, day, onDayChange, stops, loading, error, selectedId, onSelect, onAdd }: Props) => {
  return (
    <div className="rounded-2xl border h-full w-full flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{formatDay(day)}</h2>
        <button
          type="button"
          onClick={() => onAdd()}
          className="rounded-xl bg-secondary px-4 h-10 text-white font-medium hover:bg-secondary/90"
        >
          + Add activity
        </button>
      </div>

      {days.length > 1 && (
        <div role="tablist" aria-label="Trip days" className="flex gap-2 overflow-x-auto">
          {days.map((d, index) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === day}
              onClick={() => onDayChange(d)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm border ${
                d === day ? "bg-primary text-white border-primary" : "bg-white hover:bg-gray-50"
              }`}
            >
              Day {index + 1} · {formatDay(d, "short")}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">Drag on an empty time slot to plan something there.</p>

      <div className="w-full flex-1 min-h-0">
        <Calendar
          day={day}
          stops={stops}
          loading={loading}
          error={error}
          selectedId={selectedId}
          onSelect={onSelect}
          onCreateRange={onAdd}
        />
      </div>
    </div>
  );
};

export default Schedule;
