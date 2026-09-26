import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

// Keep Google's place names, opening hours and map labels in the same language as the UI.
export const LANGUAGE = "en";

let configured = false;

export function loadGoogleLibrary<L extends Parameters<typeof importLibrary>[0]>(library: L) {
  if (!configured) {
    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, language: LANGUAGE });
    configured = true;
  }
  return importLibrary(library);
}
