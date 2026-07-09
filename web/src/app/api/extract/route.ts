import { NextRequest, NextResponse } from "next/server";
import type { TranscriptEntry } from "@/lib/types";

// Hard constraint: screenshots exist only in this request's memory. Nothing here
// writes them to disk, storage, or logs.

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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
- Skip timestamps, read receipts, typing indicators, and UI text. Only actual messages.`;

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

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      systemInstruction: { parts: [{ text: SYSTEM }] },
      generationConfig: { responseMimeType: "application/json", responseSchema: EXTRACT_SCHEMA },
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "extraction failed, try again" }, { status: 502 });
  }

  try {
    const data = await res.json();
    const raw = JSON.parse(data.candidates[0].content.parts[0].text) as {
      messages: { speaker: "user" | "match"; text: string }[];
    };
    const messages: TranscriptEntry[] = raw.messages
      .filter((m) => (m.speaker === "user" || m.speaker === "match") && typeof m.text === "string" && m.text.length > 0)
      .map((m, i) => ({ speaker: m.speaker, text: m.text, order: i }));
    if (messages.length === 0) {
      return NextResponse.json({ error: "no messages found, try a clearer screenshot" }, { status: 422 });
    }
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: "extraction failed, try again" }, { status: 502 });
  }
}
