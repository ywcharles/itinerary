"use client";

import React, { useState } from "react";
import Details from "./components/Details";
import Maps from "./components/Maps";
import Schedule from "./components/Schedule";
import { mockStops, Stop } from "./data";

const Itinerary = () => {
  const [stops, setStops] = useState<Stop[]>(mockStops);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedStop = stops.find((stop) => stop.id === selectedId) ?? null;

  const updateDescription = (id: string, description: string) => {
    setStops((prev) =>
      prev.map((stop) => (stop.id === id ? { ...stop, description } : stop)),
    );
  };

  return (
    <div className="flex justify-center items-center h-screen w-full text-color gap-4 p-4">
      <div className="w-1/2 h-full flex items-center justify-center gap-4">
        <Schedule stops={stops} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <div className="w-1/2 h-full flex flex-col items-center justify-center gap-4">
        <Details stop={selectedStop} onDescriptionChange={updateDescription} />
        <Maps />
      </div>
    </div>
  );
};

export default Itinerary;
