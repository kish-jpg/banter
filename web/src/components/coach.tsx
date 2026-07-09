"use client";

import { useState } from "react";
import type { CoachingResponse, GradeResponse, Tone, TranscriptEntry } from "@/lib/types";
import { explain } from "@/lib/taxonomy";
import { attemptXP, copyXP, isNearDuplicate } from "@/lib/xp";

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

function ReplyCard({
  reply,
  onCopied,
}: {
  reply: CoachingResponse["replies"][number];
  onCopied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const why = explain(reply.psychologyTag);

  async function copy() {
    await navigator.clipboard.writeText(reply.text);
    if (!copied) onCopied();
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

const DIMENSION_HINTS: Record<string, string> = {
  warmth: "does it feel engaged?",
  specificity: "is it concrete, not generic?",
  reciprocity: "does it give them something?",
  naturalness: "does it read like a real text?",
};

function GradeCard({ grade, earned }: { grade: GradeResponse; earned: number }) {
  const why = explain(grade.citedTag);
  return (
    <div className="rounded-2xl border border-primary/25 bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">your grade</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-primary">{grade.overallScore}/5</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            +{earned} xp
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {grade.dimensions.map((d) => (
          <details key={d.dimension} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">{d.dimension}</span>
              <span className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`h-1.5 w-4 rounded-full ${n <= d.score ? "bg-primary" : "bg-secondary"}`}
                  />
                ))}
              </span>
            </summary>
            <p className="mb-1 ml-24 mt-1 pl-2 text-xs text-muted-foreground">
              {d.reasoning || DIMENSION_HINTS[d.dimension]}
            </p>
          </details>
        ))}
      </div>
      <p className="mt-3 text-sm">{grade.strengthNote}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{grade.improvementNote}</p>
      {why && (
        <p className="mt-2 text-xs text-muted-foreground/70">
          {why.tagName} · {why.citation}
        </p>
      )}
    </div>
  );
}

function YourTurn({
  messages,
  suggestions,
  conversationId,
  onXP,
}: {
  messages: TranscriptEntry[];
  suggestions: string[];
  conversationId?: string;
  onXP: (points: number) => void;
}) {
  const [attempt, setAttempt] = useState("");
  const [grade, setGrade] = useState<GradeResponse | null>(null);
  const [earned, setEarned] = useState(0);
  const [copyNote, setCopyNote] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setCopyNote(false);
    // Anti-gaming check runs BEFORE the network call (06-RESEARCH): a pasted
    // suggestion earns copy XP and never reaches the grading LLM as an "own attempt".
    if (isNearDuplicate(attempt, suggestions)) {
      setCopyNote(true);
      onXP(copyXP());
      return;
    }
    setGrading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "grade",
          attemptText: attempt,
          messages,
          conversationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "grading failed");
      const g = data as GradeResponse;
      const points = attemptXP(g.overallScore, false);
      setGrade(g);
      setEarned(points);
      onXP(points);
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong, try again");
    } finally {
      setGrading(false);
    }
  }

  return (
    <section className="mt-4 border-t border-border pt-5">
      <h2 className="text-sm font-medium">your turn</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Write it in your own words. Own attempts earn way more XP than copying.
      </p>
      <textarea
        value={attempt}
        onChange={(e) => setAttempt(e.target.value)}
        placeholder="What would you send?"
        rows={2}
        className="mt-3 w-full resize-none rounded-2xl border border-border bg-card p-3.5 text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/60"
      />
      {copyNote && (
        <p className="mt-2 text-xs text-muted-foreground">
          That&apos;s one of mine 😉 +{copyXP()} xp. Say it your way for the real points.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {grade ? (
        <div className="mt-3">
          <GradeCard grade={grade} earned={earned} />
          <button
            onClick={() => {
              setGrade(null);
              setAttempt("");
            }}
            className="mt-2 text-xs font-medium text-primary/90"
          >
            try another
          </button>
        </div>
      ) : (
        <button
          onClick={submit}
          disabled={attempt.trim().length === 0 || grading}
          className="mt-3 w-full rounded-2xl bg-secondary py-3 text-sm font-semibold transition-opacity disabled:opacity-30"
        >
          {grading ? "Grading…" : "Grade my reply"}
        </button>
      )}
    </section>
  );
}

export function Coach({
  coaching,
  messages,
  onRecoach,
  onXP,
  loading,
  error,
}: {
  coaching: CoachingResponse;
  messages: TranscriptEntry[];
  onRecoach: (tone: Tone) => void;
  onXP: (points: number) => void;
  loading: boolean;
  error: string | null;
}) {
  const [tone, setTone] = useState<Tone | null>(null);

  return (
    <div className={`flex flex-1 flex-col gap-4 ${loading ? "opacity-50" : ""}`}>
      <SignalRead coaching={coaching} />

      <h2 className="mt-2 text-sm font-medium text-muted-foreground">what I&apos;d send</h2>
      {coaching.replies.map((r, i) => (
        <ReplyCard key={i} reply={r} onCopied={() => onXP(copyXP())} />
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

      <YourTurn
        messages={messages}
        suggestions={coaching.replies.map((r) => r.text)}
        conversationId={coaching.conversationId}
        onXP={onXP}
      />
    </div>
  );
}
