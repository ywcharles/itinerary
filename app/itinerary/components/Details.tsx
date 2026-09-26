"use client";

import React, { useEffect, useRef, useState } from "react";
import { loadGoogleLibrary } from "@/lib/googleMaps";
import type { Stop } from "../types";
import { coordinatesOf, placeIdOf } from "../stopUtils";

type PlaceInfo = {
  name: string;
  address: string | null;
  photoUrl: string | null;
  photoAttribution: string | null;
  openingHours: string[];
  rating: number | null;
  ratingCount: number | null;
  website: string | null;
  mapsUrl: string | null;
};

// Places lookups cost money, so each stop is only looked up once per session.
const placeCache = new Map<string, Promise<PlaceInfo | null>>();

function fetchPlaceInfo(stop: Stop): Promise<PlaceInfo | null> {
  // Keyed on location too, so a stop whose place changes is looked up again.
  const cacheKey = `${stop.id}|${stop.google_maps_url}|${stop.latitude},${stop.longitude}`;
  const cached = placeCache.get(cacheKey);
  if (cached) return cached;

  const request = loadGoogleLibrary("places").then(async ({ Place }) => {
    const fields = [
      "displayName",
      "formattedAddress",
      "photos",
      "regularOpeningHours",
      "rating",
      "userRatingCount",
      "websiteURI",
      "googleMapsURI",
    ];
    const placeId = placeIdOf(stop);
    const coordinates = coordinatesOf(stop);
    let place: google.maps.places.Place | undefined;
    if (placeId) {
      place = new Place({ id: placeId });
      await place.fetchFields({ fields });
    } else if (coordinates) {
      const { places } = await Place.searchByText({
        textQuery: stop.name,
        locationBias: { center: coordinates, radius: 1000 },
        maxResultCount: 1,
        fields,
      });
      place = places[0];
    }
    // Without a place id or coordinates a name search would match anywhere in the world.
    if (!place) return null;

    const photo = place.photos?.[0];
    return {
      name: place.displayName ?? stop.name,
      address: place.formattedAddress ?? null,
      photoUrl: photo?.getURI({ maxHeight: 400 }) ?? null,
      photoAttribution: photo?.authorAttributions[0]?.displayName ?? null,
      openingHours: place.regularOpeningHours?.weekdayDescriptions ?? [],
      rating: place.rating ?? null,
      ratingCount: place.userRatingCount ?? null,
      website: place.websiteURI ?? null,
      mapsUrl: place.googleMapsURI ?? null,
    };
  });

  // Drop failed lookups from the cache so they are retried next time.
  request.catch(() => placeCache.delete(cacheKey));
  placeCache.set(cacheKey, request);
  return request;
}

const SAVE_DELAY_MS = 600;

type NotesProps = {
  value: string;
  onSave: (text: string) => Promise<void>;
};

// Notes are saved to Supabase shortly after typing stops. Updates from other people
// (via realtime) replace the text only while there are no unsaved local edits.
function NotesField({ value, onSave }: NotesProps) {
  const [draft, setDraft] = useState(value);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (!dirty) setDraft(value);
  }

  const latest = useRef({ draft, dirty, onSave });
  useEffect(() => {
    latest.current = { draft, dirty, onSave };
  });

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(async () => {
      const text = draft;
      setStatus("saving");
      try {
        await onSave(text);
        setStatus("saved");
        if (latest.current.draft === text) setDirty(false);
      } catch (error) {
        console.error("Saving notes failed", error);
        setStatus("error");
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, dirty, onSave]);

  // Don't lose a pending edit when switching to another stop.
  useEffect(() => () => {
    if (latest.current.dirty) latest.current.onSave(latest.current.draft).catch(console.error);
  }, []);

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold flex items-baseline justify-between">
        Notes for the group
        <span className={`text-xs font-normal ${status === "error" ? "text-red-600" : "text-gray-400"}`}>
          {status === "saving" && "Saving…"}
          {status === "saved" && !dirty && "Saved"}
          {status === "error" && "Couldn't save"}
        </span>
      </span>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        placeholder="e.g. Book a table in advance, meet at the entrance…"
        rows={2}
        className="rounded-lg border p-2 text-sm resize-y"
      />
    </label>
  );
}

