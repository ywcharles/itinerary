import React from "react";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Details from "../components/Details";
import Maps from "../components/Maps";
import Schedule from "../components/Schedule";

// NOTE: this assumes the route folder is renamed to something like
// app/itinerary/[slug]/page.tsx so `params.slug` is available. Swap this
// for however you currently identify "which itinerary" if that's not the
// case yet — see the message below the code for a simpler alternative.
type Props = {
  params: Promise<{ slug: string }>;
};

const Itinerary = async ({ params }: Props) => {
  const { slug } = await params;

  const { data: itinerary, error } = await supabase
    .from("itinerary")
    .select("id")
    .eq("link_slug", slug)
    .single();

  if (error || !itinerary) {
    notFound();
  }

  return (
    <div className="flex justify-center items-center h-screen w-full text-color gap-4 p-4">
      <div className="w-1/2 h-full flex items-center justify-center gap-4">
        <Schedule itineraryId={itinerary.id} />
      </div>
      <div className="w-1/2 h-full flex flex-col items-center justify-center gap-4">
        <Details />
        <Maps />
      </div>
    </div>
  );
};

export default Itinerary;