"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/itinerary", label: "Create Itinerary" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-black/15 bg-white
    ">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4"
      >
        <Link
          href="/"
          className="rounded text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary"
        >
          <span className="text-secondary"></span>itinerary
        </Link>
        <ul className="flex flex-wrap items-center gap-2">
          {links.map(({ href, label }) => {
            const isActive =
              pathname === href ||
              (href !== "/" && pathname.startsWith(`${href}/`));

            return (
              <li key={label}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary"
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