type Props = {
  stop: Stop | null;
  onDescriptionChange: (id: string, description: string) => Promise<void>;
  onDelete: (id: string) => void;
  deleting: boolean;
  deleteError: string | null;
};

const Details = ({ stop, onDescriptionChange, onDelete, deleting, deleteError }: Props) => {
  // The lookup result is tagged with the stop it belongs to, so a stale result never shows for a newly selected stop.
  const [result, setResult] = useState<{ stopId: string; place: PlaceInfo | null; failed: boolean } | null>(null);

  useEffect(() => {
    if (!stop) return;
    let active = true;
    const stopId = stop.id;
    fetchPlaceInfo(stop)
      .then((place) => {
        if (active) setResult({ stopId, place, failed: false });
      })
      .catch((error) => {
        console.error("Place lookup failed", error);
        if (active) setResult({ stopId, place: null, failed: true });
      });
    return () => { active = false; };
    // Only refetch when the selected stop or its location changes, not when its notes are edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop?.id, stop?.google_maps_url, stop?.latitude, stop?.longitude]);

  const current = result && stop && result.stopId === stop.id ? result : null;
  const place = current?.place ?? null;
  const status = !current ? "loading" : current.failed ? "error" : "idle";
  const mapsLink = place?.mapsUrl || stop?.google_maps_url || null;

  if (!stop) {
    return (
      <div className="rounded-2xl border border-line bg-white shadow-sm h-full w-full flex flex-col justify-center items-center gap-2 p-6 text-center">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-secondary" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
          <circle cx="12" cy="10" r="2.3" />
        </svg>
        <p className="font-medium">Select an activity</p>
        <p className="text-sm text-muted">Click one in the calendar or on the map to see photos, opening hours and notes.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm h-full w-full overflow-y-auto">
      <div className="relative h-24 w-full shrink-0 bg-secondary">
        {place?.photoUrl && (
          // Google photo URLs are signed and short-lived, so next/image optimization isn't a fit.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.photoUrl} alt={place.name} className="h-full w-full object-cover" />
        )}
        {place?.photoAttribution && (
          <span className="absolute bottom-1 right-2 text-[10px] text-white drop-shadow">
            Photo: {place.photoAttribution}
          </span>
        )}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center text-white">Loading…</div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-semibold">{place?.name ?? stop.name}</h2>
            <button
              type="button"
              onClick={() => onDelete(stop.id)}
              disabled={deleting}
              title="Delete activity (Backspace)"
              className="shrink-0 rounded-lg border px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
          {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
          {place?.address && <p className="text-sm text-gray-500">{place.address}</p>}
          {current && !place && !current.failed && (
            <p className="text-sm text-gray-500">No location set for this activity.</p>
          )}
          {place?.rating != null && (
            <p className="text-sm">
              ★ {place.rating.toFixed(1)}
              {place.ratingCount != null && <span className="text-gray-500"> ({place.ratingCount})</span>}
            </p>
          )}
        </div>

        <NotesField
          key={stop.id}
          value={stop.description ?? ""}
          onSave={(text) => onDescriptionChange(stop.id, text)}
        />

        {status === "error" && (
          <p className="text-sm text-red-600">Couldn&apos;t load place info from Google.</p>
        )}

        {place && (
          <div>
            <h3 className="text-sm font-semibold">Opening hours</h3>
            {place.openingHours.length > 0 ? (
              <ul className="text-sm text-gray-700">
                {place.openingHours.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No opening hours available</p>
            )}
          </div>
        )}

        {(place?.website || mapsLink) && (
          <div className="flex gap-4 text-sm text-primary">
            {place?.website && <a href={place.website} target="_blank" rel="noreferrer">Website</a>}
            {mapsLink && <a href={mapsLink} target="_blank" rel="noreferrer">Open in Google Maps</a>}
          </div>
        )}

      </div>
    </div>
  );
};

export default Details;
