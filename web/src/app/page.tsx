"use client";

import { useState } from "react";
import type { CoachingResponse, Tone, TranscriptEntry } from "@/lib/types";
import { Capture } from "@/components/capture";
import { Confirm } from "@/components/confirm";
import { Coach } from "@/components/coach";

type Step = "capture" | "confirm" | "coach";

export default function Home() {
  const [step, setStep] = useState<Step>("capture");
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [coaching, setCoaching] = useState<CoachingResponse | null>(null);
  const [conversationId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function coach(entries: TranscriptEntry[], tone?: Tone) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messages: entries.map((m, i) => ({ ...m, order: i })),
          ...(tone ? { tone } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "coaching failed");
      setCoaching(data as CoachingResponse);
      setStep("coach");
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong, try again");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("capture");
    setCoaching(null);
    setError(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <header className="mb-8 flex items-center justify-between">
        <button className="text-lg font-semibold tracking-tight" onClick={reset}>
          banter<span className="text-primary">.</span>
        </button>
        {step !== "capture" && (
          <button
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={reset}
          >
            start over
          </button>
        )}
      </header>

      {step === "capture" && (
        <Capture
          onExtracted={(msgs) => {
            setMessages(msgs);
            setStep("confirm");
          }}
        />
      )}

      {step === "confirm" && (
        <Confirm
          messages={messages}
          onChange={setMessages}
          onConfirm={() => coach(messages)}
          loading={loading}
          error={error}
        />
      )}

      {step === "coach" && coaching && (
        <Coach
          coaching={coaching}
          onRecoach={(tone) => coach(messages, tone)}
          loading={loading}
          error={error}
        />
      )}
    </main>
  );
}
