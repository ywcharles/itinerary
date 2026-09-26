"use client";

import { useEffect, useRef } from "react";
import { loadGoogleLibrary } from "@/lib/googleMaps";

export default function Maps() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    loadGoogleLibrary("maps").then(({ Map }) => {
      if (active && ref.current) {
        new Map(ref.current, { center: { lat: 20, lng: 0 }, zoom: 2, mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID });
      }
    });
    return () => { active = false; };
  }, []);

  return (
    <div
      ref={ref}
      aria-label="Itinerary map"
      className="h-1/2 min-h-64 w-full overflow-hidden rounded-2xl"
    />
  );
}
