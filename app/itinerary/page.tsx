"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateItinerary() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !name.trim()) return;
    setPending(true);
    setError("");
    try {
      const slugBase = name.trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "our-trip";
      const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
      const { supabase } = await import("@/lib/supabase");
      const { error: createError } = await supabase.from("itinerary").insert({ link_slug: slug });
      if (createError) throw createError;
      router.push(`/itinerary/${slug}`);
    } catch {
      setError("We couldn’t create your itinerary just yet. Please try again in a moment.");
      setPending(false);
    }
  }

  return <main id="main-content" className="mx-auto w-full max-w-lg px-6 py-16 sm:py-24">
    <p className="mb-5 text-xs tracking-[0.18em] text-accent uppercase">Every good trip starts somewhere</p>
    <h1 className="text-4xl font-medium tracking-tight text-[#233e45]">What’s your next chapter?</h1>
    <p className="mt-5 leading-7 text-[#657477]">Give your trip a name. We’ll make a shared place for your stops, your time slots, and your people.</p>
    <form onSubmit={create} className="mt-9 space-y-5">
      <div><label htmlFor="trip-name" className="mb-2 block text-sm font-medium text-[#233e45]">Trip name</label><input id="trip-name" name="trip-name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="A long weekend in Lisbon" autoComplete="off" className="w-full rounded-lg border border-[#d6e0d8] px-4 py-3.5 text-base outline-offset-4 focus:outline-primary" /></div>
      <p className="text-xs leading-5 text-[#657477]">Anyone you share the link with can access this itinerary.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={pending || !name.trim()} className="flex w-full items-center justify-between rounded-lg bg-primary px-5 py-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Creating your itinerary…" : "Create itinerary"}<span aria-hidden="true">↗</span></button>
    </form>
    <Link href="/" className="mt-7 inline-block text-sm text-[#657477] hover:text-primary">← Back to the beginning</Link>
  </main>;
}
