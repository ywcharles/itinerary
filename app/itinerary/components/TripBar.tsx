"use client";

import Link from "next/link";
import React from "react";
import { Logo } from "@/app/components/Logo";
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
    <header className="trip-header relative flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-3 lg:flex-nowrap lg:py-2">
      <Link href="/" className="shrink-0 rounded focus-visible:outline-2 focus-visible:outline-primary">
        <Logo />
      </Link>
      <span className="hidden h-5 w-px shrink-0 bg-line lg:block" aria-hidden />
      <div className="w-full min-w-0 lg:w-auto lg:flex-none lg:shrink">
        <h1 className="break-words text-lg font-semibold tracking-tight lg:truncate">{tripName}</h1>
        <p className="text-xs text-muted lg:hidden">{formatDay(firstDay, "short")}{lastDay !== firstDay && ` – ${formatDay(lastDay, "short")}`}</p>
      </div>

      <span className="hidden shrink-0 text-sm text-muted lg:block">
        {formatDay(firstDay, "short")}
        {lastDay !== firstDay && ` – ${formatDay(lastDay, "short")}`}
      </span>

      <div className="grid w-full grid-cols-3 items-center gap-2 lg:ml-auto lg:flex lg:w-auto lg:shrink-0">
        <button type="button" onClick={onReview} disabled={!canReview} title={canReview ? "Review the selected day with Gemini" : "Add an activity to this day first"} className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-sm font-medium hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40">✦ Review day</button>
        <Link
          href="/itinerary"
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          + New trip
        </Link>
        <ShareButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
