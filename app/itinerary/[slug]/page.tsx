import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ItineraryView from "../ItineraryView";

type Props = {
  params: Promise<{ slug: string }>;
  // ?start=YYYY-MM-DD: the day a new, still empty trip opens on.
  searchParams: Promise<{ start?: string | string[] }>;
};

// The itinerary table has no name column yet, so the trip is named after the readable
// part of its link slug. A double dash marks a generated collision suffix.
function tripNameFromSlug(slug: string) {
  const readableSlug = decodeURIComponent(slug).split("--", 1)[0];
  const words = readableSlug.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = tripNameFromSlug(slug);
  return {
    title: name,
    description: `Shared day-by-day plan for ${name}.`,
  };
}

export default async function Itinerary({ params, searchParams }: Props) {
  const { slug } = await params;
  const { start } = await searchParams;
  const startDay = typeof start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : null;

  const { data: itinerary, error } = await supabase
    .from("itinerary")
    .select("id")
    .eq("link_slug", slug)
    .single();

  if (error || !itinerary) {
    notFound();
  }

  return (
    <ItineraryView
      itineraryId={itinerary.id}
      slug={slug}
      tripName={tripNameFromSlug(slug)}
      startDay={startDay}
    />
  );
}
