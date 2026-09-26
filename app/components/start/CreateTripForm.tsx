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

function firstOfNextMonth() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

const input =
  "rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

// Name (and optional start date) -> new trip -> straight into the planner.
export default function CreateTripForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  // Prefilled with the 1st of next month, a typical "next trip" date; can be changed or cleared.
  const [start, setStart] = useState(firstOfNextMonth);
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
    const slug = taken?.length ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base;

    const { error: insertError } = await supabase.from("itinerary").insert({ link_slug: slug });
    if (insertError) {
      console.error("Creating itinerary failed", insertError);
      setError(`Couldn't create the trip: ${insertError.message}`);
      setCreating(false);
      return;
    }
    rememberTrip(slug, name.trim());
    // The start date only decides which day the empty planner opens on.
    router.push(`/itinerary/${slug}${start ? `?start=${start}` : ""}`);
  };

  return (
    <form onSubmit={create} className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          autoFocus={autoFocus}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Trip name, e.g. Toronto weekend"
          aria-label="Trip name"
          className={`${input} min-w-0 flex-1`}
        />
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          aria-label="First day (optional)"
          title="First day (optional)"
          className={`${input} sm:w-40`}
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Start planning →"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
