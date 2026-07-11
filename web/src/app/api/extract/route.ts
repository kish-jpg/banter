import { NextRequest, NextResponse } from "next/server";
import type { TranscriptEntry } from "@/lib/types";
import { callGemini } from "@/lib/gemini";

// Hard constraint: screenshots exist only in this request's memory. Nothing here
// writes them to disk, storage, or logs.

const MAX_IMAGES = 6;
const MAX_TEXT_CHARS = 8000;

const EXTRACT_SCHEMA = {
  type: "OBJECT",
  properties: {
    messages: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          speaker: { type: "STRING", enum: ["user", "match"] },
          text: { type: "STRING" },
          time: { type: "STRING" },
        },
        required: ["speaker", "text"],
      },
    },
  },
  required: ["messages"],
};

const SYSTEM = `You extract chat conversations into a clean transcript.
Rules:
- speaker "user" = the person asking for help (their own messages: right-aligned bubbles in screenshots, or lines marked me/I/sent).
- speaker "match" = the other person (left-aligned bubbles, or lines marked them/their name).
- Preserve exact message text. Do not paraphrase, correct spelling, or merge messages.
- Order messages top-to-bottom; when multiple screenshots are given, they are in chronological order.
- When a timestamp is visible or clearly attributable to a message (chat apps show them
  as separators or next to bubbles), set "time" to ISO 8601 (e.g. 2026-07-09T21:41:00).
  Use today's date context only when the app shows relative labels you can resolve
  confidently (e.g. "Yesterday"). Omit "time" entirely when unsure - never guess.
- Skip read receipts, typing indicators, and UI text. Only actual messages.`;

interface ExtractBody {
  images?: string[]; // data URLs
  text?: string;
}

function dataUrlToPart(dataUrl: string): { inline_data: { mime_type: string; data: string } } | null {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
  return m ? { inline_data: { mime_type: m[1], data: m[2] } } : null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "server missing GEMINI_API_KEY" }, { status: 500 });

  let body: ExtractBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parts: unknown[] = [];
  if (Array.isArray(body.images)) {
    if (body.images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `max ${MAX_IMAGES} screenshots per request` }, { status: 400 });
    }
    for (const img of body.images) {
      const part = typeof img === "string" ? dataUrlToPart(img) : null;
      if (!part) return NextResponse.json({ error: "images must be png/jpeg/webp data URLs" }, { status: 400 });
      parts.push(part);
    }
  }
  if (typeof body.text === "string" && body.text.trim().length > 0) {
    if (body.text.length > MAX_TEXT_CHARS) {
      return NextResponse.json({ error: `pasted text exceeds ${MAX_TEXT_CHARS} chars` }, { status: 400 });
    }
    parts.push({ text: `Pasted conversation text:\n${body.text}` });
  }
  if (parts.length === 0) {
    return NextResponse.json({ error: "provide screenshots and/or pasted text" }, { status: 400 });
  }

  const result = await callGemini(
    apiKey,
    {
      contents: [{ role: "user", parts }],
      systemInstruction: { parts: [{ text: SYSTEM }] },
      generationConfig: { responseMimeType: "application/json", responseSchema: EXTRACT_SCHEMA },
    },
    "extract",
  );
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  try {
    const raw = JSON.parse(result.text) as {
      messages: { speaker: "user" | "match"; text: string; time?: string }[];
    };
    const messages: TranscriptEntry[] = raw.messages
      .filter((m) => (m.speaker === "user" || m.speaker === "match") && typeof m.text === "string" && m.text.length > 0)
      .map((m, i) => {
        const ts = m.time ? Date.parse(m.time) : NaN;
        return { speaker: m.speaker, text: m.text, order: i, ...(Number.isFinite(ts) ? { ts } : {}) };
      });
    if (messages.length === 0) {
      return NextResponse.json({ error: "no messages found, try a clearer screenshot" }, { status: 422 });
    }
    return NextResponse.json({ messages });
  } catch (e) {
    console.error("[extract] JSON.parse of Gemini text failed:", e);
    return NextResponse.json({ error: "extraction failed, try again" }, { status: 502 });
  }
}
