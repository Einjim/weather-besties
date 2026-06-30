import { translate } from "@vitalets/google-translate-api";

/**
 * Translates an English city name to Farsi for display purposes.
 * This relies on an unofficial, unauthenticated Google Translate endpoint —
 * same trade-off the original Python app made with `googletrans`. It can
 * fail or get rate-limited, so on any error we fall back to the original
 * text, exactly like the original try/except did.
 */
export async function translateToFarsi(text: string): Promise<string> {
  try {
    const result = await translate(text, { to: "fa" });
    return result.text;
  } catch (err) {
    console.error("Translation error:", err);
    return text;
  }
}
