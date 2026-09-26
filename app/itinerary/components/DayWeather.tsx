"use client";

import { useEffect, useState } from "react";
import type { DayWeather as Forecast } from "@/lib/weather";
import type { Stop } from "../types";

export default function DayWeather({ day, location }: { day: string; location: Stop }) {
  const [result, setResult] = useState<{ key: string; data?: Forecast; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const key = `${day}|${location.latitude}|${location.longitude}`;
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ day, lat: String(location.latitude), lon: String(location.longitude) });
    fetch(`/api/weather?${params}`, { signal: controller.signal })
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error); return data as Forecast; })
      .then((data) => setResult({ key, data }))
      .catch((error) => { if (!controller.signal.aborted) setResult({ key, error: error.message }); });
    return () => controller.abort();
  }, [day, location.latitude, location.longitude, key, retry]);
  const current = result?.key === key ? result : null;
  const forecast = current?.data;
  return <section aria-label={`Weather near ${location.name} on ${day}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line bg-canvas px-3 py-2 text-xs">
    <div className="min-w-0"><span className="font-medium">Weather · {day}</span><span className="ml-2 text-muted">Near {location.name}</span></div>
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      {!current && <span className="text-muted">Fetching forecast…</span>}
      {current?.error && <><span className="text-muted">{current.error}</span><button type="button" onClick={() => setRetry((n) => n + 1)} className="underline">Retry</button></>}
      {forecast && <><span>{forecast.description}</span>{forecast.status === "available" && <><span className="font-medium">{Math.round(forecast.high!)}° / {Math.round(forecast.low!)}°C</span>{forecast.rainChance !== null && <span>{forecast.rainChance}% rain</span>}</>}<span className="text-muted">{forecast.timezone.replaceAll("_", " ")}</span></>}
    </div>
    <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="ml-auto text-muted underline">Open-Meteo</a>
  </section>;
}
