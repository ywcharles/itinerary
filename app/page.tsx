import type { Metadata } from "next";
import LandingStory from "./components/LandingStory";

export const metadata: Metadata = {
  title: "Itinerary — A little planning. A lot of possibility.",
  description: "Bring your places, your people, and your next great day together on one shared map and itinerary.",
};

export default function Home() {
  return <LandingStory />;
}
