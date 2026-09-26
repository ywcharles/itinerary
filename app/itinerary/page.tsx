import type { Metadata } from "next";
import CreateTripForm from "../components/start/CreateTripForm";
import JoinTripForm from "../components/start/JoinTripForm";
import RecentTrips from "../components/start/RecentTrips";

export const metadata: Metadata = {
  title: "New trip",
};

export default function NewTripPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Plan a new trip</h1>
        <p className="text-sm text-muted">
          Give it a name and you&apos;ll get a link to share with the people you travel with.
        </p>
        <CreateTripForm autoFocus />
      </section>

      <RecentTrips />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Join a trip</h2>
        <JoinTripForm />
      </section>
    </main>
  );
}
