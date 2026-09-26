import Link from "next/link";
import { LogoMark } from "./components/Logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const features = [
  {
    title: "One shared calendar",
    body: "Drag activities into time slots, move them around, and see the whole day at a glance.",
  },
  {
    title: "The route on the map",
    body: "Every stop is pinned in order, with the walking or driving time between them.",
  },
  {
    title: "Notes for the group",
    body: "Leave details for your travel buddies: bookings, meeting points, what to bring.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12 px-6 py-16">
      <section className="flex flex-col items-start gap-5">
        <LogoMark className="h-12 w-12" />
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          {APP_TAGLINE}
        </h1>
        <p className="max-w-xl text-lg text-muted">
          {APP_NAME} combines Google Maps and a calendar, so everyone on the trip knows where to be,
          when, and how long it takes to get there.
        </p>
        <Link
          href="/itinerary"
          className="rounded-xl bg-primary px-5 py-3 font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
        >
          Start planning a trip
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map(({ title, body }) => (
          <div key={title} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
