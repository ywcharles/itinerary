"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { forgetTrip, parseRecentTrips, recentTripsSnapshot, subscribeRecentTrips } from "@/lib/recentTrips";

// Trips created or opened in this browser. Renders nothing until there are some.
export default function RecentTrips({ title = "Your trips" }: { title?: string }) {
  const snapshot = useSyncExternalStore(subscribeRecentTrips, recentTripsSnapshot, () => "[]");
  const trips = useMemo(() => parseRecentTrips(snapshot), [snapshot]);
  if (trips.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted">{title}</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip) => (
          <li key={trip.slug} className="group relative">
            <Link
              href={`/itinerary/${trip.slug}`}
              className="block rounded-xl border border-line bg-surface px-4 py-3 pr-9 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="block truncate font-medium">{trip.name}</span>
              <span className="block truncate text-xs text-muted">/itinerary/{trip.slug}</span>
            </Link>
            <button
              type="button"
              onClick={() => forgetTrip(trip.slug)}
              aria-label={`Remove ${trip.name} from this list`}
              title="Remove from this list"
              className="absolute right-2 top-2 rounded px-1.5 text-xs text-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100 focus:opacity-100 max-md:opacity-100"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
