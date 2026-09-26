// A faint, hand-drawn-looking route with numbered pins behind the landing page:
// the same visual language as the app's map (dashed route, numbered stops), kept quiet so text stays first.

// Positions in % of the page. Pins sit near the edges so they never sit behind the headline or form.
const PINS: { x: number; y: number; n: number; primary?: boolean }[] = [
  { x: 6, y: 16, n: 1, primary: true },
  { x: 88, y: 9, n: 2 },
  { x: 95, y: 52, n: 3 },
  { x: 70, y: 94, n: 4 },
  { x: 5, y: 78, n: 5 },
];

// Through the pins: over the top, down the right side, back along the bottom and up the left.
const ROUTE =
  "M -3 21 C 2 14, 4 17, 6 16 S 30 3, 50 6 S 80 13, 88 9 S 101 26, 98 38 S 92 47, 95 52 " +
  "S 97 76, 87 84 S 74 95, 70 94 S 50 85, 36 91 S 11 92, 5 78 S 2 58, -3 54";

export default function RouteBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden max-md:hidden">
      {/* The line stretches to the page's shape; non-scaling strokes keep it and its dashes even. */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-primary">
        <path
          d={ROUTE}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="2 12"
          vectorEffect="non-scaling-stroke"
          opacity="0.3"
        />
      </svg>

      {/* Pins are regular elements so they keep their shape at any page size. */}
      {PINS.map(({ x, y, n, primary }) => (
        <svg
          key={n}
          viewBox="0 0 30 40"
          className="absolute h-10 w-[30px] -translate-x-1/2 -translate-y-full opacity-55"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <path
            d="M15 39 C 11 32, 1 24, 1 15 a 14 14 0 1 1 28 0 C 29 24, 19 32, 15 39 Z"
            fill={primary ? "var(--color-primary)" : "var(--color-secondary)"}
          />
          <text x="15" y="20" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">
            {n}
          </text>
        </svg>
      ))}
    </div>
  );
}
