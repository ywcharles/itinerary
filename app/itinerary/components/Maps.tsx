"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleLibrary } from "@/lib/googleMaps";
import { fetchLeg, formatDuration } from "@/lib/routes";
import { Stop } from "../data";

// Tailwind theme colors from globals.css (Google's pins can't read CSS variables).
const PRIMARY = "#2274A5";
const SECONDARY = "#80AB82";

type Props = {
  stops: Stop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  fallbackCenter: { lat: number; lng: number };
};

export default function Maps({ stops, selectedId, onSelect, fallbackCenter }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    let active = true;
    loadGoogleLibrary("maps").then(({ Map }) => {
      if (active && ref.current) {
        setMap(new Map(ref.current, {
          center: fallbackCenter,
          zoom: 13,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
          streetViewControl: false,
        }));
      }
    });
    return () => { active = false; };
    // The map is created once; later center changes go through fitBounds below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit the view to the shown stops whenever the set of stops changes (e.g. switching days).
  const stopsKey = stops.map((stop) => `${stop.id}@${stop.coordinates.lat},${stop.coordinates.lng}`).join("|");
  useEffect(() => {
    if (!map) return;
    if (stops.length === 0) {
      map.setCenter(fallbackCenter);
      map.setZoom(13);
    } else if (stops.length === 1) {
      map.setCenter(stops[0].coordinates);
      map.setZoom(15);
    } else {
      const bounds = new google.maps.LatLngBounds();
      stops.forEach((stop) => bounds.extend(stop.coordinates));
      map.fitBounds(bounds, 48);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, stopsKey]);

  // Routes between consecutive stops (1 -> 2 -> 3 ...) with a travel time label on each leg.
  useEffect(() => {
    if (!map || stops.length < 2) return;
    let active = true;
    const overlays: { setMap: (map: null) => void }[] = [];
    const labels: google.maps.marker.AdvancedMarkerElement[] = [];

    Promise.all([loadGoogleLibrary("marker"), ...stops.slice(1).map((stop, i) =>
      fetchLeg(stops[i].coordinates, stop.coordinates).catch((error) => {
        console.error("Route lookup failed", error);
        return undefined; // undefined = failed, null = same place
      }),
    )]).then(([{ AdvancedMarkerElement }, ...legs]) => {
      if (!active) return;
      legs.forEach((leg, i) => {
        const from = stops[i];
        const to = stops[i + 1];
        if (leg === null) return;

        // Fall back to a straight dashed line when no route could be computed.
        const path = leg?.path ?? [from.coordinates, to.coordinates];
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
        label.className = `rounded-full border bg-white px-2 py-0.5 text-xs font-medium shadow ${
          tooTight ? "border-red-500 text-red-600" : "border-primary text-primary"
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
  }, [map, stops]);

  // Numbered pins; the selected stop is larger and uses the primary color.
  useEffect(() => {
    if (!map) return;
    let active = true;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    loadGoogleLibrary("marker").then(({ AdvancedMarkerElement, PinElement }) => {
      if (!active) return;
      stops.forEach((stop, index) => {
        const selected = stop.id === selectedId;
        const pin = new PinElement({
          glyphText: String(index + 1),
          glyphColor: "#FFFFFF",
          background: selected ? PRIMARY : SECONDARY,
          borderColor: selected ? "#174E6F" : "#5E8A60",
          scale: selected ? 1.4 : 1.1,
        });
        const marker = new AdvancedMarkerElement({
          map,
          position: stop.coordinates,
          title: `${index + 1}. ${stop.name}`,
          content: pin,
          zIndex: selected ? 1000 : index,
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
  }, [map, stops, selectedId, onSelect]);

  return (
    <div
      ref={ref}
      aria-label="Itinerary map"
      className="h-full w-full overflow-hidden rounded-2xl"
    />
  );
}
