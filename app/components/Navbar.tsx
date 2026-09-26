"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

export default function Navbar() {
  const pathname = usePathname();
  const onCreatePage = pathname === "/itinerary";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="flex h-14 items-center justify-between gap-4 px-4"
      >
        <Link
          href="/"
          className="rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <Logo />
        </Link>
        <Link
          href="/itinerary"
          aria-current={onCreatePage ? "page" : undefined}
          className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          + New trip
        </Link>
      </nav>
    </header>
  );
}
