import React from "react";
import Calendar from "./Calendar/Calendar";
import { Stop } from "../data";

type Props = {
  stops: Stop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const Schedule = ({ stops, selectedId, onSelect }: Props) => {
  return (
    <div className="rounded-2xl border h-full w-full flex flex-col p-4">
      <button className="rounded-xl bg-secondary w-full h-10 flex justify-center items-center">
        Add
      </button>

      <div className="w-full flex-1 mt-4 min-h-0">
        <Calendar stops={stops} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </div>
  );
};

export default Schedule;