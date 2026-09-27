## Tripcident
Tripcident turns group-chat chaos into a trip plan everyone can edit: calendar and map in one, real travel times, and AI suggestions for spots open when you're free.


## What It Does

Tripcident allows users to create and manage travel itineraries in one centralized location.

Travelers can:

- Create and organize travel itineraries
- Add destinations and activities
- Schedule events and manage trip details
- View real places and routes on an interactive map
- Check travel times between stops
- View weather forecasts
- Share itineraries through unique links
- Get personalized suggestions from AI


## Google Maps

The itinerary page loads a basic Google Maps JavaScript map. Add this to `.env.local`:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Enable the Maps JavaScript API and billing in the key's Google Cloud project.
Restrict this browser key to your website origins (including localhost for development)
and to the Maps JavaScript API. Restart the dev server after setting the key.

The map starts with a world view; itinerary locations, pins, and routes can be added later.
