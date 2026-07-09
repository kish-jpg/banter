"use client";

import { useState, useSyncExternalStore } from "react";
import type { CoachingResponse, Tone, TranscriptEntry } from "@/lib/types";
import { Capture } from "@/components/capture";
import { Confirm } from "@/components/confirm";
import { Coach } from "@/components/coach";
import { useXP } from "@/lib/useXP";
import {
  clearAll,
  defaultLabel,
  deleteThread,
  getThreadsServerSnapshot,
  getThreadsSnapshot,
  saveThread,
  subscribeThreads,
  type Thread,
} from "@/lib/threads";

type Step = "capture" | "append" | "confirm" | "coach";

export default function Home() {
  const [step, setStep] = useState<Step>("capture");
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [coaching, setCoaching] = useState<CoachingResponse | null>(null);
  const [threadId, setThreadId] = useState(() => crypto.randomUUID());
  const [threadLabel, setThreadLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const xp = useXP();
  const threads = useSyncExternalStore(subscribeThreads, getThreadsSnapshot, getThreadsServerSnapshot);

  async function coach(entries: TranscriptEntry[], tone?: Tone) {
    setLoading(true);
    setError(null);
    try {
      const ordered = entries.map((m, i) => ({ ...m, order: i }));
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: threadId,
          messages: ordered,
          ...(tone ? { tone } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "coaching failed");
      const response = data as CoachingResponse;
      setCoaching(response);
      const label = threadLabel ?? defaultLabel(ordered);
      setThreadLabel(label);
      saveThread({ id: threadId, label, messages: ordered, lastCoaching: response });
      setStep("coach");
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong, try again");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("capture");
    setMessages([]);
    setCoaching(null);
    setError(null);
    setThreadId(crypto.randomUUID());
    setThreadLabel(null);
  }

  function openThread(t: Thread) {
    setThreadId(t.id);
    setThreadLabel(t.label);
    setMessages(t.messages);
    setCoaching(t.lastCoaching);
    setError(null);
    setStep(t.lastCoaching ? "coach" : "confirm");
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <header className="mb-8 flex items-center justify-between">
        <button className="text-lg font-semibold tracking-tight" onClick={reset}>
          banter<span className="text-primary">.</span>
        </button>
        <div className="flex items-center gap-3">
          {xp.total > 0 && (
            <span
              className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
              title={`${xp.into}/${xp.toNext} xp to level ${xp.level + 1}`}
            >
              lv {xp.level} · {xp.total} xp
            </span>
          )}
          {step !== "capture" && (
            <button
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={reset}
            >
              start over
            </button>
          )}
        </div>
      </header>

      {(step === "capture" || step === "append") && (
        <>
          <Capture
            append={step === "append"}
            onExtracted={(msgs) => {
              setMessages(step === "append" ? [...messages, ...msgs] : msgs);
              setStep("confirm");
            }}
          />
          {step === "capture" && threads.length > 0 && (
            <section className="mt-10">
              <h2 className="text-sm font-medium text-muted-foreground">pick up where you left off</h2>
              <div className="mt-3 flex flex-col gap-2">
                {threads.map((t) => (
                  <div key={t.id} className="group flex items-center gap-2">
                    <button
                      onClick={() => openThread(t)}
                      className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40"
                    >
                      <span className="block truncate text-[15px]">{t.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {t.messages.length} messages
                      </span>
                    </button>
                    <button
                      aria-label={`delete ${t.label}`}
                      onClick={() => deleteThread(t.id)}
                      className="px-1 text-muted-foreground/40 transition-colors hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  if (confirm("Delete every conversation and all progress on this device?")) {
                    clearAll();
                    location.reload();
                  }
                }}
                className="mt-4 text-xs text-muted-foreground/60 transition-colors hover:text-destructive"
              >
                delete everything
              </button>
            </section>
          )}
        </>
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
          messages={messages}
          threadLabel={threadLabel}
          onRename={(label) => {
            setThreadLabel(label);
            saveThread({ id: threadId, label, messages, lastCoaching: coaching });
          }}
          onAddMore={() => setStep("append")}
          onRecoach={(tone) => coach(messages, tone)}
          onXP={xp.award}
          loading={loading}
          error={error}
        />
      )}
    </main>
  );
}
