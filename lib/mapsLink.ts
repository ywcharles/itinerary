type LatLng = { lat: number; lng: number };

export type ParsedMapsLink = {
  placeId: string | null;
  name: string | null;
  coordinates: LatLng | null;
  query: string | null;
};

// google.com, google.de, google.co.uk, google.com.au, … plus the short-link hosts.
const MAPS_HOST = /^(www\.|maps\.)?google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$|^maps\.app\.goo\.gl$|^goo\.gl$/;

/** The URL if the text is a Google Maps link, otherwise null. */
export function asMapsUrl(text: string): URL | null {
  try {
    const url = new URL(text.trim());
    if (!/^https?:$/.test(url.protocol) || !MAPS_HOST.test(url.hostname)) return null;
    if (url.hostname === "goo.gl" && !url.pathname.startsWith("/maps")) return null;
    // google.com/maps/..., maps.google.com/..., or a short link
    if (url.hostname.endsWith("goo.gl") || url.hostname.startsWith("maps.") || url.pathname.startsWith("/maps")) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

/** Short share links (maps.app.goo.gl/…) only reveal the place after a redirect. */
export function isShortMapsLink(url: URL) {
  return url.hostname.endsWith("goo.gl");
}

function parseLatLng(text: string | null): LatLng | null {
  const match = text?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

const decodeSegment = (segment: string) => decodeURIComponent(segment.replace(/\+/g, " "));

/**
 * Pulls whatever identifies the place out of a full Google Maps URL:
 * - ?query_place_id=… (Maps URLs API)
 * - /maps/place/<name>/@lat,lng…!3d<lat>!4d<lng> (shared place links; !3d!4d is the pin, @ is the view)
 * - ?q=… / ?query=… / /maps/search/<text> (search links, possibly "lat,lng")
 */
export function parseMapsUrl(url: URL): ParsedMapsLink {
  const params = url.searchParams;
  const placeId = params.get("query_place_id");

  const placeName = url.pathname.match(/\/maps\/place\/([^/]+)/)?.[1];
  const searchText = url.pathname.match(/\/maps\/search\/([^/]+)/)?.[1];
  const name = placeName ? decodeSegment(placeName) : null;

  const pin = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const view = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const rawQuery = params.get("query") ?? params.get("q") ?? (searchText ? decodeSegment(searchText) : null);

  const coordinates = pin
    ? { lat: Number(pin[1]), lng: Number(pin[2]) }
    : parseLatLng(rawQuery) ?? parseLatLng(name) ?? (view ? { lat: Number(view[1]), lng: Number(view[2]) } : null);
  const query = rawQuery && !parseLatLng(rawQuery) ? rawQuery : null;

  return { placeId, name: name && !parseLatLng(name) ? name : null, coordinates, query };
}
