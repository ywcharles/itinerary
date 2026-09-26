"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import AddStopDialog, { StopDraft } from "./components/AddStopDialog";
import { TimeRange } from "./components/Calendar/CalendarGrid";
import { dayKey, daysBetween, daysCovered, toTimestamp } from "./components/Calendar/calendarUtils";
import Details from "./components/Details";
import Maps from "./components/Maps";
import Schedule from "./components/Schedule";
import TripBar from "./components/TripBar";
import { rememberTrip } from "@/lib/recentTrips";
import Suggestions from "./components/Suggestions";
import ReviewPanel from "./components/ReviewPanel";
import { supabase } from "@/lib/supabase";
import { stopFingerprint, type ReviewBounds, type ReviewCandidate, type ReviewProposal } from "@/lib/aiReview";
import { checkProposedVisit } from "@/lib/reviewContext";
import type { Stop } from "./types";
import type { Gap, Suggestion } from "@/lib/suggestions";
import { useStops } from "./hooks/useStops";
import { byStartTime, coordinatesOf, mapsUrlForPlace, placeIdOf } from "./stopUtils";

type Props = {
  itineraryId: string;
  slug: string;
  tripName: string;
  // Day an empty trip opens on (from ?start=), instead of today.
  startDay: string | null;
};

export default function ItineraryView({ itineraryId, slug, tripName, startDay }: Props) {
  // Remember this trip in the browser so it shows up under "Your trips".
  useEffect(() => {
    rememberTrip(slug, tripName);
  }, [slug, tripName]);

  const { stops, loading, error, addStop, updateStop, removeStop, refetch } = useStops(itineraryId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [aiPreview, setAiPreview] = useState<Stop | null>(null);
  const [undoChange, setUndoChange] = useState<{ before: Stop | null; after: Stop; snapshot: string } | null>(null);
  // null = not chosen yet; falls back to the first day with stops (they load asynchronously).
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const [addRange, setAddRange] = useState<TimeRange | null>(null);
  // Set when the dialog was opened by clicking a landmark on the map.
  const [addPlaceId, setAddPlaceId] = useState<string | null>(null);
  // The activity being edited (double-click in the calendar).
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingStop = stops.find((stop) => stop.id === editingId) ?? null;
  const dialogOpen = !!addRange || !!editingStop;

  const sortedStops = useMemo(() => [...stops].sort(byStartTime), [stops]);

  // Activities that run past midnight belong to every day they cover.
  const stopDays = useMemo(
    () => new Map(sortedStops.map((stop) => [stop.id, daysCovered(stop.start_time, stop.end_time)])),
    [sortedStops],
  );
  const activityDays = useMemo(() => [...new Set([...stopDays.values()].flat())].sort(), [stopDays]);

  // The trip spans its first to last activity (the chosen start day or today for an empty trip).
  const today = startDay ?? dayKey(new Date());
  const range = {
    start: activityDays[0] ?? today,
    end: activityDays[activityDays.length - 1] ?? today,
  };

  // Every day from the first to the last activity can be planned, including empty days in between.
  const days = useMemo(() => daysBetween(range.start, range.end), [range.start, range.end]);
  const day = chosenDay && days.includes(chosenDay) ? chosenDay : days[0];

  const dayStops = useMemo(
    () => sortedStops.filter((stop) => stopDays.get(stop.id)?.includes(day)),
    [sortedStops, stopDays, day],
  );
  // "Ideas for this gap": the two activities around the gap, while the ideas panel is open.
  const [ideasFor, setIdeasFor] = useState<{ fromId: string; toId: string; freeMinutes: number } | null>(null);
  const ideasGap = useMemo<Gap | null>(() => {
    if (!ideasFor) return null;
    const from = dayStops.find((s) => s.id === ideasFor.fromId);
    const to = dayStops.find((s) => s.id === ideasFor.toId);
    const fromPos = from && coordinatesOf(from);
    const toPos = to && coordinatesOf(to);
    // Closes by itself when the day changes or either activity is gone.
    if (!from || !to || !fromPos || !toPos) return null;
    return {
      start: from.end_time,
      end: to.start_time,
      from: { name: from.name, position: fromPos },
      to: { name: to.name, position: toPos },
    };
  }, [ideasFor, dayStops]);
  // Places already in the trip aren't suggested again.
  const planned = useMemo(
    () => new Set(sortedStops.flatMap((s) => [s.name.toLowerCase(), placeIdOf(s) ?? []].flat())),
    [sortedStops],
  );

  // Picking an activity (calendar or map) closes the ideas panel.
  const selectStop = useCallback((id: string) => {
    setSelectedId(id);
    setIdeasFor(null);
  }, []);

  // Phones show one view at a time; the details/ideas panel is a bottom sheet there.
  const [mobileView, setMobileView] = useState<"calendar" | "map">("calendar");

  // The activity the user clicked, if it's on the shown day.
  const clickedStop = dayStops.find((stop) => stop.id === selectedId) ?? null;
  // Shown in detail: the clicked one, otherwise the day's first activity.
  const selectedStop = clickedStop ?? dayStops[0] ?? null;

  // Phones only open the sheet for an activity the user tapped (or for ideas).
  const sheetOpen = !!ideasGap || !!clickedStop;
  const closeSheet = () => {
    setSelectedId(null);
    setIdeasFor(null);
  };

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
    async (id: string, description: string) => { await updateStop(id, { description: description || null }); },
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
  // Only an activity the user actually picked, so Backspace right after opening a trip deletes nothing.
  const selectedStopId = clickedStop?.id ?? null;
  useEffect(() => {
    // Not while ideas cover the details card: the user couldn't see what would be deleted.
    if (!selectedStopId || dialogOpen || ideasGap || reviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      if (!deleting) deleteStop(selectedStopId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedStopId, dialogOpen, ideasGap, reviewOpen, deleting, deleteStop]);

  // Left/right arrow keys switch to the previous/next day of the trip.
  useEffect(() => {
    if (days.length < 2 || dialogOpen || reviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement;
      // Leave arrows alone while typing, and on the map (Google Maps pans with them).
      if (target.closest("input, textarea, select, [contenteditable='true'], [aria-label='Itinerary map']")) return;
      const next = days.indexOf(day) + (e.key === "ArrowRight" ? 1 : -1);
      if (next < 0 || next >= days.length) return;
      e.preventDefault();
      setChosenDay(days[next]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [days, day, dialogOpen, reviewOpen]);

  const changeTime = useCallback(async (id: string, range: TimeRange) => {
    try {
      await updateStop(id, { start_time: range.start, end_time: range.end });
    } catch (err) {
      // The optimistic change was already shown; reload the real times.
      console.error("Changing time failed", err);
      refetch();
    }
  }, [updateStop, refetch]);

  const closeAdd = () => {
    setAddRange(null);
    setAddPlaceId(null);
    setEditingId(null);
  };

  const openEdit = (id: string) => {
    setSelectedId(id);
    setEditingId(id);
  };

  const saveEdit = async (fields: Partial<StopDraft>) => {
    if (!editingStop) return;
    await updateStop(editingStop.id, fields);
    if (fields.start_time) setChosenDay(dayKey(fields.start_time));
    closeAdd();
  };

  // A landmark clicked on the map goes into the next free hour after the day's last activity.
  const openAddForPlace = (placeId: string) => {
    const lastEnd = dayStops.reduce<Date | null>((latest, stop) => {
      const end = new Date(stop.end_time);
      return dayKey(end) === day && (!latest || end > latest) ? end : latest;
    }, null);
    const endOfDay = 24 * 60;
    const afterLast = lastEnd
      ? Math.ceil((lastEnd.getHours() * 60 + lastEnd.getMinutes()) / 15) * 15
      : 12 * 60;
    const start = Math.min(afterLast, endOfDay - 60);
    setAddPlaceId(placeId);
    setAddRange({ start: toTimestamp(day, start), end: toTimestamp(day, start + 60) });
  };

  const addIdea = async (idea: Suggestion) => {
    await saveStop({
      name: idea.name,
      start_time: idea.start,
      end_time: idea.end,
      description: null,
      google_maps_url: mapsUrlForPlace(idea.name, idea.placeId),
      latitude: idea.position.lat,
      longitude: idea.position.lng,
      image_url: null,
    });
    setIdeasFor(null);
  };

  const openIdeas = (fromId: string, toId: string, freeMinutes: number) => {
    setSelectedId(null);
    setIdeasFor({ fromId, toId, freeMinutes });
  };

  const openAdd = (range?: TimeRange) => {
    setAddPlaceId(null);
    setAddRange(range ?? { start: toTimestamp(day, 12 * 60), end: toTimestamp(day, 13 * 60) });
  };

  const saveStop = async (draft: StopDraft) => {
    const nextStopOrder = stops.length ? Math.max(...stops.map((s) => s.stop_order)) + 1 : 1;
    const saved = await addStop({ ...draft, itinerary_id: itineraryId, stop_order: nextStopOrder });
    setChosenDay(dayKey(saved.start_time));
    setSelectedId(saved.id);
    closeAdd();
  };

  const freshStops = async (expected: string) => {
    const { data, error } = await supabase.from("stops").select("*").eq("itinerary_id", itineraryId);
    if (error) throw new Error("Couldn’t check the latest itinerary. Please try again.");
    const latest = (data ?? []) as Stop[];
    if (stopFingerprint(latest) !== expected) {
      void refetch();
      throw new Error("Your itinerary has changed. Get fresh suggestions first.");
    }
    return latest;
  };

  const previewChange = (proposal: ReviewProposal | null, candidates: ReviewCandidate[]) => {
    if (!proposal) { setAiPreview(null); return; }
    const existing = stops.find((s) => s.id === proposal.stopId);
    const place = candidates.find((c) => c.id === proposal.candidateId);
    setAiPreview({ ...(existing ?? { id: "ai-preview", itinerary_id: itineraryId, stop_order: 0, name: place!.name, latitude: place!.latitude, longitude: place!.longitude, description: null, google_maps_url: mapsUrlForPlace(place!.name, place!.id), image_url: null, created_at: "" }), start_time: proposal.start, end_time: proposal.end });
  };

  const applyChange = async (proposal: ReviewProposal, candidates: ReviewCandidate[], bounds: ReviewBounds, snapshot: string) => {
    const current = await freshStops(snapshot);
    await checkProposedVisit(proposal, current, candidates, bounds);
    // Recheck after potentially slow place/route lookups, then compare target fields in the write.
    await freshStops(snapshot);
    let before: Stop | null = null;
    let saved: Stop;
    if (proposal.kind === "reschedule") {
      before = current.find((s) => s.id === proposal.stopId)!;
      saved = await updateStop(before.id, { start_time: proposal.start, end_time: proposal.end }, before);
    } else {
      const place = candidates.find((c) => c.id === proposal.candidateId)!;
      saved = await addStop({ itinerary_id: itineraryId, stop_order: Math.max(0, ...current.map((s) => s.stop_order)) + 1, name: place.name, start_time: proposal.start, end_time: proposal.end, latitude: place.latitude, longitude: place.longitude, description: null, google_maps_url: mapsUrlForPlace(place.name, place.id), image_url: null });
    }
    const after = before ? current.map((s) => s.id === saved.id ? saved : s) : [...current, saved];
    setUndoChange({ before, after: saved, snapshot: stopFingerprint(after) });
    setSelectedId(saved.id);
    setAiPreview(null);
    return { saved, snapshot: stopFingerprint(after) };
  };

  const undoAiChange = async () => {
    if (!undoChange) return;
    await freshStops(undoChange.snapshot);
    if (undoChange.before) {
      await updateStop(undoChange.after.id, { start_time: undoChange.before.start_time, end_time: undoChange.before.end_time }, undoChange.after);
    } else {
      await removeStop(undoChange.after.id, undoChange.after);
    }
    setUndoChange(null); setAiPreview(null);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <TripBar tripName={tripName} firstDay={range.start} lastDay={range.end} onReview={() => { setIdeasFor(null); setReviewOpen(true); }} canReview={!loading && dayStops.length >= 2} />
      {/* Phones: switch between calendar and map (desktop shows both). */}
      <div className="flex gap-1 border-b border-line bg-surface p-1.5 md:hidden" role="tablist" aria-label="View">
        {(["calendar", "map"] as const).map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={mobileView === view}
            onClick={() => setMobileView(view)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
              mobileView === view ? "bg-canvas text-ink" : "text-muted"
            }`}
          >
            {view === "calendar" ? "🗓️ Calendar" : "🗺️ Map"}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex gap-4 p-2 md:p-4">
        <div className={`h-full max-md:w-full md:w-1/2 ${mobileView === "map" ? "max-md:hidden" : ""}`}>
          <Schedule
            days={days}
            day={day}
            onDayChange={setChosenDay}
            stops={dayStops}
            loading={loading}
            error={error}
            selectedId={selectedStop?.id ?? null}
            onSelect={selectStop}
            onAdd={openAdd}
            onTimeChange={changeTime}
            onEdit={openEdit}
            onSuggest={openIdeas}
            aiPreview={aiPreview}
          />
        </div>
        <div className="max-md:contents md:flex md:h-full md:w-1/2 md:flex-col md:gap-4">
          <div className={`max-md:h-full max-md:w-full md:min-h-64 md:flex-[3] ${mobileView === "calendar" ? "max-md:hidden" : ""}`}>
            <Maps
              visible={mobileView === "map"}
              stops={dayStops}
              selectedId={selectedStop?.id ?? null}
              onSelect={selectStop}
              onPlaceClick={openAddForPlace}
            />
          </div>
          {/* Phones: a dimmed backdrop behind the bottom sheet; tapping it closes the sheet. */}
          {sheetOpen && (
            <button
              type="button"
              aria-label="Close"
              onClick={closeSheet}
              className="fixed inset-0 z-30 bg-black/30 md:hidden"
            />
          )}
          <div
            className={`md:min-h-0 md:flex-[2] max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:flex max-md:h-[70dvh] max-md:flex-col max-md:rounded-t-2xl max-md:bg-canvas max-md:px-2 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom))] max-md:shadow-2xl ${
              sheetOpen ? "" : "max-md:hidden"
            }`}
          >
            <div className="flex shrink-0 items-center justify-center py-1.5 md:hidden">
              <button type="button" onClick={closeSheet} aria-label="Close details" className="h-1.5 w-12 rounded-full bg-muted/40" />
            </div>
            <div className="min-h-0 flex-1 md:h-full">
            {ideasGap && ideasFor ? (
              <Suggestions
                key={`${ideasFor.fromId}->${ideasFor.toId}`}
                gap={ideasGap}
                freeMinutes={ideasFor.freeMinutes}
                exclude={planned}
                onAdd={addIdea}
                onClose={() => setIdeasFor(null)}
              />
            ) : (
            <Details
                stop={selectedStop}
                onDescriptionChange={updateDescription}
                onDelete={deleteStop}
              onEdit={openEdit}
                deleting={deleting}
                deleteError={deleteError && deleteError.stopId === selectedStop?.id ? deleteError.message : null}
              />
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Phones: add an activity from a floating button (desktop has it in the calendar header). */}
      {!sheetOpen && (
        <button
          type="button"
          onClick={() => openAdd()}
          aria-label="Add activity"
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl leading-none text-white shadow-lg md:hidden"
        >
          +
        </button>
      )}
      {reviewOpen && <ReviewPanel key={day} itineraryId={itineraryId} day={day} stops={dayStops} allStops={stops} onClose={() => { setReviewOpen(false); setAiPreview(null); }} onPreview={previewChange} onApply={applyChange} onUndo={undoAiChange} canUndo={!!undoChange} />}

      {editingStop && (
        <AddStopDialog
          key={editingStop.id}
          tripName={tripName}
          searchCenter={searchCenter}
          initialRange={{ start: editingStop.start_time, end: editingStop.end_time }}
          initialPlaceId={placeIdOf(editingStop)}
          editing={editingStop}
          onAdd={saveStop}
          onUpdate={saveEdit}
          onClose={closeAdd}
        />
      )}

      {addRange && !editingStop && (
        <AddStopDialog
          tripName={tripName}
          searchCenter={searchCenter}
          initialRange={addRange}
          initialPlaceId={addPlaceId}
          onAdd={saveStop}
          onClose={closeAdd}
        />
      )}
    </div>
  );
}
