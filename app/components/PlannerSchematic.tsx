// A drawn (not screenshotted) preview of the planner for the landing page:
// calendar with travel times, the route on the map, and a details card. Always crisp, never stale.

// Positions are % of the 9 AM – 4 PM grid (one hour = 1/7).
const STOPS = [
  { n: 1, name: "St. Lawrence Market", time: "9:00 – 10:00 AM", top: 0.5, height: 14, color: 1 },
  { n: 2, name: "The Distillery District", time: "11:00 AM – 12:30 PM", top: 28.6, height: 21, color: 2 },
  { n: 3, name: "PAI · Thai lunch", time: "1:00 – 2:00 PM", top: 57.1, height: 14, color: 3 },
  { n: 4, name: "CN Tower", time: "2:30 – 4:00 PM", top: 78.6, height: 21, color: 4 },
];

const HOURS = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM"];

export default function PlannerSchematic() {
  return (
    <div
      aria-hidden
      className="w-full overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]"
    >
      {/* Trip bar */}
      <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-[11px]">
        <span className="h-3.5 w-3.5 rounded bg-primary" />
        <span className="font-semibold">Toronto weekend</span>
        <span className="text-muted">Fri, Oct 2 – Sun, Oct 4</span>
      </div>

      <div className="grid grid-cols-[1.15fr_1fr] gap-2 bg-canvas p-2">
        {/* Calendar */}
        <div className="rounded-lg border border-line bg-surface p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold">Friday, October 2</span>
            <span className="rounded bg-canvas px-1.5 py-0.5 text-[9px] text-muted">⛅ 20° / 14°</span>
          </div>
          <div className="mb-2 flex gap-1 rounded-md bg-canvas p-0.5 text-[9px]">
            <span className="rounded bg-surface px-1.5 py-0.5 font-medium shadow-sm">Day 1</span>
            <span className="px-1.5 py-0.5 text-muted">Day 2</span>
            <span className="px-1.5 py-0.5 text-muted">Day 3</span>
          </div>
          <div className="relative ml-7 h-56 border-l border-line pl-1">
            {HOURS.map((h, i) => (
              <div key={h} className="absolute left-0 right-0 border-t border-line/70" style={{ top: `${(i / HOURS.length) * 100}%` }}>
                <span className="absolute -left-0.5 -top-1.5 -translate-x-full pr-1 text-[8px] text-muted">{h}</span>
              </div>
            ))}
            {STOPS.map((s) => (
              <div
                key={s.n}
                className="absolute left-1.5 right-0.5 rounded-[3px] px-1.5 py-0.5 leading-tight"
                style={{
                  top: `${s.top}%`,
                  height: `${s.height}%`,
                  backgroundColor: `var(--pastel-${s.color}-bg)`,
                  color: `var(--pastel-${s.color}-text)`,
                  boxShadow: s.n === 1 ? "0 0 0 1.5px var(--color-primary)" : undefined,
                }}
              >
                <span className="block truncate text-[9px] font-semibold">{s.n}. {s.name}</span>
                <span className="block truncate text-[8px] opacity-75">{s.time}</span>
              </div>
            ))}
            <span className="absolute right-1 top-[19%] text-[8px] text-muted">🚶 16 min</span>
            <span className="absolute left-2 top-[18.5%] rounded-full border border-dashed border-line bg-surface px-1.5 text-[8px] text-muted">
              ✨ Ideas for this gap
            </span>
            <span className="absolute right-1 top-[51%] text-[8px] text-muted">🚗 12 min</span>
            <span className="absolute right-1 top-[72.5%] text-[8px] text-muted">🚶 13 min</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {/* Map */}
          <div className="relative h-36 overflow-hidden rounded-lg border border-line bg-[#e9ece6] dark:bg-[#1f2629]">
            <svg viewBox="0 0 200 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <path d="M0 40 H200 M0 96 H200 M52 0 V140 M130 0 V140" stroke="var(--color-surface)" strokeWidth="7" />
              <path d="M0 18 L200 60 M0 124 L200 82" stroke="var(--color-surface)" strokeWidth="3" opacity="0.8" />
              <path d="M150 104 Q175 118 200 110 V140 H120 Q135 118 150 104Z" fill="#b9d4e6" opacity="0.7" />
              <rect x="64" y="50" width="52" height="34" rx="4" fill="#cfe0c7" opacity="0.8" />
              <path d="M168 26 C140 34, 120 40, 104 56 S 70 80, 56 92 S 64 112, 92 118" fill="none" stroke="#2274A5" strokeWidth="2.2" strokeDasharray="5 4" />
              {[
                [168, 26, 1, true],
                [104, 56, 2, false],
                [56, 92, 3, false],
                [92, 118, 4, false],
              ].map(([x, y, n, active]) => (
                <g key={String(n)}>
                  <circle cx={Number(x)} cy={Number(y)} r="7" fill={active ? "#2274A5" : "#80AB82"} stroke="#fff" strokeWidth="1.8" />
                  <text x={Number(x)} y={Number(y) + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">{n}</text>
                </g>
              ))}
            </svg>
            <span className="absolute left-1.5 top-1.5 rounded bg-surface px-1.5 py-0.5 text-[8px] font-medium shadow-sm">Map</span>
          </div>

          {/* Details card */}
          <div className="flex-1 rounded-lg border border-line bg-surface p-2">
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] font-semibold leading-tight">St. Lawrence Market</span>
              <span className="rounded border border-line px-1 text-[8px] text-muted">Edit</span>
            </div>
            <p className="text-[8px] text-muted">Market · ★ 4.6 (43,774)</p>
            <p className="mt-1 text-[8px] font-semibold">Notes for the group</p>
            <p className="mt-0.5 rounded border border-line px-1 py-0.5 text-[8px] text-muted">Peameal bacon sandwiches at Carousel Bakery 🥪</p>
            <p className="mt-1 text-[8px] font-semibold">Opening hours · Fri</p>
            <p className="text-[8px]">9:00 AM – 7:00 PM</p>
            <span className="mt-0.5 inline-block rounded-full bg-ok-bg px-1.5 text-[8px] font-medium text-ok-text">
              Open during your visit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
