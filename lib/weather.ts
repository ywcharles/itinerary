export type DayWeather = {
  day: string; timezone: string; status: "available" | "past" | "unavailable";
  description: string; high: number | null; low: number | null; rainChance: number | null;
};

export function weatherDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code === 45 || code === 48) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  return "Forecast available";
}

export function forecastForDay(data: unknown, day: string, today: string): DayWeather {
  const d = data as { timezone?: string; daily?: Record<string, unknown[]> };
  if (!d?.timezone || !Array.isArray(d.daily?.time)) throw new Error("Weather service returned incomplete data.");
  const index = d.daily.time.indexOf(day);
  const base = { day, timezone: d.timezone, high: null, low: null, rainChance: null };
  if (day < today) return { ...base, status: "past", description: "Forecasts are only available for today and upcoming days." };
  if (index < 0) return { ...base, status: "unavailable", description: "Forecast not available yet. Check back within 16 days of your trip." };
  const numberAt = (key: string) => {
    const n = d.daily?.[key]?.[index];
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  };
  const code = numberAt("weather_code");
  const high = numberAt("temperature_2m_max"), low = numberAt("temperature_2m_min");
  if (code === null || high === null || low === null) return { ...base, status: "unavailable", description: "Forecast data is unavailable for this date." };
  return { day, timezone: d.timezone, status: "available", description: weatherDescription(code), high, low, rainChance: numberAt("precipitation_probability_max") };
}
