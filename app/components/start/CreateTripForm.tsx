"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { rememberTrip } from "@/lib/recentTrips";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const input =
  "rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

// Name -> new trip -> straight into the planner.
export default function CreateTripForm({
  autoFocus = false,
  variant = "default",
}: {
  autoFocus?: boolean;
  variant?: "default" | "hero";
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = slugify(name);
    if (!base) {
      setError("Give the trip a name with at least one letter or number.");
      return;
    }
    setCreating(true);
    setError(null);

    // The slug is the shareable link; add a short suffix if the name is already taken.
    const { data: taken } = await supabase.from("itinerary").select("id").eq("link_slug", base).limit(1);
    // A double dash separates a collision suffix from the human-readable name.
    // The suffix stays in the shareable URL but is never shown as part of the trip title.
    const slug = taken?.length ? `${base}--${Math.random().toString(36).slice(2, 6)}` : base;

    const { error: insertError } = await supabase.from("itinerary").insert({ link_slug: slug });
    if (insertError) {
      console.error("Creating itinerary failed", insertError);
      setError(`Couldn't create the trip: ${insertError.message}`);
      setCreating(false);
      return;
    }
    rememberTrip(slug, name.trim());
    router.push(`/itinerary/${slug}`);
  };

  const hero = variant === "hero";

  return (
    <form onSubmit={create} className={`flex w-full flex-col ${hero ? "gap-3" : "gap-2"}`}>
      <div className={`flex flex-col ${hero ? "gap-2.5 sm:flex-row" : "gap-2 sm:flex-row"}`}>
        <input
          autoFocus={autoFocus}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Trip name, e.g. Toronto weekend"
          aria-label="Trip name"
          required
          className={hero
            ? "min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-canvas/70 px-4 py-3 text-base outline-none transition-shadow placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
            : `${input} min-w-0 flex-1`}
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className={hero
            ? "min-h-12 shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(34,116,165,0.9)] transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:translate-y-0 disabled:opacity-50"
            : "rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"}
        >
          {creating ? "Creating…" : "Start planning →"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
