"use client";

import React, { useEffect, useState } from "react";
import { loadGoogleLibrary } from "@/lib/googleMaps";
import { Stop } from "../data";

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
  const cached = placeCache.get(stop.id);
  if (cached) return cached;

  const request = loadGoogleLibrary("places").then(async ({ Place }) => {
    const { places } = await Place.searchByText({
      textQuery: stop.name,
      locationBias: { center: stop.coordinates, radius: 1000 },
      maxResultCount: 1,
      fields: [
        "displayName",
        "formattedAddress",
        "photos",
        "regularOpeningHours",
        "rating",
        "userRatingCount",
        "websiteURI",
        "googleMapsURI",
      ],
    });
    const place = places[0];
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
  request.catch(() => placeCache.delete(stop.id));
  placeCache.set(stop.id, request);
  return request;
}

type Props = {
  stop: Stop | null;
  onDescriptionChange: (id: string, description: string) => void;
};

const Details = ({ stop, onDescriptionChange }: Props) => {
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
    // Only refetch when a different stop is selected, not when its description is edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop?.id]);

  const current = result && stop && result.stopId === stop.id ? result : null;
  const place = current?.place ?? null;
  const status = !current ? "loading" : current.failed ? "error" : "idle";

  if (!stop) {
    return (
      <div className="rounded-2xl bg-secondary h-1/2 w-full flex justify-center items-center text-white">
        Click an activity to see its details
      </div>
    );
  }

  return (
    <div className="rounded-2xl border h-1/2 w-full overflow-auto">
      <div className="relative h-40 w-full bg-secondary">
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

      <div className="p-4 flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">{place?.name ?? stop.name}</h2>
          {place?.address && <p className="text-sm text-gray-500">{place.address}</p>}
          {place?.rating != null && (
            <p className="text-sm">
              ★ {place.rating.toFixed(1)}
              {place.ratingCount != null && <span className="text-gray-500"> ({place.ratingCount})</span>}
            </p>
          )}
        </div>

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

        {place && (place.website || place.mapsUrl) && (
          <div className="flex gap-4 text-sm text-primary">
            {place.website && <a href={place.website} target="_blank" rel="noreferrer">Website</a>}
            {place.mapsUrl && <a href={place.mapsUrl} target="_blank" rel="noreferrer">Open in Google Maps</a>}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Notes for the group</span>
          <textarea
            value={stop.description}
            onChange={(e) => onDescriptionChange(stop.id, e.target.value)}
            placeholder="e.g. Book a table in advance, meet at the entrance…"
            rows={3}
            className="rounded-lg border p-2 text-sm resize-y"
          />
        </label>
      </div>
    </div>
  );
};

export default Details;
