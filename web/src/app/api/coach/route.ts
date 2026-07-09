import { NextRequest, NextResponse } from "next/server";

// Proxies to the coaching edge function (local deno serve in dev, Supabase cloud in prod).
// Keeps the function URL + anon key server-side; the engine's taxonomy gate stays authoritative.

export async function POST(req: NextRequest) {
  const url = process.env.COACHING_URL;
  if (!url) return NextResponse.json({ error: "server missing COACHING_URL" }, { status: 500 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (anonKey) headers["Authorization"] = `Bearer ${anonKey}`;

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
