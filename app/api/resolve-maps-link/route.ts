import type { NextRequest } from "next/server";
import { asMapsUrl, isShortMapsLink } from "@/lib/mapsLink";

const MAX_REDIRECTS = 5;

/**
 * Expands a Google Maps short link (maps.app.goo.gl/…) to the full place URL.
 * Browsers can't read cross-origin redirects, so this follows them server-side.
 * Only Google Maps hosts are ever requested.
 */
export async function GET(request: NextRequest) {
  const start = asMapsUrl(request.nextUrl.searchParams.get("url") ?? "");
  if (!start || !isShortMapsLink(start)) {
    return Response.json({ error: "Not a Google Maps short link." }, { status: 400 });
  }

  let current = start;
  for (let hop = 0; hop < MAX_REDIRECTS && isShortMapsLink(current); hop++) {
    const res = await fetch(current, { redirect: "manual" });
    const location = res.headers.get("location");
    if (!location) break;

    let next = new URL(location, current);
    // Consent interstitials carry the real target in ?continue=.
    if (next.hostname.startsWith("consent.")) {
      next = new URL(next.searchParams.get("continue") ?? "", next);
    }
    const allowed = asMapsUrl(next.href);
    if (!allowed) {
      return Response.json({ error: "Link doesn't lead to Google Maps." }, { status: 422 });
    }
    current = allowed;
  }

  if (isShortMapsLink(current)) {
    return Response.json({ error: "Couldn't expand this link." }, { status: 422 });
  }
  return Response.json({ url: current.href });
}
