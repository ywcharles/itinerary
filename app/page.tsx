import Link from "next/link";
import { APP_TAGLINE } from "@/lib/brand";
import CreateTripForm from "./components/start/CreateTripForm";
import JoinTripForm from "./components/start/JoinTripForm";
import RecentTrips from "./components/start/RecentTrips";
import RouteBackground from "./components/RouteBackground";
import PlannerSchematic from "./components/PlannerSchematic";

// A trip that's always there to try the planner with.
const EXAMPLE_TRIP = "/itinerary/toronto-4-days";


const features = [
  { icon: "🗓️", title: "A shared calendar", body: "Drag activities into time slots and resize them, like in Google Calendar." },
  { icon: "🗺️", title: "The route on the map", body: "Stops are pinned in order, with the walking or driving time between them." },
  { icon: "✨", title: "Ideas & AI review", body: "Fill gaps with open places nearby, or let Gemini review your day and suggest changes." },
  { icon: "📝", title: "Notes & details", body: "Opening hours, phone numbers for reservations, and notes for everyone." },
];

export default function Home() {
  return (
    // A faint route with numbered pins sits behind the page, full width.
    <div className="relative isolate flex flex-1 flex-col">
    <RouteBackground />
    <main id="main-content" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-10 sm:py-12">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-5">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{APP_TAGLINE}</h1>
          <CreateTripForm autoFocus />
          <p className="text-sm text-muted">
            Just looking?{" "}
            <Link href={EXAMPLE_TRIP} className="font-medium text-primary hover:underline">
              Explore an example trip to Toronto →
            </Link>
          </p>

          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <h2 className="shrink-0 text-xs font-semibold">Got a link from a friend?</h2>
            <div className="min-w-0 sm:flex-1 sm:max-w-sm">
              <JoinTripForm />
            </div>
          </div>
        </div>
        {/* A drawing of the planner, in front of the photo background. */}
        <PlannerSchematic />
      </section>

      <RecentTrips title="Pick up where you left off" />

      {/* What you get, one card per feature across the full width. */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <span className="text-2xl" aria-hidden>{icon}</span>
            <h2 className="mt-2 text-base font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </section>
    </main>
    </div>
  );
}
