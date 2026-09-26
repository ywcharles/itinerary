import { APP_NAME } from "@/lib/brand";

// A route woven between three stops, in the theme colors.
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#2274A5" />
      <path
        d="M8 22c3-8 6 2 9-5s5-6 7-7"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="0.1 4"
      />
      <circle cx="8" cy="22" r="2.6" fill="#80AB82" stroke="#FFFFFF" strokeWidth="1.4" />
      <circle cx="17" cy="17" r="2.6" fill="#80AB82" stroke="#FFFFFF" strokeWidth="1.4" />
      <circle cx="24" cy="10" r="2.6" fill="#FFFFFF" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
    </span>
  );
}
