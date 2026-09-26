import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import CreateItinerary from "./CreateItinerary";

export const metadata: Metadata = {
  title: "Create itinerary",
};

// Always show the current list of trips.
export const dynamic = "force-dynamic";

export default async function CreateItineraryPage() {
  const { data } = await supabase
    .from("itinerary")
    .select("link_slug")
    .order("created_at", { ascending: false });

  return <CreateItinerary existing={data ?? []} />;
}
