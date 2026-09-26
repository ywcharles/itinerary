import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configured = false;

export function loadGoogleLibrary<L extends Parameters<typeof importLibrary>[0]>(library: L) {
  if (!configured) {
    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY });
    configured = true;
  }
  return importLibrary(library);
}
