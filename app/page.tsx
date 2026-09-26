import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import CreateTripForm from "./components/start/CreateTripForm";
import JoinTripForm from "./components/start/JoinTripForm";
import RecentTrips from "./components/start/RecentTrips";
import TravelCollage from "./components/TravelCollage";
import LandingStory from "./components/LandingStory";

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
    <main id="main-content" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-12 sm:py-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-5">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{APP_TAGLINE}</h1>
          <p className="max-w-xl text-lg text-muted">
            {APP_NAME} puts your group&apos;s plan on one calendar and one map, so everyone knows where to be,
            when, and how long it takes to get there.
          </p>
          <CreateTripForm autoFocus />
          <p className="text-sm text-muted">
            Just looking?{" "}
            <Link href={EXAMPLE_TRIP} className="font-medium text-primary hover:underline">
              Explore an example trip to Toronto →
            </Link>
            {" · "}
            <a href="#the-story" className="font-medium text-primary hover:underline">
              See how it works ↓
            </a>
          </p>
        </div>
        <TravelCollage />
      </section>

      <RecentTrips title="Pick up where you left off" />

      <LandingStory>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <span className="text-xl" aria-hidden>{icon}</span>
            <h2 className="mt-2 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Got a link from a friend?</h2>
          <p className="text-sm text-muted">Paste it to join their trip.</p>
        </div>
        <div className="sm:w-96">
          <JoinTripForm />
        </div>
      </section>
      </LandingStory>
    </main>
  );
}
