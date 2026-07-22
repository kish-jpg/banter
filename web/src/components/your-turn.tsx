"use client";

import { useState } from "react";
import type { GradeResponse, TranscriptEntry } from "@/lib/types";
import { bannedTerms, explain } from "@/lib/taxonomy";
import { attemptXP, copyXP, isNearDuplicate } from "@/lib/xp";
import { useProfile } from "@/lib/profile";
import { recordGrade } from "@/lib/grades";
import { checkDraft } from "@/lib/draft";
import { track } from "@/lib/analytics";

const DIMENSION_HINTS: Record<string, string> = {
  warmth: "does it feel engaged?",
  specificity: "is it concrete, not generic?",
  reciprocity: "does it give them something?",
  naturalness: "does it read like a real text?",
};

export function GradeCard({ grade, earned }: { grade: GradeResponse; earned: number }) {
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

export function YourTurn({
  messages,
  suggestions,
  conversationId,
  onXP,
  onGraded,
  gateMode,
  onContinue,
}: {
  messages: TranscriptEntry[];
  suggestions: string[];
  conversationId?: string;
  onXP: (points: number) => void;
  onGraded: () => void;
  gateMode: boolean;
  onContinue?: () => void;
}) {
  const [attempt, setAttempt] = useState("");
  const [grade, setGrade] = useState<GradeResponse | null>(null);
  const [earned, setEarned] = useState(0);
  const [copyNote, setCopyNote] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { summary } = useProfile();

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
          ...(summary ? { profileSummary: summary } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "grading failed");
      const g = data as GradeResponse;
      const points = attemptXP(g.overallScore, false);
      setGrade(g);
      setEarned(points);
      recordGrade(g, conversationId, attempt);
      track("own_attempt_graded", { score: g.overallScore });
      onXP(points);
      onGraded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong, try again");
    } finally {
      setGrading(false);
    }
  }

  return (
    <section className={gateMode ? "" : "mt-2"}>
      <h2 className="text-sm font-medium">{gateMode ? "you first this time" : "your turn"}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {gateMode
          ? "You've leaned on me a few rounds in a row. Write yours, get graded, then mine unlock. That's how the skill sticks."
          : "Write it in your own words. Own attempts earn way more XP than copying."}
      </p>
      <textarea
        value={attempt}
        onChange={(e) => setAttempt(e.target.value)}
        placeholder="What would you send?"
        rows={2}
        className="mt-3 w-full resize-none rounded-2xl border border-border bg-card p-3.5 text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/60"
      />
      {/* Draft coach (PRD §7.4): instant checks before send. Warn, never block. */}
      {!grade &&
        attempt.trim().length > 5 &&
        checkDraft(attempt, bannedTerms).map((c) => (
          <p key={c.kind} className="mt-2 rounded-xl bg-secondary/60 p-2.5 text-xs text-muted-foreground animate-in fade-in">
            <span className="font-medium text-foreground">before you send · </span>
            {c.note}
          </p>
        ))}
      {copyNote && (
        <p className="mt-2 text-xs text-muted-foreground">
          That&apos;s one of mine 😉 +{copyXP()} xp. Say it your way for the real points.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {grade ? (
        <div className="mt-3">
          <GradeCard grade={grade} earned={earned} />
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => {
                setGrade(null);
                setAttempt("");
              }}
              className="text-xs font-medium text-primary/90"
            >
              try another
            </button>
            {onContinue && (
              <button onClick={onContinue} className="btn-primary !rounded-full px-4 py-2 text-xs">
                now see what I&apos;d send →
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={submit}
          disabled={attempt.trim().length === 0 || grading}
          className="btn-secondary mt-3 w-full py-3 text-sm"
        >
          {grading ? "Grading…" : "Grade my reply"}
        </button>
      )}
    </section>
  );
}
