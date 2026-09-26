import { dayInZone } from "@/lib/aiReview";
import { forecastForDay } from "@/lib/weather";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat")), lon = Number(params.get("lon")), day = params.get("day") ?? "";
  if (!params.has("lat") || !params.has("lon") || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180 || !/^\d{4}-\d\d-\d\d$/.test(day) || !Number.isFinite(Date.parse(`${day}T00:00:00Z`)) || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) {
    return Response.json({ error: "A valid location and date are required." }, { status: 400 });
  }
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({ latitude: lat.toFixed(3), longitude: lon.toFixed(3), daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max", timezone: "auto", forecast_days: "16" }).toString();
    const response = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("Weather service unavailable");
    const data = await response.json();
    const forecast = forecastForDay(data, day, dayInZone(new Date(), data.timezone));
    return Response.json(forecast, { headers: { "Cache-Control": "private, max-age=900" } });
  } catch {
    return Response.json({ error: "Weather is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
