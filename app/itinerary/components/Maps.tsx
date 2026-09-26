"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleLibrary } from "@/lib/googleMaps";
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

  // Route line connecting the stops in time order.
  useEffect(() => {
    if (!map || stops.length < 2) return;
    const line = new google.maps.Polyline({
      map,
      path: stops.map((stop) => stop.coordinates),
      strokeColor: PRIMARY,
      strokeOpacity: 0.7,
      strokeWeight: 3,
    });
    return () => line.setMap(null);
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
