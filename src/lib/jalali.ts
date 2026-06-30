import { toJalaali } from "jalaali-js";

const TEHRAN_TZ = "Asia/Tehran";

const FARSI_DAY_NAMES: Record<string, string> = {
  Sat: "شنبه",
  Sun: "یک‌شنبه",
  Mon: "دوشنبه",
  Tue: "سه‌شنبه",
  Wed: "چهارشنبه",
  Thu: "پنج‌شنبه",
  Fri: "جمعه",
};

export interface TehranParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  weekday: string; // "Sat" | "Sun" | ... (short en-US weekday, used as a lookup key)
}

/** Break a JS Date instant into its Asia/Tehran local Y/M/D/H + weekday. */
export function tehranParts(date: Date): TehranParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TEHRAN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const rawHour = get("hour");
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    // Intl can render midnight as "24" depending on runtime; normalize to 0.
    hour: rawHour === "24" ? 0 : Number(rawHour),
    weekday: get("weekday"),
  };
}

/** 2-digit Tehran-local hour string, e.g. "06", "15" — mirrors Python's strftime('%H'). */
export function tehranHourStr(date: Date): string {
  return String(tehranParts(date).hour).padStart(2, "0");
}

/** Farsi weekday name for a given (Gregorian) Y/M/D triple, independent of timezone. */
export function farsiDayNameForYMD(y: number, m: number, d: number): string {
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(utcDate);
  return FARSI_DAY_NAMES[weekdayShort] ?? "";
}

/** "YYYY/MM/DD" Jalali date string for a given Gregorian Y/M/D triple. */
export function jalaliFromYMD(y: number, m: number, d: number): string {
  const j = toJalaali(y, m, d);
  return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`;
}

/** Tehran-local "tomorrow" instant relative to `now` (Iran has no DST, so +24h is safe). */
export function tehranTomorrow(now: Date): Date {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}
