"use client";

import React, { useState } from "react";
import Calendar from "./Calendar/Calendar";
import AddEventDialog from "./AddEventDialog";
import { useStops } from "../hooks/useStops";

type Props = {
  itineraryId: string;
};

const Schedule = ({ itineraryId }: Props) => {
  const [isAdding, setIsAdding] = useState(false);
  const { stops, loading, error, addStop } = useStops(itineraryId);

  const nextStopOrder = stops.length
    ? Math.max(...stops.map((s) => s.stop_order)) + 1
    : 1;

  return (
    <div className="rounded-2xl border h-full w-full flex flex-col p-4">
      <button
        onClick={() => setIsAdding(true)}
        className="rounded-xl bg-secondary w-full h-10 flex justify-center items-center text-white"
      >
        Add
      </button>

      <div className="w-full flex-1 mt-4 min-h-0">
        <Calendar stops={stops} loading={loading} error={error} />
      </div>

      {isAdding && (
        <AddEventDialog
          itineraryId={itineraryId}
          nextStopOrder={nextStopOrder}
          onAdd={addStop}
          onClose={() => setIsAdding(false)}
        />
      )}
    </div>
  );
};

export default Schedule;