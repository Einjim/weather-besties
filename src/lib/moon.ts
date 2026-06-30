import * as Astronomy from "astronomy-engine";
import { jalaliFromYMD, tehranParts, tehranTomorrow } from "./jalali";

/**
 * Returns the next full moon as a JS Date, searching up to 40 days ahead
 * (the synodic month is ~29.53 days, so 40 is a safe upper bound).
 */
export function getNextFullMoon(from: Date): Date | null {
  const result = Astronomy.SearchMoonPhase(180, from, 40);
  return result ? result.date : null;
}

export interface FullMoonStatus {
  when: "امروز" | "فردا";
  jalaliDate: string;
}

/**
 * If the next full moon falls today or tomorrow (Tehran-local), returns a
 * ready-to-display status; otherwise null. Mirrors the today/tomorrow check
 * in send_daily_weather_warnings() / get_weather().
 */
export function fullMoonStatus(now: Date): FullMoonStatus | null {
  const fullMoon = getNextFullMoon(now);
  if (!fullMoon) return null;

  const today = tehranParts(now);
  const tomorrow = tehranParts(tehranTomorrow(now));
  const fm = tehranParts(fullMoon);

  const isToday = fm.year === today.year && fm.month === today.month && fm.day === today.day;
  const isTomorrow = fm.year === tomorrow.year && fm.month === tomorrow.month && fm.day === tomorrow.day;

  if (!isToday && !isTomorrow) return null;

  return {
    when: isToday ? "امروز" : "فردا",
    jalaliDate: jalaliFromYMD(fm.year, fm.month, fm.day),
  };
}
