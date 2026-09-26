import React from "react";
import Calendar from "./Calendar/Calendar";

const Schedule = () => {
  return (
    <div className="rounded-2xl border h-full w-full flex flex-col p-4">
      <button className="rounded-xl bg-secondary w-full h-10 flex justify-center items-center">
        Add
      </button>

      <div className="w-full flex-1 mt-4 min-h-0">
        <Calendar />
      </div>
    </div>
  );
};

export default Schedule;