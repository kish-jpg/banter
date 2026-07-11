const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; status: number; message: string };

/**
 * Calls Gemini generateContent with one retry on 429/5xx (free-tier rate limits and
 * transient errors are common and single-shot calls have no resilience to them).
 * Always logs the actual failure reason server-side - a bare 502 with no console
 * output is undiagnosable from Vercel logs alone.
 */
export async function callGemini(
  apiKey: string,
  body: Record<string, unknown>,
  label: string,
): Promise<GeminiResult> {
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      try {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === "string") return { ok: true, text };
        const finishReason = data.candidates?.[0]?.finishReason ?? "no candidates";
        console.error(`[${label}] Gemini returned no usable text, finishReason=${finishReason}`);
        return { ok: false, status: 502, message: `blocked (${finishReason})` };
      } catch (e) {
        console.error(`[${label}] Gemini response parse failed:`, e);
        return { ok: false, status: 502, message: "malformed response" };
      }
    }

    lastStatus = res.status;
    lastBody = await res.text().catch(() => "");
    console.error(`[${label}] Gemini call failed (attempt ${attempt + 1}): ${res.status} ${lastBody.slice(0, 500)}`);

    // Retry once on rate limit / transient server error; anything else (bad request,
    // auth) won't succeed on retry.
    if (attempt === 0 && (res.status === 429 || res.status >= 500)) continue;
    break;
  }

  return {
    ok: false,
    status: lastStatus === 429 ? 429 : 502,
    message: lastStatus === 429 ? "rate limited, try again in a moment" : "generation failed, try again",
  };
}
