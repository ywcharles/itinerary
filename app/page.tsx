import Navbar from "@/app/components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold">Home Page</h1>
      </main>
    </>
  );
}
