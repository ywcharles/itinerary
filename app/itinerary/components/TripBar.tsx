"use client";

import Link from "next/link";
import React from "react";
import { Logo, LogoMark } from "@/app/components/Logo";
import ThemeToggle from "@/app/components/ThemeToggle";
import ShareButton from "./ShareButton";
import { formatDay } from "./Calendar/calendarUtils";

type Props = {
  tripName: string;
  // First and last day of the trip (YYYY-MM-DD).
  firstDay: string;
  lastDay: string;
  onReview: () => void;
  canReview: boolean;
};

// One compact bar for trip pages: app, trip name, dates and actions.
export default function TripBar({ tripName, firstDay, lastDay, onReview, canReview }: Props) {
  return (
    <header className="trip-header flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 max-md:h-14 md:gap-3 md:px-4">
      <Link href="/" aria-label="Home" className="shrink-0 rounded focus-visible:outline-2 focus-visible:outline-primary">
        {/* Phones: just the icon, so the trip name has room. */}
        <span className="md:hidden"><LogoMark /></span>
        <span className="max-md:hidden"><Logo /></span>
      </Link>
      <span className="h-5 w-px shrink-0 bg-line" aria-hidden />
      <h1 className="min-w-0 truncate text-base font-semibold tracking-tight md:text-lg">{tripName}</h1>

      <span className="shrink-0 text-sm text-muted max-md:hidden">
        {formatDay(firstDay, "short")}
        {lastDay !== firstDay && ` – ${formatDay(lastDay, "short")}`}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="group relative">
          <button
            type="button"
            onClick={() => { if (canReview) onReview(); }}
            aria-disabled={!canReview}
            aria-describedby="suggestions-help"
            aria-label="Need Suggestions?"
            className={`inline-flex h-8 items-center rounded-lg border border-line px-3 text-sm font-medium hover:bg-canvas max-md:w-8 max-md:justify-center max-md:px-0 ${canReview ? "" : "cursor-not-allowed opacity-40"}`}
          >
            ✦<span className="max-md:hidden">&nbsp;Need Suggestions?</span>
          </button>
          <div
            id="suggestions-help"
            role="tooltip"
            className="pointer-events-none invisible absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-line bg-surface p-3 text-left opacity-0 shadow-xl transition-all group-hover:visible group-hover:translate-y-0.5 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0.5 group-focus-within:opacity-100"
          >
            <div className="flex gap-2.5">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${canReview ? "bg-[#f4ece6] text-accent dark:bg-[#45301f]" : "bg-canvas text-muted"}`}>✦</span>
              <div>
                <p className="text-xs font-semibold text-ink">{canReview ? "Review this day" : "Suggestions aren’t ready yet"}</p>
                <p className="mt-0.5 text-xs font-normal leading-5 text-muted">
                  {canReview ? "Get thoughtful ideas based on your plans." : "Add at least 2 activities to this day to see suggestions."}
                </p>
              </div>
            </div>
          </div>
        </div>
        <Link
          href="/itinerary"
          aria-label="New trip"
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 max-md:w-8 max-md:justify-center max-md:px-0"
        >
          +<span className="max-md:hidden">&nbsp;New trip</span>
        </Link>
        <ShareButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
