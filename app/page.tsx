import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import CreateTripForm from "./components/start/CreateTripForm";
import JoinTripForm from "./components/start/JoinTripForm";
import RecentTrips from "./components/start/RecentTrips";

// A trip that's always there to try the planner with.
const EXAMPLE_TRIP = "/itinerary/toronto-4-days";

const steps = [
  { title: "Create a trip", body: "Give it a name and you're in the planner. No sign-up." },
  { title: "Share the link", body: "Everyone with the link plans along: same calendar, same map." },
  { title: "Plan together", body: "Add places, drag them into time slots, leave notes for the group." },
];

const features = [
  { icon: "🗓️", title: "A shared calendar", body: "Drag activities into time slots and resize them, like in Google Calendar." },
  { icon: "🗺️", title: "The route on the map", body: "Stops are pinned in order, with the walking or driving time between them." },
  { icon: "✨", title: "Ideas for free time", body: "Got a gap? Get open places nearby that fit it, or ask for “sushi”." },
  { icon: "📝", title: "Notes & details", body: "Opening hours, phone numbers for reservations, and notes for everyone." },
];

// Pastel stops, a route and travel times: a small picture of the planner.
function PlannerPreview() {
  const stops = [
    { time: "9:00", name: "St. Lawrence Market", color: 1, top: 8, height: 64 },
    { time: "11:00", name: "Distillery District", color: 2, top: 96, height: 56 },
    { time: "1:00", name: "PAI · Thai lunch", color: 3, top: 176, height: 44 },
  ];
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md rounded-2xl border border-line bg-surface p-4 shadow-xl">
      <div className="mb-3 flex items-center gap-1.5 text-xs">
        <span className="rounded-md bg-canvas px-2 py-1 font-medium">Day 1 · Fri</span>
        <span className="px-2 py-1 text-muted">Day 2 · Sat</span>
        <span className="px-2 py-1 text-muted">Day 3 · Sun</span>
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <div className="relative h-60 border-l border-line">
          {stops.map((s) => (
            <div
              key={s.name}
              className="absolute left-1.5 right-0 rounded px-1.5 py-1 text-[10px] leading-tight"
              style={{ top: s.top, height: s.height, backgroundColor: `var(--pastel-${s.color}-bg)`, color: `var(--pastel-${s.color}-text)` }}
            >
              <span className="font-semibold">{s.name}</span>
              <span className="block opacity-75">{s.time}</span>
            </div>
          ))}
          <span className="absolute right-0 top-[76px] text-[9px] text-muted">🚶 16 min</span>
          <span className="absolute right-0 top-[156px] text-[9px] text-muted">🚗 12 min</span>
          <span className="absolute left-1.5 top-[226px] rounded-full border border-dashed border-line px-1.5 text-[9px] text-muted">
            ✨ Ideas for this gap
          </span>
        </div>
        <div className="relative h-60 overflow-hidden rounded-xl bg-canvas">
          <svg viewBox="0 0 160 240" className="absolute inset-0 h-full w-full">
            <path d="M20 40 H70 V110 H140" fill="none" stroke="var(--line)" strokeWidth="6" />
            <path d="M40 0 V240 M0 160 H160" fill="none" stroke="var(--line)" strokeWidth="4" />
            <path d="M34 58 C60 70, 70 110, 104 120 S 120 176, 96 196" fill="none" stroke="#2274A5" strokeWidth="2.5" strokeDasharray="5 5" />
            {[
              [34, 58, 1],
              [104, 120, 2],
              [96, 196, 3],
            ].map(([x, y, n]) => (
              <g key={n}>
                <circle cx={x} cy={y} r="9" fill={n === 1 ? "#2274A5" : "#80AB82"} stroke="#fff" strokeWidth="2" />
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{n}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-12 sm:py-16">
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
          </p>
        </div>
        <PlannerPreview />
      </section>

      <RecentTrips title="Pick up where you left off" />

      <section className="grid gap-4 sm:grid-cols-3">
        {steps.map(({ title, body }, index) => (
          <div key={title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {index + 1}
            </span>
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-0.5 text-sm text-muted">{body}</p>
            </div>
          </div>
        ))}
      </section>

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
    </main>
  );
}
u