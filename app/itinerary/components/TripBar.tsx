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
};

// One compact bar for trip pages: app, trip name, dates and actions.
export default function TripBar({ tripName, firstDay, lastDay }: Props) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 md:gap-3 md:px-4">
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
