import { farsiDayNameForYMD, jalaliFromYMD, tehranHourStr, tehranParts, tehranTomorrow } from "./jalali";

const OWM_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

// Only the fields this app actually reads from OpenWeatherMap's response.
export interface OwmForecastItem {
  dt: number;
  main: { temp: number };
  weather: { main: string }[];
}

export interface OwmForecastResponse {
  list?: OwmForecastItem[];
}

export interface WeatherWarning {
  date: string; // Jalali "YYYY/MM/DD"
  day_type: "امروز" | "فردا";
  warning: string; // Farsi warning label
  time_range: string;
  friendly_message: string;
}

const WARNING_META: Record<string, { emoji: string; advice: string }> = {
  "خیلی گرم": { emoji: "🥵", advice: "مراقب خودت باش!" },
  "خیلی سرد": { emoji: "🥶", advice: "لباس گرم بپوش!" },
  "بارانی": { emoji: "🌧️", advice: "چتر یادت نره!" },
  "برفی": { emoji: "❄️", advice: "مراقب باش لیز نخوری!" },
};

// The subscribe form sends English option values, but warnings are computed
// in Farsi. The original Python app compared these directly, so a specific
// selection (anything but "all") could never match and silently returned
// nothing. This map fixes that so filtering by a specific warning type works.
const ENGLISH_TO_FARSI_WARNING: Record<string, string> = {
  "very cold": "خیلی سرد",
  "very hot": "خیلی گرم",
  rainy: "بارانی",
  snowy: "برفی",
};

/** Fetches the raw 5-day/3-hour forecast for a city from OpenWeatherMap's free endpoint. */
export async function fetchForecast(city: string, apiKey: string): Promise<OwmForecastResponse | null> {
  const url = new URL(OWM_FORECAST_URL);
  url.searchParams.set("q", city);
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  return res.json() as Promise<OwmForecastResponse>;
}

/**
 * Walks the 3-hour forecast list, keeps only today/tomorrow (Tehran-local)
 * entries that cross a warning threshold, and groups consecutive hours of
 * the same warning into a single time range — mirrors process_forecast().
 */
export function processForecast(forecastData: OwmForecastResponse | null, now: Date): WeatherWarning[] {
  const today = tehranParts(now);
  const tomorrow = tehranParts(tehranTomorrow(now));
  const sameDay = (a: { year: number; month: number; day: number }, b: typeof a) =>
    a.year === b.year && a.month === b.month && a.day === b.day;

  type Bucket = { start: Date; end: Date };
  const grouped = new Map<string, Map<string, Bucket>>(); // "y-m-d" -> warningType -> range

  const list: OwmForecastItem[] = forecastData?.list ?? [];

  for (const item of list) {
    const itemDate = new Date(item.dt * 1000);
    const parts = tehranParts(itemDate);
    if (!sameDay(parts, today) && !sameDay(parts, tomorrow)) continue;

    const temp = item?.main?.temp;
    const condition = String(item?.weather?.[0]?.main ?? "").toLowerCase();

    let warning: string | null = null;
    if (typeof temp === "number" && temp <= 0) warning = "خیلی سرد";
    else if (typeof temp === "number" && temp >= 35) warning = "خیلی گرم";
    else if (condition.includes("rain")) warning = "بارانی";
    else if (condition.includes("snow")) warning = "برفی";

    if (!warning) continue;

    const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
    if (!grouped.has(dateKey)) grouped.set(dateKey, new Map());
    const dayMap = grouped.get(dateKey)!;

    if (!dayMap.has(warning)) {
      dayMap.set(warning, { start: itemDate, end: itemDate });
    } else {
      dayMap.get(warning)!.end = itemDate;
    }
  }

  const results: WeatherWarning[] = [];

  for (const [dateKey, warnings] of grouped) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const dayType: "امروز" | "فردا" = sameDay({ year: y, month: m, day: d }, today) ? "امروز" : "فردا";
    const dayName = farsiDayNameForYMD(y, m, d);
    const jalaliDate = jalaliFromYMD(y, m, d);

    for (const [warningType, range] of warnings) {
      const startHour = tehranHourStr(range.start);
      const endHour = tehranHourStr(range.end);
      const meta = WARNING_META[warningType];

      const friendlyMessage = `${meta.emoji} ${dayType} ${dayName} از ${startHour} تا ${endHour} هوا ${warningType}ه. ${meta.advice}`;

      results.push({
        date: jalaliDate,
        day_type: dayType,
        warning: warningType,
        time_range: `از ${startHour} تا ${endHour}`,
        friendly_message: friendlyMessage,
      });
    }
  }

  return results;
}

/** Filters processed warnings by the dropdown's English warning_type value. */
export function filterWarnings(warnings: WeatherWarning[], warningType: string): WeatherWarning[] {
  const wt = warningType.toLowerCase();
  if (wt === "all") return warnings;
  const farsiTarget = ENGLISH_TO_FARSI_WARNING[wt];
  if (!farsiTarget) return [];
  return warnings.filter((w) => w.warning === farsiTarget);
}
