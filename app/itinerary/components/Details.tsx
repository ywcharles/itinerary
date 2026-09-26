"use client";

import React, { useEffect, useRef, useState } from "react";
import { loadGoogleLibrary } from "@/lib/googleMaps";
import type { Stop } from "../types";
import { coordinatesOf, placeIdOf } from "../stopUtils";
import { hoursForWeekday, Period, placeLocal, visitStatus } from "@/lib/openingHours";
import { PRICE_LEVELS } from "@/lib/suggestions";
import { formatDay, dayKey } from "./Calendar/calendarUtils";

type PlaceInfo = {
  name: string;
  address: string | null;
  photoUrl: string | null;
  photoAttribution: string | null;
  openingHours: string[];
  periods: Period[];
  utcOffsetMinutes: number | null;
  rating: number | null;
  ratingCount: number | null;
  website: string | null;
  mapsUrl: string | null;
  phone: string | null;
  phoneLink: string | null;
  category: string | null;
  priceLevel: string | null;
  summary: string | null;
  reservable: boolean | null;
  businessStatus: string | null;
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
      "utcOffsetMinutes",
      "nationalPhoneNumber",
      "internationalPhoneNumber",
      "primaryTypeDisplayName",
      "priceLevel",
      "editorialSummary",
      "isReservable",
      "businessStatus",
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
      photoUrl: photo?.getURI({ maxHeight: 800 }) ?? null,
      photoAttribution: photo?.authorAttributions[0]?.displayName ?? null,
      openingHours: place.regularOpeningHours?.weekdayDescriptions ?? [],
      periods: (place.regularOpeningHours?.periods ?? []).map((period) => ({
        open: { day: period.open.day, hour: period.open.hour, minute: period.open.minute },
        close: period.close
          ? { day: period.close.day, hour: period.close.hour, minute: period.close.minute }
          : null,
      })),
      utcOffsetMinutes: place.utcOffsetMinutes ?? null,
      rating: place.rating ?? null,
      ratingCount: place.userRatingCount ?? null,
      website: place.websiteURI ?? null,
      mapsUrl: place.googleMapsURI ?? null,
      phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
      phoneLink: place.internationalPhoneNumber
        ? `tel:${place.internationalPhoneNumber.replace(/[^\d+]/g, "")}`
        : null,
      category: place.primaryTypeDisplayName ?? null,
      priceLevel: place.priceLevel ? PRICE_LEVELS[place.priceLevel] ?? null : null,
      summary: place.editorialSummary ?? null,
      reservable: place.isReservable ?? null,
      businessStatus: place.businessStatus ?? null,
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
        <span className={`text-xs font-normal ${status === "error" ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
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
        className="rounded-lg border border-line p-2 text-sm resize-y outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

// Opening hours for the day of the visit, and whether the place is open for all of it.
function VisitHours({ place, stop }: { place: PlaceInfo; stop: Stop }) {
  if (place.openingHours.length === 0) {
    return (
      <div className="text-sm">
        <h3 className="font-semibold">Opening hours</h3>
        <p className="text-muted">No opening hours available</p>
      </div>
    );
  }

  // The weekday of the visit where the place is (falls back to the viewer's time zone).
  const weekday = place.utcOffsetMinutes != null
    ? placeLocal(stop.start_time, place.utcOffsetMinutes).weekday
    : new Date(stop.start_time).getDay();
  const hours = hoursForWeekday(place.openingHours, weekday);
  const status = visitStatus(place.periods, stop.start_time, stop.end_time, place.utcOffsetMinutes);

  const badge =
    status.kind === "open"
      ? { text: "Open during your visit", className: "bg-ok-bg text-ok-text" }
      : status.kind === "closes-early"
        ? { text: `Closes at ${status.closesAt}, before you leave`, className: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" }
        : status.kind === "closed"
          ? {
              text: status.opensAt ? `Closed when you arrive, opens ${status.opensAt}` : "Closed when you arrive",
              className: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
            }
          : null;

  return (
    <div className="text-sm">
      <h3 className="font-semibold">Opening hours · {formatDay(dayKey(stop.start_time), "short")}</h3>
      <p>{hours ?? "Unknown"}</p>
      {badge && (
        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
          {badge.text}
        </span>
      )}
      <details className="mt-1 text-muted">
        <summary className="cursor-pointer text-xs hover:text-ink">All hours</summary>
        <ul className="mt-1 leading-relaxed">
          {place.openingHours.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

type Props = {
  stop: Stop | null;
  onDescriptionChange: (id: string, description: string) => Promise<void>;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  deleting: boolean;
  deleteError: string | null;
};

const Details = ({ stop, onDescriptionChange, onDelete, onEdit, deleting, deleteError }: Props) => {
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
      <div className="rounded-2xl border border-line bg-surface shadow-sm h-full w-full flex flex-col justify-center items-center gap-2 p-6 text-center">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-secondary" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
          <circle cx="12" cy="10" r="2.3" />
        </svg>
        <p className="font-medium">Select an activity</p>
        <p className="text-sm text-muted">Click one in the calendar or on the map to see photos, opening hours and notes.</p>
      </div>
    );
  }

  const photo = (
    <div className="relative hidden w-2/5 shrink-0 bg-canvas sm:block">
      {place?.photoUrl ? (
        // Google photo URLs are signed and short-lived, so next/image optimization isn't a fit.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={place.photoUrl} alt={place.name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-secondary/60">
          {status === "loading" ? (
            <span className="text-sm text-muted">Loading…</span>
          ) : (
            <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
              <circle cx="12" cy="10" r="2.3" />
            </svg>
          )}
        </div>
      )}
      {place?.photoAttribution && (
        <span className="absolute bottom-1.5 right-2 max-w-[90%] truncate text-[10px] text-white drop-shadow">
          Photo: {place.photoAttribution}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="min-w-0 flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold leading-tight tracking-tight">{place?.name ?? stop.name}</h2>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onEdit(stop.id)}
                title="Edit activity (or double-click it in the calendar)"
                className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(stop.id)}
                disabled={deleting}
                title="Delete activity (Backspace)"
                className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/50 dark:hover:text-red-300 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
          {deleteError && <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>}
          {(place?.category || place?.priceLevel) && (
            <p className="mt-0.5 text-sm font-medium text-muted">
              {[place.category, place.priceLevel].filter(Boolean).join(" · ")}
            </p>
          )}
          {place?.address && <p className="mt-0.5 text-sm text-muted">{place.address}</p>}
          {current && !place && !current.failed && (
            <p className="mt-0.5 text-sm text-muted">No location set for this activity.</p>
          )}
          {place?.rating != null && (
            <p className="mt-0.5 text-sm">
              ★ {place.rating.toFixed(1)}
              {place.ratingCount != null && <span className="text-muted"> ({place.ratingCount.toLocaleString("en-US")})</span>}
            </p>
          )}
        </div>

        {place?.businessStatus && place.businessStatus !== "OPERATIONAL" && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {place.businessStatus === "CLOSED_PERMANENTLY" ? "Permanently closed" : "Temporarily closed"}
            {" "}according to Google.
          </p>
        )}

        {place?.summary && <p className="text-sm text-muted">{place.summary}</p>}

        <NotesField
          key={stop.id}
          value={stop.description ?? ""}
          onSave={(text) => onDescriptionChange(stop.id, text)}
        />

        {status === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">Couldn&apos;t load place info from Google.</p>
        )}

        {place && <VisitHours place={place} stop={stop} />}

        {place?.phone && (
          <div className="text-sm">
            <h3 className="font-semibold">Phone</h3>
            <a href={place.phoneLink ?? undefined} className="text-primary hover:underline">
              {place.phone}
            </a>
            {place.reservable && <span className="text-muted"> · Takes reservations</span>}
          </div>
        )}

        {(place?.website || mapsLink) && (
          <div className="flex gap-4 text-sm text-primary">
            {place?.website && <a href={place.website} target="_blank" rel="noreferrer" className="hover:underline">Website</a>}
            {mapsLink && <a href={mapsLink} target="_blank" rel="noreferrer" className="hover:underline">Open in Google Maps</a>}
          </div>
        )}
      </div>

      {photo}
    </div>
  );
};

export default Details;
