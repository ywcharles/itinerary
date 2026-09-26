"use client";

import { useEffect, useState } from "react";
import { fetchLeg, Leg } from "@/lib/routes";
import type { Stop } from "../types";
import { coordinatesOf } from "../stopUtils";

export type TravelLeg = {
  from: Stop;
  to: Stop;
  leg: Leg;
  // Minutes between the end of `from` and the start of `to`.
  gapMinutes: number;
};

/**
 * Travel between consecutive located stops (in the given order), the same legs the map draws.
 * Route lookups are cached in lib/routes, so sharing them with the map costs no extra API calls.
 */
export function useTravelLegs(stops: Stop[]): TravelLeg[] {
  const located = stops.filter((stop) => coordinatesOf(stop));
  // Only recompute when something the legs depend on changes (not e.g. notes).
  const key = located
    .map((s) => `${s.id}|${s.latitude},${s.longitude}|${s.start_time}|${s.end_time}`)
    .join(";");

  const [result, setResult] = useState<{ key: string; legs: TravelLeg[] }>({ key: "", legs: [] });

  useEffect(() => {
    if (located.length < 2) return;
    let active = true;
    const pairs = located.slice(1).map((to, i) => ({ from: located[i], to }));
    Promise.all(
      pairs.map(({ from, to }) =>
        fetchLeg(coordinatesOf(from)!, coordinatesOf(to)!).catch(() => null),
      ),
    ).then((legs) => {
      if (!active) return;
      setResult({
        key,
        legs: pairs.flatMap(({ from, to }, i) => {
          const leg = legs[i];
          if (!leg) return [];
          const gapMinutes =
            (new Date(to.start_time).getTime() - new Date(from.end_time).getTime()) / 60000;
          return [{ from, to, leg, gapMinutes }];
        }),
      });
    });
    return () => { active = false; };
    // `key` captures everything the legs depend on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Stale results from a previous set of stops are never shown.
  return result.key === key ? result.legs : [];
}
