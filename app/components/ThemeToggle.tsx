"use client";

import { useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme";

export function useTheme(): Theme {
  // The server doesn't know the theme; the init script has already set it before hydration.
  return useSyncExternalStore(subscribeTheme, getTheme, () => "light");
}

export default function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink transition-colors hover:bg-canvas"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {theme === "dark" ? (
          // Sun: go light
          <>
            <circle cx="10" cy="10" r="3.5" />
            <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.3 4.3l1.1 1.1M14.6 14.6l1.1 1.1M4.3 15.7l1.1-1.1M14.6 5.4l1.1-1.1" />
          </>
        ) : (
          // Moon: go dark
          <path d="M16.5 12.2A6.5 6.5 0 017.8 3.5a6.5 6.5 0 108.7 8.7z" />
        )}
      </svg>
    </button>
  );
}
