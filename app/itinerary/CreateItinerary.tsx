"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  existing: { link_slug: string }[];
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function CreateItinerary({ existing }: Props) {
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
    const taken = new Set(existing.map((it) => it.link_slug));
    const slug = taken.has(base) ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base;

    const { error: insertError } = await supabase.from("itinerary").insert({ link_slug: slug });
    if (insertError) {
      console.error("Creating itinerary failed", insertError);
      setError(`Couldn't create the trip: ${insertError.message}`);
      setCreating(false);
      return;
    }
    router.push(`/itinerary/${slug}`);
  };

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-10 flex flex-col gap-8">
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Plan a new trip</h1>
        <p className="text-sm text-muted">
          Give your trip a name. You&apos;ll get a link you can share with the people you travel with.
        </p>
        <form onSubmit={create} className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ottawa weekend"
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create trip"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {name.trim() && slugify(name) && (
          <p className="text-xs text-muted">Link: /itinerary/{slugify(name)}</p>
        )}
      </section>

      {existing.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">Existing trips</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {existing.map(({ link_slug }) => (
              <li key={link_slug}>
                <Link
                  href={`/itinerary/${link_slug}`}
                  className="block rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="font-medium">{link_slug.replace(/-/g, " ")}</span>
                  <span className="block text-xs text-muted">/itinerary/{link_slug}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
