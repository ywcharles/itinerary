"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const home = pathname === "/";
  return <header className={`site-header ${home ? "site-header-home" : ""}`}>
    {(home || pathname === "/itinerary") && <a href="#main-content" className="skip-link">Skip to content</a>}
    <nav aria-label="Main navigation" className="site-nav">
      <Link href="/" className="site-logo" aria-label="Itinerary home">itin<span>erary</span><i aria-hidden="true">↗</i></Link>
      {home && <div className="site-nav-links"><a href="#the-story">How it works</a><a href="#questions">A few questions</a></div>}
      <Link href="/itinerary" aria-current={pathname === "/itinerary" ? "page" : undefined} className="site-nav-create">Create itinerary <span aria-hidden="true">↗</span></Link>
    </nav>
  </header>;
}
