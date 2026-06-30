import { NextRequest, NextResponse } from "next/server";
import { getAllSubscriptions } from "@/lib/db";
import { fetchForecast, filterWarnings, processForecast } from "@/lib/weather";
import { fullMoonStatus } from "@/lib/moon";
import { translateToFarsi } from "@/lib/translate";
import { sendWeatherEmail } from "@/lib/email";

// Hobby (free) Vercel projects can raise function duration up to 60s.
// A handful of subscribers easily fit; if you grow past ~15-20 subscribers
// and start timing out, see the README for batching/Pro options.
export const maxDuration = 60;

const CONCURRENCY = 5;

async function runInBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    await Promise.allSettled(batch.map(fn));
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.OWM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OWM_API_KEY is not set" }, { status: 500 });
  }

  const now = new Date();
  const moon = fullMoonStatus(now);
  const subscribers = await getAllSubscriptions();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  await runInBatches(subscribers, CONCURRENCY, async (sub) => {
    try {
      const forecastData = await fetchForecast(sub.city, apiKey);
      if (!forecastData) {
        failed++;
        return;
      }

      const processed = processForecast(forecastData, now);
      const farsiCity = await translateToFarsi(sub.city);

      let body = `صبح بخیر! ☀️\n\nپیش‌بینی آب و هوای ${farsiCity} امروز:\n\n`;
      let shouldSend = false;

      const wt = sub.warning_type.toLowerCase();

      if ((wt === "all" || wt === "full moon") && moon) {
        body += `🌕 ماه کامل: ${moon.when}، ${moon.jalaliDate}\n\n`;
        shouldSend = true;
      }

      if (wt !== "full moon") {
        const relevant = filterWarnings(processed, sub.warning_type);
        if (relevant.length > 0) {
          for (const warning of relevant) {
            body += warning.friendly_message + "\n";
          }
          shouldSend = true;
        }
      }

      if (shouldSend) {
        body += "\nروز خوبی داشته باشی! 😘";
        await sendWeatherEmail(sub.email, "حواست به وضع هوا باشه! 🌤️", body);
        sent++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`cron: failed for ${sub.email}:`, err);
      failed++;
    }
  });

  return NextResponse.json({
    ok: true,
    subscribers: subscribers.length,
    sent,
    skipped,
    failed,
  });
}
