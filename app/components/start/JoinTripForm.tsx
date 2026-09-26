"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

// Accepts a full trip link (…/itinerary/<slug>) or just the slug.
function slugFrom(text: string) {
  const value = text.trim();
  const fromLink = value.match(/\/itinerary\/([^/?#\s]+)/)?.[1];
  const slug = fromLink ?? value;
  return /^[a-z0-9-]{1,60}$/i.test(slug) ? slug.toLowerCase() : null;
}

export default function JoinTripForm() {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [error, setError] = useState(false);

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = slugFrom(link);
    if (!slug) {
      setError(true);
      return;
    }
    router.push(`/itinerary/${slug}`);
  };

  return (
    <form onSubmit={join} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setError(false);
          }}
          placeholder="Paste a trip link from a friend"
          aria-label="Trip link"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={!link.trim()}
          className="shrink-0 rounded-lg border border-line bg-surface px-3 text-sm font-medium transition-colors hover:bg-canvas disabled:opacity-40"
        >
          Open
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">That doesn&apos;t look like a trip link.</p>}
    </form>
  );
}
