"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleLibrary } from "@/lib/googleMaps";
import { useTheme } from "@/app/components/ThemeToggle";
import { fetchLeg, formatDuration } from "@/lib/routes";
import type { Stop } from "../types";
import { coordinatesOf, LatLng } from "../stopUtils";

// Tailwind theme colors from globals.css (Google's pins can't read CSS variables).
const PRIMARY = "#2274A5";
const SECONDARY = "#80AB82";

type Props = {
  stops: Stop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  // Called with the Google place id when a landmark on the map is clicked.
  onPlaceClick: (placeId: string) => void;
};

type Located = { stop: Stop; number: number; position: LatLng };

// World view until the itinerary has located stops.
const WORLD = { center: { lat: 20, lng: 0 }, zoom: 2 };

export default function Maps({ stops, selectedId, onSelect, onPlaceClick }: Props) {
  // Numbers follow the calendar order; stops without coordinates keep their number but get no pin.
  // Keyed on the fields the map uses, so editing a stop's notes doesn't redraw routes and pins.
  const mapKey = stops
    .map((s) => `${s.id}|${s.name}|${s.latitude},${s.longitude}|${s.start_time}|${s.end_time}`)
    .join(";");
  const located = useMemo<Located[]>(
    () =>
      stops.flatMap((stop, index) => {
        const position = coordinatesOf(stop);
        return position ? [{ stop, number: index + 1, position }] : [];
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapKey],
  );

  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const theme = useTheme();

  // Google only sets the color scheme when a map is created, so switching themes creates a new map
  // (pins, routes and the view are then redrawn by the effects below).
  useEffect(() => {
    let active = true;
    loadGoogleLibrary("maps").then(({ Map }) => {
      if (active && ref.current) {
        setMap(new Map(ref.current, {
          ...WORLD,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
          streetViewControl: false,
          colorScheme: theme === "dark" ? "DARK" : "LIGHT",
        }));
      }
    });
    return () => { active = false; };
  }, [theme]);

  // Clicking one of Google's landmarks adds it as an activity instead of opening Google's info window.
  const onPlaceClickRef = useRef(onPlaceClick);
  useEffect(() => {
    onPlaceClickRef.current = onPlaceClick;
  });
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
      if (!("placeId" in e) || !e.placeId) return;
      e.stop();
      onPlaceClickRef.current(e.placeId);
    });
    return () => listener.remove();
  }, [map]);

  // Fit the view to the shown stops whenever the set of stops changes (e.g. switching days).
  useEffect(() => {
    if (!map) return;
    if (located.length === 0) {
      map.setCenter(WORLD.center);
      map.setZoom(WORLD.zoom);
    } else if (located.length === 1) {
      map.setCenter(located[0].position);
      map.setZoom(15);
    } else {
      const bounds = new google.maps.LatLngBounds();
      located.forEach(({ position }) => bounds.extend(position));
      map.fitBounds(bounds, 48);
    }
  }, [map, located]);

  // Routes between consecutive stops (1 -> 2 -> 3 ...) with a travel time label on each leg.
  useEffect(() => {
    if (!map || located.length < 2) return;
    let active = true;
    const overlays: { setMap: (map: null) => void }[] = [];
    const labels: google.maps.marker.AdvancedMarkerElement[] = [];

    Promise.all([loadGoogleLibrary("marker"), ...located.slice(1).map((to, i) =>
      fetchLeg(located[i].position, to.position).catch((error) => {
        console.error("Route lookup failed", error);
        return undefined; // undefined = failed, null = same place
      }),
    )]).then(([{ AdvancedMarkerElement }, ...legs]) => {
      if (!active) return;
      legs.forEach((leg, i) => {
        const from = located[i].stop;
        const to = located[i + 1].stop;
        if (leg === null) return;

        // Fall back to a straight dashed line when no route could be computed.
        const path = leg?.path ?? [located[i].position, located[i + 1].position];
        const dotted = !leg || leg.mode === "WALKING";
        overlays.push(new google.maps.Polyline({
          map,
          path,
          strokeColor: PRIMARY,
          strokeOpacity: dotted ? 0 : 0.8,
          strokeWeight: 4,
          icons: dotted
            ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, scale: 3 }, offset: "0", repeat: "12px" }]
            : undefined,
        }));
        if (!leg) return;

        // Flag legs that take longer than the gap between the two activities.
        const gapMinutes = (new Date(to.start_time).getTime() - new Date(from.end_time).getTime()) / 60000;
        const tooTight = leg.durationMinutes > gapMinutes;

        const label = document.createElement("div");
        label.className = `rounded-full border bg-surface px-2 py-0.5 text-xs font-medium shadow ${
          tooTight ? "border-red-500 text-red-600 dark:text-red-400" : "border-primary text-primary"
        }`;
        label.textContent = `${leg.mode === "WALKING" ? "🚶" : "🚗"} ${formatDuration(leg.durationMinutes)}`;
        label.title = tooTight
          ? `Travel takes ${formatDuration(leg.durationMinutes)} but there are only ${Math.max(0, Math.round(gapMinutes))} min between these activities`
          : `${(leg.distanceMeters / 1000).toFixed(1)} km`;
        // Center the label on the route's midpoint instead of anchoring it above.
        label.style.transform = "translateY(50%)";

        labels.push(new AdvancedMarkerElement({
          map,
          position: path[Math.floor(path.length / 2)],
          content: label,
          zIndex: 500,
        }));
      });
    });

    return () => {
      active = false;
      overlays.forEach((overlay) => overlay.setMap(null));
      labels.forEach((label) => { label.map = null; });
    };
  }, [map, located]);

  // Numbered pins; the selected stop is larger and uses the primary color.
  useEffect(() => {
    if (!map) return;
    let active = true;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    loadGoogleLibrary("marker").then(({ AdvancedMarkerElement, PinElement }) => {
      if (!active) return;
      located.forEach(({ stop, number, position }) => {
        const selected = stop.id === selectedId;
        const pin = new PinElement({
          glyphText: String(number),
          glyphColor: "#FFFFFF",
          background: selected ? PRIMARY : SECONDARY,
          borderColor: selected ? "#174E6F" : "#5E8A60",
          scale: selected ? 1.4 : 1.1,
        });
        const marker = new AdvancedMarkerElement({
          map,
          position,
          title: `${number}. ${stop.name}`,
          content: pin,
          zIndex: selected ? 1000 : number,
          gmpClickable: true,
        });
        marker.addEventListener("gmp-click", () => onSelect(stop.id));
        markers.push(marker);
      });
    });
    return () => {
      active = false;
      markers.forEach((marker) => { marker.map = null; });
    };
  }, [map, located, selectedId, onSelect]);

  return (
    <div
      ref={ref}
      aria-label="Itinerary map"
      className="h-full w-full overflow-hidden rounded-2xl border border-line shadow-sm"
    />
  );
}
