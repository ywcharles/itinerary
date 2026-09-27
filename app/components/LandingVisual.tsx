import Image from "next/image";
import coastalDay from "@/public/images/coastal-day.png";

function Pin({ number, className }: { number: number; className: string }) {
  return (
    <span
      className={`absolute z-20 grid h-8 w-8 place-items-center rounded-full border-[3px] border-white bg-primary text-xs font-bold text-white shadow-lg ${className}`}
    >
      {number}
    </span>
  );
}

export default function LandingVisual() {
  return (
    <div className="relative mx-auto min-h-[390px] w-full max-w-[620px] sm:min-h-[500px] lg:min-h-[570px]" aria-label="An illustrated coastal trip with a planned route">
      <div className="absolute inset-x-[5%] bottom-[2%] top-[2%] overflow-hidden rounded-[44%_44%_2rem_2rem] border-[6px] border-white bg-[#dce9ec] shadow-[0_32px_80px_-34px_rgba(27,73,71,0.55)] ring-1 ring-line dark:border-[#20292d]">
        <Image
          src={coastalDay}
          alt="Three friends walking toward a sunny Mediterranean coastal village"
          fill
          preload
          sizes="(max-width: 1024px) 92vw, 48vw"
          className="object-cover object-[48%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#173841]/65 via-transparent to-white/5" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-white sm:p-8">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-white/75">A DAY BY THE SEA</p>
            <p className="mt-1 font-serif text-2xl italic sm:text-3xl">Leave room for wonder.</p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/60 bg-white/15 text-lg backdrop-blur-sm">↗</span>
        </div>
      </div>

      <svg
        viewBox="0 0 620 570"
        className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full sm:block"
        aria-hidden="true"
      >
        <path
          d="M118 342 C 173 308, 192 366, 255 315 S 356 207, 433 220 S 495 174, 512 119"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="3 10"
          opacity="0.9"
        />
      </svg>
      <Pin number={1} className="bottom-[32%] left-[17%] hidden sm:grid" />
      <Pin number={2} className="right-[29%] top-[34%] hidden sm:grid" />
      <Pin number={3} className="right-[11%] top-[15%] hidden sm:grid" />

      <div className="absolute -left-1 bottom-[8%] z-30 flex max-w-[230px] items-center gap-3 rounded-2xl border border-white/70 bg-white/90 p-3.5 text-[#233e45] shadow-[0_18px_45px_-18px_rgba(35,62,69,0.5)] backdrop-blur-md sm:-left-4 sm:bottom-[13%] sm:p-4 dark:border-line dark:bg-surface/90 dark:text-ink">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef4ee] text-secondary dark:bg-[#253a28]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M5 4v3M19 4v3M4 9h16M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z" />
            <path d="M8 13h3v3H8z" />
          </svg>
        </span>
        <span>
          <span className="block font-mono text-[9px] tracking-[0.14em] text-muted">10:30 AM · STOP 02</span>
          <strong className="mt-0.5 block text-sm font-semibold">Seaside market</strong>
          <span className="mt-0.5 block text-[11px] text-muted">12 min walk to lunch</span>
        </span>
      </div>

      <div className="absolute right-0 top-[5%] z-30 grid h-[92px] w-[92px] rotate-6 place-items-center rounded-full border border-accent/50 bg-canvas/90 text-center text-accent shadow-sm backdrop-blur-sm sm:-right-1 sm:h-[108px] sm:w-[108px]">
        <span className="absolute inset-[7px] rounded-full border border-dashed border-accent/40" />
        <p className="relative font-mono text-[8px] leading-[1.7] tracking-[0.14em] sm:text-[9px]">
          READY · SET
          <strong className="block font-sans text-[11px] tracking-[0.1em] sm:text-xs">WANDER</strong>
          TOGETHER
        </p>
      </div>
    </div>
  );
}
