"use client";

import React, { useEffect, useState } from "react";
import {
  CATEGORIES,
  defaultCategory,
  fetchPersonalized,
  fetchSuggestions,
  type Category,
  type Gap,
  type PersonalizedIdeas,
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

const WISH_EXAMPLES: Record<Category, string> = {
  food: "e.g. sushi, vegan, cheap eats",
  coffee: "e.g. matcha, quiet place to read",
  sights: "e.g. modern art, great views",
  outdoors: "e.g. by the water, dog-friendly",
};

export default function Suggestions({ gap, freeMinutes, exclude, onAdd, onClose }: Props) {
  const [category, setCategory] = useState<Category>(() => defaultCategory(gap, freeMinutes));
  // The wish being typed, and the one the shown ideas are personalized for.
  const [draft, setDraft] = useState("");
  const [wish, setWish] = useState("");
  // Results are tagged with what they were fetched for, so stale ones never show.
  const [result, setResult] = useState<{ key: string; data: PersonalizedIdeas | null } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const key = `${gap.start}|${gap.end}|${category}|${wish}`;

  useEffect(() => {
    let active = true;
    const load: Promise<PersonalizedIdeas> = wish
      ? fetchPersonalized(gap, category, wish, exclude)
      : fetchSuggestions(gap, category, exclude).then((ideas) => ({ ideas, note: null, ranked: true }));
    load
      .then((data) => active && setResult({ key, data }))
      .catch((error) => {
        console.error("Loading ideas failed", error);
        if (active) setResult({ key, data: null });
      });
    return () => { active = false; };
    // `key` covers the gap, category and wish; `exclude` only matters on a fresh fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const switchCategory = (c: Category) => {
    // A wish like "sushi" belongs to one category; start fresh in the next.
    setCategory(c);
    setWish("");
    setDraft("");
  };

  const personalize = (e: React.FormEvent) => {
    e.preventDefault();
    setWish(draft.trim().slice(0, 120));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = result?.key === key ? result : null;
  type Idea = PersonalizedIdeas["ideas"][number];

  const add = async (idea: Idea | Suggestion) => {
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
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        {/* One line: the time plus where the gap is, cut off with "…" when too long. */}
        <h2
          className="min-w-0 truncate text-sm font-semibold"
          title={`Between ${gap.from.name} and ${gap.to.name}`}
        >
          Ideas for {timeRange(gap.start, gap.end)}
          <span className="font-normal text-muted"> · between {gap.from.name} and {gap.to.name}</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ideas"
          className="shrink-0 rounded-md px-2 py-1 text-muted hover:bg-canvas hover:text-ink"
        >
          ✕
        </button>
      </div>

      {/* Category chips and the personalize field share one row. */}
      <div className="flex items-center gap-1.5 px-4 pt-2.5">
        {(Object.keys(CATEGORIES) as Category[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => switchCategory(c)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              c === category ? "border-primary bg-primary text-white" : "border-line text-muted hover:text-ink"
            }`}
          >
            {CATEGORIES[c].label}
          </button>
        ))}

      <form onSubmit={personalize} className="ml-1 flex min-w-0 flex-1 gap-1.5">
        <div className="relative min-w-0 flex-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={120}
            placeholder={`✨ Personalize: ${WISH_EXAMPLES[category]}`}
            aria-label="Personalize ideas"
            className="w-full rounded-lg border border-line bg-surface py-1 pl-2.5 pr-7 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {(draft || wish) && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                setWish("");
              }}
              aria-label="Clear personalization"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1 text-xs text-muted hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!draft.trim() || draft.trim() === wish}
          className="shrink-0 rounded-lg border border-line px-2.5 text-xs font-medium transition-colors hover:bg-canvas disabled:opacity-40"
        >
          Go
        </button>
      </form>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {addError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{addError}</p>}
        {current?.data?.note && <p className="mb-2 text-sm text-muted">{current.data.note}</p>}
        {current?.data && !current.data.ranked && (
          <p className="mb-2 text-xs text-muted">Showing matches for “{wish}” (personal ranking is unavailable right now).</p>
        )}

        {!current && wish && <p className="mb-2 text-xs text-muted">Finding the best matches for “{wish}”…</p>}
        {!current && (
          <ul className="flex flex-col gap-2" aria-label="Loading ideas">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-[72px] animate-pulse rounded-xl bg-canvas" />
            ))}
          </ul>
        )}

        {current?.data === null && (
          <p className="text-sm text-red-600 dark:text-red-400">Couldn&apos;t load ideas right now.</p>
        )}

        {current?.data?.ideas.length === 0 && !current.data.note && (
          <p className="text-sm text-muted">
            {wish ? `No open places matching “${wish}” fit this gap.` : "Nothing open nearby fits this gap."} Try another category.
          </p>
        )}

        {current?.data && current.data.ideas.length > 0 && (
          <ul className="flex flex-col gap-2">
            {current.data.ideas.map((idea) => (
              <li
                key={idea.placeId}
                className={`flex items-center gap-3 rounded-xl border p-2 ${
                  idea.topPick ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-line"
                }`}
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-canvas">
                  {idea.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={idea.photoUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="flex items-center gap-1.5 font-medium">
                    <span className="truncate">{idea.name}</span>
                    {idea.topPick && (
                      <span className="shrink-0 rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-white">
                        Top pick
                      </span>
                    )}
                  </p>
                  {idea.reason && <p className="text-xs text-ink">{idea.reason}</p>}
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
