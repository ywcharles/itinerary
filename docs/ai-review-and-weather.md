# Gemini day review and weather

## Configuration

Set `GEMINI_API_KEY` in `.env.local` or the deployment's server environment. The existing `GEMINI_API` name is also supported. Never prefix the key with `NEXT_PUBLIC_`.

The default model is `gemini-3.1-flash-lite`; override with `GEMINI_MODEL` if needed. Requests use the Gemini REST Generate Content API with a JSON Schema. API calls happen only when the traveler requests a review or an alternative, not when opening the panel. Gemini receives activity names, times, coordinates, preferences, available place candidates, travel/hour evidence and available weather. No database changes are made by the model.

The app's existing Google Maps JavaScript key must have Places and Routes access, as for the existing map and suggestions. Review still works with missing place evidence, but unknown routes can block acceptance. A failed Places search does not fabricate substitute places.

## User flow

1. Add at least one activity to the selected day, then choose **Review day**.
2. Optionally describe preferences and lock reservations or other fixed activities.
3. Request a review. Gemini returns an assessment and at most three independent suggestions: reschedule one existing activity or add one place from the fetched Google Places candidates.
4. **Preview** validates the visit and shows a dashed block in the existing calendar without saving. **Accept** rechecks the current itinerary, overlaps, locks, opening hours and actual routes before saving. **Dismiss** leaves the itinerary unchanged. **Something else** refines only that suggestion while retaining the others and the rejection history.
5. Accept multiple suggestions from the same review, one at a time. Each acceptance advances the review snapshot to that saved change and revalidates remaining suggestions against the updated schedule, without another Gemini call. Accepted activities are locked. Unrelated edits still require a fresh review. **Undo last AI change** reverses the most recent accepted change, provided the itinerary has not changed since.

Review preference/lock/rejection state is local to the open review panel. Accepted activities persist and sync through the existing Supabase realtime connection. Overnight activities are not automatically rescheduled. No bulk replace/delete or dependent multi-activity edits are supported in this first version.

## Validation and concurrency

Every review is tied to a full stop snapshot. The server reads canonical stops using the existing anonymous Supabase client and existing row-level permissions, then rejects stale snapshots. Model output is schema-checked and proposals that refer to unknown places, locked stops, overlaps or invalid times are omitted.

Acceptance refreshes all stops, verifies actual routes and regular weekly hours, refreshes again, then updates a single row with matching old field values. Updates return the saved row; no-row/permission failures cannot look successful. Undo also compares the whole snapshot and target fields. These guards detect ordinary collaborative edits, but they are not a serializable database transaction: an unrelated row can change between the final read and write. For strict cross-row guarantees, add a transactional Supabase RPC with a trip revision before introducing batch operations.

Regular opening hours do not establish holiday hours. Missing hours and location evidence are clearly identified during preview. Existing walking-or-driving routing behavior is retained; drive assumptions appear in validation details. Calendar times remain in the viewer's timezone, explicitly shown in the panel; destination-wide timezone selection remains a separate calendar improvement.

The review API accepts a maximum of 40 activities per day, bounded request size, at most 8 place candidates and 4 review requests per itinerary per minute per server instance. Production deployments should add a distributed rate limit and account-level quota controls; in-memory limits do not span instances. The app retains its existing shared-link/anonymous RLS access model.

## Weather

Weather appears only when the selected day has at least one activity with coordinates, near the first located activity. Changing day/location refreshes it. It is a forecast for that location, not the whole route if the day crosses cities.

The server calls Open-Meteo with `timezone=auto` and a 16-day forecast, caches responses for 30 minutes, and returns only the requested day's conditions, high/low Celsius temperatures and rain probability. Dates outside the returned range, historical days, missing values and service failures are explicitly labeled; they are never substituted with today's forecast or AI estimates. The destination timezone is displayed. No weather API key is needed for Open-Meteo's public non-commercial API; review its terms before commercial deployment.

## Validation

- `node --test tests/*.test.mjs`: deterministic proposal/forecast validation and mocked API integration, with no saved trip data sent to external services.
- `npm run lint`
- `npm run build -- --webpack` (supported alternative to Turbopack when its worker-port setup is blocked by the local environment).
- Live Open-Meteo checks with public Lisbon coordinates: available date, future out-of-range date, invalid coordinates.
- Live Gemini structured-output smoke test uses explicitly fictional activities only. No saved trip was submitted and no database writes were performed for testing.

Sources: https://ai.google.dev/gemini-api/docs/generate-content/structured-output and https://open-meteo.com/en/docs
