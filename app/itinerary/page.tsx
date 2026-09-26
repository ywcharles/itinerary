import React from "react";
import Details from "./components/Details";
import Maps from "./components/Maps";
import Schedule from "./components/Schedule";

type Props = {};

const Itinerary = (props: Props) => {
  return (
    <div className="flex justify-center items-center h-screen w-full text-color gap-4 p-4 pt-20">
      <div className="w-1/2 h-full flex items-center justify-center gap-4">
        <Schedule />
      </div>
      <div className="w-1/2 h-full flex flex-col items-center justify-center gap-4">
        <Details />
        <Maps />
      </div>
    </div>
  );
};

export default Itinerary;
