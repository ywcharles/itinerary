"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import AddStopDialog, { StopDraft } from "./components/AddStopDialog";
import { TimeRange } from "./components/Calendar/CalendarGrid";
import { dayKey, daysCovered, formatDay, toTimestamp } from "./components/Calendar/calendarUtils";
import Details from "./components/Details";
import Maps from "./components/Maps";
import Schedule from "./components/Schedule";
import { useStops } from "./hooks/useStops";
import { byStartTime, coordinatesOf } from "./stopUtils";

type Props = {
  itineraryId: string;
  tripName: string;
};

export default function ItineraryView({ itineraryId, tripName }: Props) {
  const { stops, loading, error, addStop, updateStop, removeStop, refetch } = useStops(itineraryId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // null = not chosen yet; falls back to the first day with stops (they load asynchronously).
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const [addRange, setAddRange] = useState<TimeRange | null>(null);

  const sortedStops = useMemo(() => [...stops].sort(byStartTime), [stops]);
  const day = chosenDay ?? (sortedStops[0] ? dayKey(sortedStops[0].start_time) : dayKey(new Date()));

  // Activities that run past midnight belong to every day they cover.
  const stopDays = useMemo(
    () => new Map(sortedStops.map((stop) => [stop.id, daysCovered(stop.start_time, stop.end_time)])),
    [sortedStops],
  );
  const days = useMemo(
    () => [...new Set([...[...stopDays.values()].flat(), day])].sort(),
    [stopDays, day],
  );
  const dayStops = useMemo(
    () => sortedStops.filter((stop) => stopDays.get(stop.id)?.includes(day)),
    [sortedStops, stopDays, day],
  );
  const selectedStop = dayStops.find((stop) => stop.id === selectedId) ?? null;

  // Bias place searches toward where the trip already happens.
  const searchCenter = useMemo(() => {
    const located = sortedStops.map(coordinatesOf).filter((c) => c !== null);
    if (located.length === 0) return null;
    return {
      lat: located.reduce((sum, c) => sum + c.lat, 0) / located.length,
      lng: located.reduce((sum, c) => sum + c.lng, 0) / located.length,
    };
  }, [sortedStops]);

  const updateDescription = useCallback(
    (id: string, description: string) => updateStop(id, { description: description || null }),
    [updateStop],
  );

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<{ stopId: string; message: string } | null>(null);

  const deleteStop = useCallback(async (id: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await removeStop(id);
      setSelectedId((current) => (current === id ? null : current));
    } catch (err) {
      console.error("Deleting stop failed", err);
      setDeleteError({ stopId: id, message: err instanceof Error ? err.message : "Couldn't delete this activity." });
    } finally {
      setDeleting(false);
    }
  }, [removeStop]);

  // Backspace/Delete removes the selected activity, unless the user is typing somewhere.
  const selectedStopId = selectedStop?.id ?? null;
  useEffect(() => {
    if (!selectedStopId || addRange) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      if (!deleting) deleteStop(selectedStopId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedStopId, addRange, deleting, deleteStop]);

  const changeTime = useCallback(async (id: string, range: TimeRange) => {
    try {
      await updateStop(id, { start_time: range.start, end_time: range.end });
    } catch (err) {
      // The optimistic change was already shown; reload the real times.
      console.error("Changing time failed", err);
      refetch();
    }
  }, [updateStop, refetch]);

  const openAdd = (range?: TimeRange) => {
    setAddRange(range ?? { start: toTimestamp(day, 12 * 60), end: toTimestamp(day, 13 * 60) });
  };

  const saveStop = async (draft: StopDraft) => {
    const nextStopOrder = stops.length ? Math.max(...stops.map((s) => s.stop_order)) + 1 : 1;
    const saved = await addStop({ ...draft, itinerary_id: itineraryId, stop_order: nextStopOrder });
    setChosenDay(dayKey(saved.start_time));
    setSelectedId(saved.id);
    setAddRange(null);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 p-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">{tripName}</h1>
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
            onDayChange={setChosenDay}
            stops={dayStops}
            loading={loading}
            error={error}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={openAdd}
            onTimeChange={changeTime}
          />
        </div>
        <div className="w-1/2 h-full flex flex-col gap-4">
          <div className="flex-[3] min-h-64">
            <Maps stops={dayStops} selectedId={selectedStop?.id ?? null} onSelect={setSelectedId} />
          </div>
          <div className="flex-[2] min-h-0">
            <Details
              stop={selectedStop}
              onDescriptionChange={updateDescription}
              onDelete={deleteStop}
              deleting={deleting}
              deleteError={deleteError && deleteError.stopId === selectedStop?.id ? deleteError.message : null}
            />
          </div>
        </div>
      </div>

      {addRange && (
        <AddStopDialog
          tripName={tripName}
          searchCenter={searchCenter}
          initialRange={addRange}
          onAdd={saveStop}
          onClose={() => setAddRange(null)}
        />
      )}
    </div>
  );
}
