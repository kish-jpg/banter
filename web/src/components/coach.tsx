"use client";

import { useState } from "react";
import type { CoachingResponse, GradeResponse, Tone, TranscriptEntry } from "@/lib/types";
import { explain } from "@/lib/taxonomy";
import { attemptXP, copyXP, isNearDuplicate } from "@/lib/xp";
import { ProfileCard } from "@/components/profile-card";
import { useProfile } from "@/lib/profile";
import { band, STAGE_LABELS } from "@/lib/stage";
import type { Stage } from "@/lib/salience";
import { FactSuggestions, PersonaPanel } from "@/components/persona-panel";
import type { FactType } from "@/lib/persona";

const TONES: Tone[] = ["playful", "sincere", "witty", "direct"];

const FACTOR_LABELS: Record<string, string> = {
  interest: "interest",
  warmth: "warmth",
  reciprocity: "reciprocity",
  responsiveness: "momentum",
};

// Teaching moments grounded in the engine's own signal read - the lowest weak
// factor gets one plain-language note. No claims beyond what the numbers say.
const WATCH_OUTS: Record<string, string> = {
  interest:
    "Interest is reading low. Short answers, not many questions back. Match their energy instead of chasing.",
  reciprocity:
    "The back-and-forth is lopsided. One side is carrying the questions. Give something they can respond to.",
  warmth:
    "The tone is running cool. One genuinely warm line could open this up.",
  responsiveness:
    "Momentum is dipping. A fresh topic or a concrete plan beats another routine question.",
};

function watchOut(factors: Record<string, number>): string | null {
  const [key, value] = Object.entries(factors).sort((a, b) => a[1] - b[1])[0];
  return value < 0.5 ? WATCH_OUTS[key] ?? null : null;
}

const BAND_STYLE: Record<string, string> = {
  low: "text-muted-foreground",
  warming: "text-foreground",
  strong: "text-primary",
};

function SignalRead({
  coaching,
  stage,
  timingNote,
}: {
  coaching: CoachingResponse;
  stage: Stage;
  timingNote: string | null;
}) {
  const { sentiment } = coaching;
  const note = watchOut(sentiment.factors);
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">the read</h2>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
          {STAGE_LABELS[stage]}
        </span>
      </div>
      <p className="mt-1.5 text-[15px]">{sentiment.signal}</p>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
        {Object.entries(sentiment.factors).map(([key, value]) => {
          const b = band(value);
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{FACTOR_LABELS[key] ?? key}</span>
                <span className={`font-medium ${BAND_STYLE[b]}`}>{b}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${Math.round(value * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {note && (
        <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">watch out · </span>
          {note}
        </p>
      )}
      {timingNote && (
        <p className="mt-2 rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">timing · </span>
          {timingNote}
        </p>
      )}
    </section>
  );
}

function WalkAwayCard() {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-medium">real talk</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Two reads in a row say this one&apos;s not being met with much. You can keep going and
        I&apos;ll keep helping, but the strongest move available might be spending this energy
        on someone who matches it. Your call, no judgement either way.
      </p>
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
      <button onClick={() => setOpen(!open)} className="mt-3 text-xs font-medium text-primary/90">
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
      onXP(points);
      onGraded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong, try again");
    } finally {
      setGrading(false);
    }
  }

  return (
    <section className={gateMode ? "" : "mt-4 border-t border-border pt-5"}>
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
              <button
                onClick={onContinue}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                now see what I&apos;d send →
              </button>
            )}
          </div>
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
  threadLabel,
  stage,
  walkAway,
  timingNote,
  gateActive,
  personaId,
  factSuggestions,
  onFactsDone,
  checkInDue,
  onCheckIn,
  onRename,
  onAddMore,
  onRecoach,
  onXP,
  onPickStyle,
  onOwnAttemptGraded,
  loading,
  error,
}: {
  coaching: CoachingResponse;
  messages: TranscriptEntry[];
  threadLabel: string | null;
  stage: Stage;
  walkAway: boolean;
  timingNote: string | null;
  gateActive: boolean;
  personaId: string | null;
  factSuggestions: { type: FactType; text: string; quote: string }[];
  onFactsDone: () => void;
  checkInDue: boolean;
  onCheckIn: (outcome: "met" | "fizzled" | null) => void;
  onRename: (label: string) => void;
  onAddMore: () => void;
  onRecoach: (tone: Tone) => void;
  onXP: (points: number) => void;
  onPickStyle: (style: string) => void;
  onOwnAttemptGraded: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [tone, setTone] = useState<Tone | null>(null);
  // Local: the gate holds after grading so the feedback stays readable; the user
  // dismisses it explicitly. Parent remounts Coach per coaching round (key prop).
  const [gate, setGate] = useState(gateActive);

  return (
    <div
      className={`flex flex-1 flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${loading ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <input
          value={threadLabel ?? ""}
          onChange={(e) => onRename(e.target.value)}
          aria-label="conversation name"
          className="w-full truncate bg-transparent text-sm font-medium text-muted-foreground focus:text-foreground focus:outline-none"
        />
        <button
          onClick={onAddMore}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          + add new messages
        </button>
      </div>

      {checkInDue && (
        <section className="rounded-2xl border border-primary/25 bg-card p-4">
          <h2 className="text-sm font-medium">quick one, did you two meet up?</h2>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                onCheckIn("met");
                onXP(100);
              }}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              we met 🎉
            </button>
            <button
              onClick={() => onCheckIn(null)}
              className="flex-1 rounded-xl bg-secondary py-2.5 text-sm"
            >
              not yet
            </button>
            <button
              onClick={() => onCheckIn("fizzled")}
              className="flex-1 rounded-xl bg-secondary py-2.5 text-sm text-muted-foreground"
            >
              it fizzled
            </button>
          </div>
        </section>
      )}

      <SignalRead coaching={coaching} stage={stage} timingNote={timingNote} />

      {walkAway && <WalkAwayCard />}

      {personaId && factSuggestions.length > 0 && (
        <FactSuggestions personaId={personaId} suggestions={factSuggestions} onDone={onFactsDone} />
      )}

      {gate ? (
        <section className="rounded-2xl border border-primary/25 bg-card p-4">
          <YourTurn
            messages={messages}
            suggestions={coaching.replies.map((r) => r.text)}
            conversationId={coaching.conversationId}
            onXP={onXP}
            onGraded={onOwnAttemptGraded}
            gateMode
            onContinue={() => setGate(false)}
          />
        </section>
      ) : (
        <>
          <h2 className="mt-2 text-sm font-medium text-muted-foreground">what I&apos;d send</h2>
          {coaching.replies.map((r, i) => (
            <ReplyCard
              key={i}
              reply={r}
              onCopied={() => {
                onXP(copyXP());
                onPickStyle(r.style);
              }}
            />
          ))}

          <ProfileCard />

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
            onGraded={onOwnAttemptGraded}
            gateMode={false}
          />
        </>
      )}

      {personaId && <PersonaPanel personaId={personaId} />}
    </div>
  );
}
