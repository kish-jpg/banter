"use client";

import { useState } from "react";
import type { CoachingResponse, Tone } from "@/lib/types";
import { explain } from "@/lib/taxonomy";

const TONES: Tone[] = ["playful", "sincere", "witty", "direct"];

const FACTOR_LABELS: Record<string, string> = {
  interest: "interest",
  warmth: "warmth",
  reciprocity: "reciprocity",
  responsiveness: "momentum",
};

function SignalRead({ coaching }: { coaching: CoachingResponse }) {
  const { sentiment } = coaching;
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">the read</h2>
        <span className="text-sm font-semibold text-primary">
          {Math.round(sentiment.score * 100)}
        </span>
      </div>
      <p className="mt-1 text-[15px]">{sentiment.signal}</p>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
        {Object.entries(sentiment.factors).map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{FACTOR_LABELS[key] ?? key}</span>
              <span>{Math.round(value * 100)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${Math.round(value * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReplyCard({ reply }: { reply: CoachingResponse["replies"][number] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const why = explain(reply.psychologyTag);

  async function copy() {
    await navigator.clipboard.writeText(reply.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
          {reply.style}
        </span>
        <button
          onClick={copy}
          className={`text-xs font-medium transition-colors ${copied ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <p className="mt-2.5 text-[15px] leading-relaxed">{reply.text}</p>
      <button
        onClick={() => setOpen(!open)}
        className="mt-3 text-xs font-medium text-primary/90"
      >
        {open ? "hide" : "why this works"}
      </button>
      {open && (
        <div className="mt-2 rounded-xl bg-secondary/60 p-3 text-sm">
          <p className="font-medium">{reply.psychologyTag}</p>
          {why ? (
            <>
              <p className="mt-1 text-muted-foreground">{why.explanation}</p>
              <p className="mt-2 text-xs text-muted-foreground/70">{why.citation}</p>
            </>
          ) : (
            <p className="mt-1 text-muted-foreground">
              A recognized communication technique from the coaching taxonomy.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function Coach({
  coaching,
  onRecoach,
  loading,
  error,
}: {
  coaching: CoachingResponse;
  onRecoach: (tone: Tone) => void;
  loading: boolean;
  error: string | null;
}) {
  const [tone, setTone] = useState<Tone | null>(null);

  return (
    <div className={`flex flex-1 flex-col gap-4 ${loading ? "opacity-50" : ""}`}>
      <SignalRead coaching={coaching} />

      <h2 className="mt-2 text-sm font-medium text-muted-foreground">what I&apos;d send</h2>
      {coaching.replies.map((r, i) => (
        <ReplyCard key={i} reply={r} />
      ))}

      <div className="mt-2">
        <p className="text-xs text-muted-foreground">want a different vibe?</p>
        <div className="mt-2 flex gap-2">
          {TONES.map((t) => (
            <button
              key={t}
              disabled={loading}
              onClick={() => {
                setTone(t);
                onRecoach(t);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                tone === t
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
