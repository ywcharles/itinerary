"use client";

import { useEffect, useState } from "react";
import type { DayWeather as Forecast } from "@/lib/weather";
import type { Stop } from "../types";

export default function DayWeather({ day, location }: { day: string; location?: Stop }) {
  const [result, setResult] = useState<{ key: string; data?: Forecast; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const key = `${day}|${location?.latitude}|${location?.longitude}`;
  useEffect(() => {
    if (location?.latitude == null || location?.longitude == null) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ day, lat: String(location?.latitude), lon: String(location?.longitude) });
    fetch(`/api/weather?${params}`, { signal: controller.signal })
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error); return data as Forecast; })
      .then((data) => setResult({ key, data }))
      .catch((error) => { if (!controller.signal.aborted) setResult({ key, error: error.message }); });
    return () => controller.abort();
  }, [day, location?.latitude, location?.longitude, key, retry]);
  const current = result?.key === key ? result : null;
  const forecast = current?.data;
  const available = forecast?.status === "available";
  const hasLocation = location?.latitude != null && location?.longitude != null;
  const label = !hasLocation ? "Add a location" : current?.error ? "Retry weather" : !current ? "Weather…" : available ? `${Math.round(forecast.high!)}° / ${Math.round(forecast.low!)}°` : "No forecast";
  return <details key={key} className="group relative text-xs">
    <summary aria-label={available ? `${forecast.description}, high ${Math.round(forecast.high!)} and low ${Math.round(forecast.low!)} degrees Celsius. Show weather details` : label}
      className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 font-medium transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
      <WeatherIcon condition={available ? forecast.description : ""} />
      <span aria-live="polite">{label}</span>
    </summary>
    <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-line bg-surface p-3 shadow-lg">
      <p className="font-medium">Weather · {day}</p>
      <p className="mt-1 text-muted">{location ? `Near ${location.name}` : "Add a location to an activity to see the local forecast."}</p>
      <div className="mt-2" aria-live="polite">
        {hasLocation && !current && <p className="text-muted">Fetching forecast…</p>}
        {current?.error && <><p className="text-muted">{current.error}</p><button type="button" onClick={() => { setResult(null); setRetry((n) => n + 1); }} className="mt-2 underline">Retry forecast</button></>}
        {forecast && <><p>{forecast.description}</p>{available && <p className="mt-1">High {Math.round(forecast.high!)}°C · Low {Math.round(forecast.low!)}°C{forecast.rainChance !== null && <span className="mt-1 block">{forecast.rainChance}% chance of rain</span>}</p>}<p className="mt-2 text-muted">{forecast.timezone.replaceAll("_", " ")}</p></>}
      </div>
      {hasLocation && <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="mt-2 inline-block text-muted underline">Forecast by Open-Meteo</a>}
    </div>
  </details>;
}

function WeatherIcon({ condition }: { condition: string }) {
  const sun = condition === "Clear sky";
  const partly = condition === "Partly cloudy";
  const rain = condition === "Rain" || condition === "Drizzle";
  const snow = condition === "Snow";
  const storm = condition === "Thunderstorms";
  const fog = condition === "Fog";
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 shrink-0 ${sun || partly ? "text-amber-500" : "text-muted"}`}>
    {sun ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> :
      <>{partly && <><circle cx="8" cy="8" r="3.5" /><path d="M8 1v1M1 8h1m1-5 1 1m9-1-1 1" /></>}
        <path d="M6 17a4 4 0 1 1 1-7.9 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 1 1 18 17H6Z" />
        {rain && <path d="m8 20-1 2m6-2-1 2m6-2-1 2" />}
        {snow && <path d="M8 20v2m-1-1h2m7-1v2m-1-1h2" />}
        {storm && <path d="m13 16-3 4h4l-3 3" />}
        {fog && <path d="M4 20h16M7 23h10" />}
      </>}
  </svg>;
}
