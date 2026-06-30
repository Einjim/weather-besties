# Weather Warning Subscriber — Next.js

A Persian (Farsi) weather-alert subscription site: someone enters an email + city,
picks which warnings they care about (very hot, very cold, rain, snow, full moon),
and gets a daily morning email when one applies to their city.

This is a full rewrite of the original Flask app as a single Next.js app
(frontend + API routes), built to deploy on Vercel's free Hobby plan.

## ⚠️ Do this first: rotate your old credentials

Your uploaded `app.py` had a **live OpenWeatherMap API key and a live Gmail App
Password hardcoded in plain text**. Once code like that goes to GitHub (even a
private repo can leak via mistakes, collaborators, or provider scans), bots
that scrape GitHub for exposed secrets will find and use them within hours.

Before you push anything:
1. **Gmail**: go to <https://myaccount.google.com/apppasswords>, revoke the old
   app password (`weatherapp.einjim@gmail.com`), and generate a new one. You'll
   need 2-Step Verification turned on for that Google account.
2. **OpenWeatherMap**: go to <https://home.openweathermap.org/api_keys>, delete
   the old key, and generate a new one.

The code below reads both from environment variables — nothing is hardcoded —
so this only has to happen once.

## What changed vs. the Flask version

- **Stack**: Flask + SQLite + APScheduler → Next.js (App Router, TypeScript) +
  Postgres + Vercel Cron. SQLite's local file and APScheduler's in-process
  background thread don't survive on serverless hosting (Vercel spins your
  app up per-request and throws the instance away), so both had to be
  replaced with externally-hosted equivalents.
- **Bug fix**: in the original, selecting a specific warning type ("Very
  Cold", "Rainy", etc., instead of "all") silently returned zero results,
  because the dropdown sends English values while warnings are computed in
  Farsi, and the filter compared them directly. Fixed by mapping English →
  Farsi before filtering (see `src/lib/weather.ts`).
- **New**: the immediate forecast/full-moon info the API already computed on
  subscribe is now actually shown on the page. The original fetched it but
  never displayed it.
- **Cron schedule**: `app.py`'s code ran the daily job at 23:23 with a
  `# Run at 6:00 AM` comment — clearly a leftover test value. This version
  uses the documented 6:00 AM Tehran time (`30 2 * * *` UTC). Change it in
  `vercel.json` if you want a different time.
- Dates/times are computed explicitly in Asia/Tehran rather than relying on
  the server's ambient timezone, which is undefined on serverless platforms.

## Stack

| Concern | Original | This version |
|---|---|---|
| Frontend + backend | Flask + Jinja + vanilla JS | Next.js App Router (TypeScript) |
| Database | SQLite file | Postgres (Neon, free tier) |
| Scheduled daily job | APScheduler (in-process) | Vercel Cron → `/api/cron` |
| Email | smtplib + Gmail SMTP | Nodemailer + Gmail SMTP |
| Persian calendar | `jdatetime` | `jalaali-js` |
| Full moon | `ephem` | `astronomy-engine` |
| Farsi translation | `googletrans` | `@vitalets/google-translate-api` |

All of these are free. OpenWeatherMap's forecast endpoint (`/data/2.5/forecast`,
what this app uses) is on their free "no card required" tier — only their
newer One Call 3.0/4.0 product asks for a card.

## 1. Get your free accounts & keys

- **OpenWeatherMap**: sign up at <https://openweathermap.org/api>, grab an API
  key from your account page. New keys can take up to ~2 hours to activate.
- **Gmail App Password**: see the rotation steps above if you haven't already.
- **GitHub** and **Vercel** accounts (sign into Vercel with GitHub — it's free).

## 2. Push this project to GitHub

```bash
cd weather-app
git init
git add -A
git commit -m "Initial commit"
```
Then create a new **empty** repo on GitHub (no README/license, to avoid merge
conflicts), and:
```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```
> The repo must be under your personal GitHub account, not an organization —
> Vercel's free Hobby plan can't link to org-owned repos.

## 3. Deploy on Vercel

1. Go to <https://vercel.com/new>, select your GitHub repo, click **Import**.
   Framework preset auto-detects as Next.js — leave the build settings as-is.
2. **Before** your first deploy (or right after, then redeploy), add a
   database: in the project, go to **Storage → Create Database → Postgres**
   (Neon). This provisions a free Postgres database and can auto-inject a
   connection string. Whatever variable name it injects, also add/rename one
   named exactly `DATABASE_URL` in **Settings → Environment Variables** so it
   matches the code — paste the same connection string Neon gave you.
3. In **Settings → Environment Variables**, add the rest:
   | Name | Value |
   |---|---|
   | `OWM_API_KEY` | your OpenWeatherMap key |
   | `SMTP_USERNAME` | your Gmail address |
   | `SMTP_PASSWORD` | your new Gmail App Password |
   | `CRON_SECRET` | a random string — generate with `openssl rand -hex 32` |

   Apply all of these to **Production** (and Preview if you want previews to
   work too).
4. Deploy. Vercel will read `vercel.json` and automatically register the
   daily cron job — you can see it under **Settings → Cron Jobs** after the
   first deploy.
5. Visit your `*.vercel.app` URL and submit the form once — this also creates
   the `subscriptions` table automatically on first use.

Cron jobs on the free Hobby plan run once a day and Vercel picks the exact
minute within that hour for load-balancing, so don't expect it to fire at
*exactly* 02:30 UTC — anywhere in that hour is normal.

## 4. Local development (optional)

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

## Notes & limitations

- **Translation is best-effort.** `@vitalets/google-translate-api` (like the
  original `googletrans`) talks to an unofficial Google endpoint with no API
  key. It can occasionally fail or get rate-limited from shared serverless
  IPs; when that happens the code falls back to showing the English city name
  instead of crashing — same fallback behavior as the original.
- **Subscriber volume**: the cron function is capped at 60 seconds on the
  free plan and emails are sent in small concurrent batches. That comfortably
  covers a personal/small project; if you get into the hundreds of
  subscribers, you'll want to batch across multiple cron runs.
- **This is non-commercial use** — Vercel's Hobby plan is free for personal
  projects only, which fits this app.
