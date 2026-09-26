"use client";

import React, { useState } from "react";

// Copies the trip link so it can be sent to the people you travel with.
export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copying link failed", error);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-medium shadow-sm transition-colors hover:bg-canvas"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        {copied ? (
          <path d="M4 10.5l4 4 8-9" />
        ) : (
          <>
            <path d="M8.5 11.5a3.5 3.5 0 005 0l2.5-2.5a3.5 3.5 0 00-5-5l-1 1" />
            <path d="M11.5 8.5a3.5 3.5 0 00-5 0L4 11a3.5 3.5 0 005 5l1-1" />
          </>
        )}
      </svg>
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}
