import Link from "next/link";
import CreateTripForm from "./components/start/CreateTripForm";
import JoinTripForm from "./components/start/JoinTripForm";
import RecentTrips from "./components/start/RecentTrips";
import LandingVisual from "./components/LandingVisual";

const EXAMPLE_TRIP = "/itinerary/toronto-4-days";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1z" />
      <path d="M8 12h3v3H8zM14 12h2M14 16h2" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 19c2-6 4 1 7-5s3-7 6-9" strokeDasharray="2.5 3" />
      <circle cx="5" cy="19" r="2.2" />
      <circle cx="13" cy="13" r="2.2" />
      <path d="M21 5c0 1.4-2 3.8-2 3.8S17 6.4 17 5a2 2 0 114 0z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7z" />
      <path d="M19 16c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" />
    </svg>
  );
}

const features = [
  {
    icon: <CalendarIcon />,
    tone: "bg-[#e8f1f6] text-primary dark:bg-[#213447]",
    title: "Shape the day",
    body: "Put every plan on a shared, flexible calendar.",
  },
  {
    icon: <RouteIcon />,
    tone: "bg-[#edf3e9] text-[#567d58] dark:bg-[#253a28] dark:text-[#9dcba0]",
    title: "See the journey",
    body: "Keep stops, routes, and travel time on one map.",
  },
  {
    icon: <SparkleIcon />,
    tone: "bg-[#f4ece6] text-accent dark:bg-[#45301f] dark:text-[#f3d2bd]",
    title: "Discover the in-between",
    body: "Find thoughtful ideas that fit the gaps in your day.",
  },
];

export default function Home() {
  return (
    <div className="relative isolate flex flex-1 flex-col overflow-x-clip">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 8% 12%, color-mix(in srgb, var(--color-secondary) 16%, transparent) 0, transparent 25%), radial-gradient(circle at 92% 18%, color-mix(in srgb, var(--color-primary) 13%, transparent) 0, transparent 28%)",
        }}
      />

      <main id="main-content" className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-5 py-8 sm:px-8 sm:py-10 lg:gap-12 lg:px-10 lg:py-12">
        <section className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <div className="relative z-10 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.13em] text-accent shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              A LITTLE PLANNING, A LOT OF POSSIBILITY
            </div>

            <h1 className="mt-6 max-w-2xl text-[clamp(2.8rem,6vw,5.25rem)] font-medium leading-[0.98] tracking-[-0.055em] text-ink">
              Make a plan worth <span className="font-serif font-normal italic text-primary">getting lost</span> in.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Bring your places, people, and plans together on one beautiful map and calendar—then leave a little room for the unexpected.
            </p>

            <div className="mt-7 w-full max-w-2xl rounded-3xl border border-line bg-surface/90 p-4 shadow-[0_22px_55px_-32px_rgba(29,42,51,0.45)] backdrop-blur sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Where should the story begin?</p>
                  <p className="mt-0.5 text-xs text-muted">Give your trip a name. That&apos;s all you need.</p>
                </div>
                <span className="hidden rounded-full bg-ok-bg px-2.5 py-1 text-[10px] font-medium text-ok-text sm:inline">No account needed</span>
              </div>
              <CreateTripForm autoFocus variant="hero" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <Link href={EXAMPLE_TRIP} className="font-medium text-primary underline-offset-4 hover:underline">
                Explore a Toronto trip <span aria-hidden="true">↗</span>
              </Link>
              <span className="hidden h-1 w-1 rounded-full bg-line sm:block" />
              <span>Share one link with everyone</span>
            </div>
          </div>

          <LandingVisual />
        </section>

        <section aria-labelledby="features-title" className="rounded-[2rem] border border-line bg-surface/75 p-4 shadow-[0_20px_60px_-45px_rgba(29,42,51,0.55)] backdrop-blur sm:p-5">
          <h2 id="features-title" className="sr-only">Everything for a thoughtful day</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {features.map(({ icon, tone, title, body }) => (
              <article key={title} className="flex items-start gap-3 rounded-2xl p-3.5 transition-colors hover:bg-canvas/70 sm:p-4">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
                  <span className="h-5 w-5">{icon}</span>
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <RecentTrips title="Pick up where you left off" />

        <section className="grid items-center gap-4 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-[1fr_minmax(0,25rem)] sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8f1f6] text-primary dark:bg-[#213447]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 12h8M13 9l3 3-3 3" />
                <path d="M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-semibold">Joining someone else?</h2>
              <p className="text-xs text-muted">Paste the trip link they shared with you.</p>
            </div>
          </div>
          <JoinTripForm />
        </section>
      </main>
    </div>
  );
}
