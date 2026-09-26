"use client";

import React, { useEffect, useState } from "react";
import {
  CATEGORIES,
  defaultCategory,
  fetchSuggestions,
  type Category,
  type Gap,
  type Suggestion,
} from "@/lib/suggestions";
import { formatTime } from "./Calendar/calendarUtils";

type Props = {
  gap: Gap;
  freeMinutes: number;
  // Place ids and lowercase names already in the trip, so they aren't suggested again.
  exclude: Set<string>;
  onAdd: (suggestion: Suggestion) => Promise<unknown>;
  onClose: () => void;
};

const timeRange = (start: string, end: string) => `${formatTime(new Date(start))} – ${formatTime(new Date(end))}`;

export default function Suggestions({ gap, freeMinutes, exclude, onAdd, onClose }: Props) {
  const [category, setCategory] = useState<Category>(() => defaultCategory(gap, freeMinutes));
  // Results are tagged with what they were fetched for, so stale ones never show.
  const [result, setResult] = useState<{ key: string; ideas: Suggestion[] | null } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const key = JSON.stringify([gap, category, [...exclude].sort()]);

  useEffect(() => {
    let active = true;
    fetchSuggestions(gap, category, exclude)
      .then((ideas) => active && setResult({ key, ideas }))
      .catch((error) => {
        console.error("Loading ideas failed", error);
        if (active) setResult({ key, ideas: null });
      });
    return () => { active = false; };
    // `key` includes locations and exclusions, so collaborative edits invalidate results.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = result?.key === key ? result : null;

  const add = async (idea: Suggestion) => {
    setAdding(idea.placeId);
    setAddError(null);
    try {
      await onAdd(idea);
    } catch (error) {
      console.error("Adding idea failed", error);
      setAddError("Couldn't add this place.");
      setAdding(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">Ideas for {timeRange(gap.start, gap.end)}</h2>
          <p className="truncate text-xs text-muted">
            Between {gap.from.name} and {gap.to.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ideas"
          className="shrink-0 rounded-md px-2 py-1 text-muted hover:bg-canvas hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-1.5 px-4 pt-3">
        {(Object.keys(CATEGORIES) as Category[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              c === category ? "border-primary bg-primary text-white" : "border-line text-muted hover:text-ink"
            }`}
          >
            {CATEGORIES[c].label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {addError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{addError}</p>}

        {!current && (
          <ul className="flex flex-col gap-2" aria-label="Loading ideas">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-[72px] animate-pulse rounded-xl bg-canvas" />
            ))}
          </ul>
        )}

        {current?.ideas === null && (
          <p className="text-sm text-red-600 dark:text-red-400">Couldn&apos;t load ideas right now.</p>
        )}

        {current?.ideas?.length === 0 && (
          <p className="text-sm text-muted">
            Nothing open nearby fits this gap. Try another category.
          </p>
        )}

        {current?.ideas && current.ideas.length > 0 && (
          <ul className="flex flex-col gap-2">
            {current.ideas.map((idea) => (
              <li key={idea.placeId} className="flex items-center gap-3 rounded-xl border border-line p-2">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-canvas">
                  {idea.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={idea.photoUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{idea.name}</p>
                  <p className="truncate text-xs text-muted">
                    {[
                      idea.rating != null &&
                        `★ ${idea.rating.toFixed(1)}${idea.ratingCount != null ? ` (${idea.ratingCount.toLocaleString("en-US")})` : ""}`,
                      idea.category,
                      idea.price,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="truncate text-xs text-muted">
                    ~{idea.walk.minutes} min walk from {idea.walk.near}
                    {idea.hours && ` · ${idea.hours}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => add(idea)}
                  disabled={adding !== null}
                  className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {adding === idea.placeId ? "Adding…" : `Add ${timeRange(idea.start, idea.end)}`}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
