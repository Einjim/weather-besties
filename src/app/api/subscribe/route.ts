import { NextRequest, NextResponse } from "next/server";
import { upsertSubscription } from "@/lib/db";
import { fetchForecast, filterWarnings, processForecast } from "@/lib/weather";
import { fullMoonStatus } from "@/lib/moon";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CITY_RE = /^[a-zA-Z\s]+$/;
const KNOWN_WARNING_TYPES = new Set(["all", "full moon", "very cold", "very hot", "rainy", "snowy"]);

export async function POST(request: NextRequest) {
  let body: { email?: string; city?: string; warningType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const city = (body.city ?? "").trim();
  const warningType = (body.warningType ?? "all").trim();

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "ایمیل نامعتبر است." }, { status: 400 });
  }
  if (!CITY_RE.test(city)) {
    return NextResponse.json({ error: "لطفا نام شهر را به انگلیسی وارد کنید." }, { status: 400 });
  }
  if (!KNOWN_WARNING_TYPES.has(warningType.toLowerCase())) {
    return NextResponse.json({ error: "نوع هشدار نامعتبر است." }, { status: 400 });
  }

  const apiKey = process.env.OWM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "سرور به درستی پیکربندی نشده است." }, { status: 500 });
  }

  try {
    await upsertSubscription(email, city, warningType);

    const forecastData = await fetchForecast(city, apiKey);
    if (!forecastData) {
      return NextResponse.json({ error: "Unable to fetch weather data" }, { status: 400 });
    }

    const now = new Date();
    const wt = warningType.toLowerCase();
    const responseData: { next_full_moon?: string; weather_warnings?: string[] } = {};

    if (wt === "all" || wt === "full moon") {
      const moon = fullMoonStatus(now);
      if (moon) {
        responseData.next_full_moon = `🌕 ماه کامل: ${moon.when}، ${moon.jalaliDate}`;
      }
    }

    if (wt !== "full moon") {
      const processed = processForecast(forecastData, now);
      const relevant = filterWarnings(processed, warningType);
      responseData.weather_warnings = relevant.map((w) => w.friendly_message);
    }

    return NextResponse.json(responseData);
  } catch (err) {
    console.error("subscribe error:", err);
    return NextResponse.json({ error: "خطایی رخ داد. لطفا دوباره تلاش کنید." }, { status: 500 });
  }
}
