"use client";

import React, { useEffect, useState } from "react";
import { loadGoogleLibrary } from "@/lib/googleMaps";
import type { NewStop, Stop } from "../types";
import { TimeRange } from "./Calendar/CalendarGrid";
import { dayKey, endDayKey, timeOfDay, toTimestamp } from "./Calendar/calendarUtils";
import { coordinatesOf, LatLng, mapsUrlForPlace, placeIdOf } from "../stopUtils";
import { asMapsUrl, isShortMapsLink, parseMapsUrl } from "@/lib/mapsLink";

export type StopDraft = Omit<NewStop, "itinerary_id" | "stop_order">;

type PlaceResult = {
  // null for a dropped pin that isn't a Google place
  id: string | null;
  name: string;
  address: string;
  coordinates: LatLng;
  // Link to store; defaults to a Maps URL built from the place id.
  mapsUrl?: string;
};

const PLACE_FIELDS = ["id", "displayName", "formattedAddress", "location"];

function toResult(place: google.maps.places.Place, fallbackName: string): PlaceResult | null {
  if (!place.location) return null;
  return {
    id: place.id,
    name: place.displayName ?? fallbackName,
    address: place.formattedAddress ?? "",
    coordinates: place.location.toJSON(),
  };
}

/** Finds the place a pasted Google Maps link points to. */
async function resolveMapsLink(link: URL, searchCenter: LatLng | null): Promise<PlaceResult[]> {
  let url = link;
  if (isShortMapsLink(link)) {
    const res = await fetch(`/api/resolve-maps-link?url=${encodeURIComponent(link.href)}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Couldn't open this link.");
    url = new URL(body.url);
  }

  const { placeId, name, coordinates, query } = parseMapsUrl(url);
  const { Place } = await loadGoogleLibrary("places");

  if (placeId) {
    const place = new Place({ id: placeId });
    await place.fetchFields({ fields: PLACE_FIELDS });
    const result = toResult(place, name ?? query ?? "Pinned place");
    return result ? [result] : [];
  }

  const text = name ?? query;
  if (text) {
    // A place link carries the exact pin, so only accept matches right next to it.
    const { places } = await Place.searchByText({
      textQuery: text,
      ...(coordinates
        ? { locationBias: { center: coordinates, radius: 200 } }
        : searchCenter && { locationBias: { center: searchCenter, radius: 20000 } }),
      maxResultCount: coordinates ? 1 : 5,
      fields: PLACE_FIELDS,
    });
    const found = places.flatMap((place) => toResult(place, text) ?? []);
    if (found.length > 0) return found;
  }

  // No matching Google place: keep the pin itself so it still shows on the map.
  return coordinates
    ? [{ id: null, name: text ?? "Pinned location", address: "From Google Maps link", coordinates, mapsUrl: link.href }]
    : [];
}

type Props = {
  tripName: string;
  // Where to search first; null searches without a location preference.
  searchCenter: LatLng | null;
  initialRange: TimeRange;
  // Preselects this Google place (e.g. a landmark clicked on the map).
  initialPlaceId?: string | null;
  onAdd: (stop: StopDraft) => Promise<unknown>;
  // Edit mode: the activity being edited, and how to save the changed fields.
  editing?: Stop | null;
  onUpdate?: (fields: Partial<StopDraft>) => Promise<unknown>;
  onClose: () => void;
};

/** The activity's current place as a preselected result (edit mode). */
function currentPlace(stop: Stop): PlaceResult | null {
  const coordinates = coordinatesOf(stop);
  return coordinates
    ? { id: placeIdOf(stop), name: stop.name, address: "Current place", coordinates, mapsUrl: stop.google_maps_url ?? undefined }
    : null;
}

export default function AddStopDialog({
  tripName,
  searchCenter,
  initialRange,
  initialPlaceId,
  onAdd,
  editing,
  onUpdate,
  onClose,
}: Props) {
  const [query, setQuery] = useState(editing?.name ?? "");
  const [date, setDate] = useState(() => dayKey(initialRange.start));
  const [start, setStart] = useState(() => timeOfDay(initialRange.start));
  const [end, setEnd] = useState(() => timeOfDay(initialRange.end));
  const [description, setDescription] = useState(editing?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>(() => {
    const current = editing && currentPlace(editing);
    return current ? [current] : [];
  });
  const [chosen, setChosen] = useState<PlaceResult | null>(() => (editing && currentPlace(editing)) || null);
  // Edit mode only changes the place when the user picks a new one.
  const [placeChanged, setPlaceChanged] = useState(false);
  // Activities spanning several days keep their times (one date field can't express them).
  const multiDay = !!editing && endDayKey(editing.end_time) !== dayKey(editing.start_time);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialPlaceId) return;
    let active = true;
    loadGoogleLibrary("places")
      .then(async ({ Place }) => {
        const place = new Place({ id: initialPlaceId });
        await place.fetchFields({ fields: PLACE_FIELDS });
        const result = toResult(place, "Selected place");
        if (!active || !result) return;
        if (!editing) setQuery(result.name);
        setResults([result]);
        setChosen(result);
      })
      .catch((err) => {
        console.error("Loading clicked place failed", err);
        if (active) setError("Couldn't load this place.");
      });
    return () => { active = false; };
    // Only when the preselected place changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlaceId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setChosen(null);
    const link = asMapsUrl(query);
    try {
      let found: PlaceResult[];
      if (link) {
        found = await resolveMapsLink(link, searchCenter);
      } else {
        const { Place } = await loadGoogleLibrary("places");
        const { places } = await Place.searchByText({
          textQuery: query,
          ...(searchCenter && { locationBias: { center: searchCenter, radius: 20000 } }),
          maxResultCount: 5,
          fields: PLACE_FIELDS,
        });
        found = places.flatMap((place) => toResult(place, query) ?? []);
      }
      setResults(found);
      setChosen(found[0] ?? null);
      setPlaceChanged(true);
      if (found.length === 0) {
        setError(link ? "Couldn't find a place in this link." : "No places found. Try a different name.");
      }
    } catch (err) {
      console.error("Place search failed", err);
      setError(link ? "Couldn't read this Google Maps link." : "Couldn't search Google Places.");
    } finally {
      setSearching(false);
    }
  };

  // An end of 00:00 means midnight at the end of that day.
  const endsAtMidnight = end === "00:00";
  const invalidTime = !endsAtMidnight && end <= start;

  const times = () => ({
    // Inputs are local time; the DB stores UTC timestamps.
    start_time: new Date(`${date}T${start}`).toISOString(),
    end_time: endsAtMidnight ? toTimestamp(date, 24 * 60) : new Date(`${date}T${end}`).toISOString(),
  });

  const place = (result: PlaceResult) => ({
    name: result.name,
    google_maps_url: result.mapsUrl ?? (result.id ? mapsUrlForPlace(result.name, result.id) : null),
    latitude: result.coordinates.lat,
    longitude: result.coordinates.lng,
  });

  const saveEdit = async () => {
    if (!onUpdate || (!multiDay && invalidTime)) return;
    setSubmitting(true);
    setError(null);
    try {
      await onUpdate({
        ...(multiDay ? {} : times()),
        description: description.trim() || null,
        ...(placeChanged && chosen ? place(chosen) : {}),
      });
    } catch (err) {
      console.error("Updating stop failed", err);
      setError(err instanceof Error ? err.message : "Couldn't save the changes.");
      setSubmitting(false);
    }
  };

  // Edit mode: Enter saves. In the place search it only searches when a new place was typed;
  // Shift+Enter still adds a line break in the notes.
  const onDialogKeyDown = (e: React.KeyboardEvent) => {
    if (!editing || e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    const target = e.target as HTMLElement;
    if (target.hasAttribute("data-place-search") && query.trim() && query !== editing.name) return;
    if (target.tagName === "BUTTON") return;
    e.preventDefault();
    if (!submitting) saveEdit();
  };

  const add = async () => {
    if (editing) return saveEdit();
    if (!chosen || invalidTime) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({
        ...place(chosen),
        ...times(),
        description: description.trim() || null,
        image_url: null,
      });
    } catch (err) {
      console.error("Saving stop failed", err);
      setError(err instanceof Error ? err.message : "Couldn't save this activity.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 max-md:p-0"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-stop-title"
        // Phones: full screen, scrollable.
        className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl flex flex-col gap-4 max-md:h-full max-md:max-w-none max-md:overflow-y-auto max-md:rounded-none max-md:pt-[max(1.25rem,env(safe-area-inset-top))]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onDialogKeyDown}
      >
        <h2 id="add-stop-title" className="text-lg font-semibold">{editing ? "Edit activity" : "Add activity"}</h2>

        <form onSubmit={search} className="flex gap-2">
          <input
            autoFocus
            data-place-search
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              editing
                ? "Search a different place or paste a Google Maps link…"
                : `Search a place for ${tripName} or paste a Google Maps link…`
            }
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {searching ? "Searching…" : asMapsUrl(query) ? "Use link" : "Search"}
          </button>
        </form>
        <p className="-mt-2 text-xs text-muted">
          Tip: in Google Maps, tap Share on a place and paste the link here.
        </p>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {results.length > 0 && (
          <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {results.map((result) => (
              <li key={result.id ?? `${result.coordinates.lat},${result.coordinates.lng}`}>
                <button
                  type="button"
                  onClick={() => {
                    setChosen(result);
                    setPlaceChanged(true);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    chosen === result ? "border-primary bg-primary/10" : "hover:bg-canvas"
                  }`}
                >
                  <span className="font-medium">{result.name}</span>
                  <span className="block text-xs text-muted">{result.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {multiDay ? (
          <p className="text-sm text-muted">This activity spans several days, so its times can&apos;t be changed here.</p>
        ) : (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <label className="flex flex-col gap-1">
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            Start
            <input type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} className="rounded-lg border px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            End
            <input type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-lg border px-2 py-1.5" />
          </label>
        </div>
        )}
        {!multiDay && invalidTime && <p className="text-sm text-red-600 dark:text-red-400">End time must be after start time.</p>}

        <label className="flex flex-col gap-1 text-sm">
          Notes for the group
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional"
            className="rounded-lg border px-3 py-2 resize-none"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={add}
            disabled={(editing ? false : !chosen) || (!multiDay && invalidTime) || submitting}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {editing ? (submitting ? "Saving…" : "Save changes") : submitting ? "Adding…" : "Add to itinerary"}
          </button>
        </div>
      </div>
    </div>
  );
}
