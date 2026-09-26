import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ItineraryView from "../ItineraryView";

type Props = {
  params: Promise<{ slug: string }>;
};

// The itinerary table has no name column yet, so the trip is named after its link slug.
function tripNameFromSlug(slug: string) {
  const words = decodeURIComponent(slug).replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = tripNameFromSlug(slug);
  return {
    title: `Itinerary – ${name}`,
    description: `Shared day-by-day plan for ${name}.`,
  };
}

export default async function Itinerary({ params }: Props) {
  const { slug } = await params;

  const { data: itinerary, error } = await supabase
    .from("itinerary")
    .select("id")
    .eq("link_slug", slug)
    .single();

  if (error || !itinerary) {
    notFound();
  }

  return <ItineraryView itineraryId={itinerary.id} tripName={tripNameFromSlug(slug)} />;
}
