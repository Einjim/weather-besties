"use client";

import { useState, type FormEvent } from "react";

type WarningType = "all" | "Full moon" | "Very Cold" | "Very Hot" | "Rainy" | "Snowy";

interface SubscribeResponse {
  next_full_moon?: string;
  weather_warnings?: string[];
  error?: string;
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [warningType, setWarningType] = useState<WarningType>("all");
  const [submitting, setSubmitting] = useState(false);

  const [messageText, setMessageText] = useState("");
  const [messageColor, setMessageColor] = useState<"green" | "red">("green");
  const [messageVisible, setMessageVisible] = useState(false);

  const [result, setResult] = useState<SubscribeResponse | null>(null);

  function flashMessage(text: string, color: "green" | "red") {
    setMessageText(text);
    setMessageColor(color);
    setMessageVisible(true);
    setTimeout(() => setMessageVisible(false), 3000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!/^[a-zA-Z\s]+$/.test(city)) {
      flashMessage("لطفا نام شهر را به انگلیسی وارد کنید.", "red");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, city, warningType }),
      });
      const data: SubscribeResponse = await res.json();

      if (!res.ok) {
        flashMessage(data.error || "اشتراک ناموفق بود. لطفا دوباره تلاش کنید.", "red");
        return;
      }

      flashMessage("اشتراک با موفقیت انجام شد!", "green");
      setResult(data);
      setEmail("");
      setCity("");
      setWarningType("all");
    } catch {
      flashMessage("اشتراک ناموفق بود. لطفا دوباره تلاش کنید.", "red");
    } finally {
      setSubmitting(false);
    }
  }

  const hasPreview = Boolean(result?.next_full_moon || (result?.weather_warnings?.length ?? 0) > 0);

  return (
    <>
      <div className="background-animation">
        <div className="cloud" />
        <div className="cloud" />
        <div className="cloud" />
      </div>
      <div className="container">
        <h1>هشدارهای آب و هوا ☀️🌧️❄️</h1>
        <form id="warning-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="ایمیل خود را وارد کنید"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="text"
            placeholder="نام شهر (به انگلیسی) "
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <select value={warningType} onChange={(e) => setWarningType(e.target.value as WarningType)}>
            <option value="all">تمام هشدارها</option>
            <option value="Full moon">ماه کامل</option>
            <option value="Very Cold">خیلی سرد</option>
            <option value="Very Hot">خیلی گرم</option>
            <option value="Rainy">بارانی</option>
            <option value="Snowy">برفی</option>
          </select>
          <button type="submit" disabled={submitting}>
            {submitting ? "در حال ارسال..." : "اشتراک 📧"}
          </button>
        </form>
        <div id="message" style={{ color: messageColor, opacity: messageVisible ? 1 : 0 }}>
          {messageText}
        </div>
        {hasPreview && (
          <div className="forecast-preview">
            {result?.next_full_moon && <p>{result.next_full_moon}</p>}
            {result?.weather_warnings?.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
