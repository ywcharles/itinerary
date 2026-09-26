"use client";

import React, { useEffect, useState } from "react";
import { loadGoogleLibrary } from "@/lib/googleMaps";
import { Stop, Trip } from "../data";
import { TimeRange } from "./Calendar/CalendarGrid";

type PlaceResult = {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  mapsUrl: string;
};

type Props = {
  trip: Trip;
  initialRange: TimeRange;
  onAdd: (stop: Stop) => void;
  onClose: () => void;
};

// "2026-09-26T09:00:00" -> ["2026-09-26", "09:00"]
function splitIso(iso: string) {
  return [iso.slice(0, 10), iso.slice(11, 16)] as const;
}

export default function AddStopDialog({ trip, initialRange, onAdd, onClose }: Props) {
  const [initialDate, initialStart] = splitIso(initialRange.start);
  const [, initialEnd] = splitIso(initialRange.end);

  const [query, setQuery] = useState("");
  const [date, setDate] = useState(initialDate);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [chosen, setChosen] = useState<PlaceResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const { Place } = await loadGoogleLibrary("places");
      const { places } = await Place.searchByText({
        textQuery: query,
        locationBias: { center: trip.center, radius: 20000 },
        maxResultCount: 5,
        fields: ["id", "displayName", "formattedAddress", "location", "googleMapsURI"],
      });
      const found = places
        .filter((place) => place.location)
        .map((place) => ({
          id: place.id,
          name: place.displayName ?? query,
          address: place.formattedAddress ?? "",
          coordinates: place.location!.toJSON(),
          mapsUrl: place.googleMapsURI ?? "",
        }));
      setResults(found);
      setChosen(found[0] ?? null);
      if (found.length === 0) setError("No places found. Try a different name.");
    } catch (err) {
      console.error("Place search failed", err);
      setError("Couldn't search Google Places.");
    } finally {
      setSearching(false);
    }
  };

  const invalidTime = end <= start;

  const add = () => {
    if (!chosen || invalidTime) return;
    onAdd({
      id: crypto.randomUUID(),
      name: chosen.name,
      start_time: `${date}T${start}:00`,
      end_time: `${date}T${end}:00`,
      google_map_links: chosen.mapsUrl,
      coordinates: chosen.coordinates,
      description: "",
      image: "",
      place_id: chosen.id,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-stop-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-stop-title" className="text-lg font-semibold">Add activity</h2>

        <form onSubmit={search} className="flex gap-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search a place in ${trip.name}…`}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {results.length > 0 && (
          <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => setChosen(result)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    chosen?.id === result.id ? "border-primary bg-primary/10" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">{result.name}</span>
                  <span className="block text-xs text-gray-500">{result.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

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
        {invalidTime && <p className="text-sm text-red-600">End time must be after start time.</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={add}
            disabled={!chosen || invalidTime}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Add to itinerary
          </button>
        </div>
      </div>
    </div>
  );
}
