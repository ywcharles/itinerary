import type { Metadata } from "next";
import ItineraryView from "./ItineraryView";
import { mockTrip } from "./data";

export const metadata: Metadata = {
  title: `Itinerary – ${mockTrip.name}`,
  description: `Shared day-by-day plan for the ${mockTrip.name} trip.`,
};

export default function Itinerary() {
  return <ItineraryView />;
}
