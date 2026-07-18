"use client";

import { useState } from "react";
import type { CoachingResponse, Tone, TranscriptEntry } from "@/lib/types";
import { explain } from "@/lib/taxonomy";
import { copyXP, sentXP } from "@/lib/xp";
import { ProfileCard } from "@/components/profile-card";
import { band, STAGE_LABELS } from "@/lib/stage";
import type { Stage } from "@/lib/salience";
import { FactSuggestions, PersonaPanel } from "@/components/persona-panel";
import { SelfPanel } from "@/components/self-panel";
import { ResonancePanel } from "@/components/resonance-panel";
import type { FactType } from "@/lib/persona";
import { YourTurn } from "@/components/your-turn";
import { ShareCard } from "@/components/share-card";

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
  warmth: "The tone is running cool. One genuinely warm line could open this up.",
  responsiveness:
    "Momentum is dipping. A fresh topic or a concrete plan beats another routine question.",
};

function watchOut(factors: Record<string, number>): string | null {
  const [key, value] = Object.entries(factors).sort((a, b) => a[1] - b[1])[0];
  return value < 0.5 ? WATCH_OUTS[key] ?? null : null;
}

// Mono rule: the signal color marks strong ONLY; everything else stays ink.
const BAND_DOT: Record<string, string> = {
  low: "bg-muted-foreground/40",
  warming: "bg-foreground/45",
  strong: "bg-signal",
};

/** The conversation itself - the object being coached, always visible on top. */
function Conversation({
  messages,
  loading,
  onAppend,
}: {
  messages: TranscriptEntry[];
  loading: boolean;
  onAppend: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? messages : messages.slice(-4);

  return (
    <section className="relative">
      {messages.length > 4 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mb-2 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          show all {messages.length} messages
        </button>
      )}
      <div className="flex flex-col gap-1.5">
        {visible.map((m, i) => (
          <div key={i} className={`flex ${m.speaker === "user" ? "justify-end" : ""}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${
                m.speaker === "user"
                  ? "rounded-br-md bg-primary/15 text-foreground"
                  : "rounded-bl-md bg-secondary text-secondary-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      {loading && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-y-0 w-1/3 animate-[scan_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
        </div>
      )}
      <button
        onClick={onAppend}
        disabled={loading}
        className="mt-3 w-full rounded-2xl border border-dashed border-border py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
      >
        ＋ what happened since?
      </button>
    </section>
  );
}

/** Compact read: one line + stage + four band dots; detail on demand. */
function ReadStrip({
  coaching,
  messages,
  stage,
  walkAway,
  timingNote,
}: {
  coaching: CoachingResponse;
  messages: TranscriptEntry[];
  stage: Stage;
  walkAway: boolean;
  timingNote: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { sentiment } = coaching;
  const note = watchOut(sentiment.factors);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-3.5 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{sentiment.signal}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              {STAGE_LABELS[stage]}
            </span>
            {sentiment.conversationType && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                {sentiment.conversationType}
              </span>
            )}
            <span className="flex items-center gap-2">
              {Object.entries(sentiment.factors).map(([key, value]) => (
                <span key={key} className="flex items-center gap-1" title={`${FACTOR_LABELS[key]}: ${band(value)}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${BAND_DOT[band(value)]}`} />
                </span>
              ))}
            </span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "less" : "the read"}</span>
      </button>
      {open && (
        <div className="border-t border-border p-3.5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {Object.entries(sentiment.factors).map(([key, value]) => {
              const b = band(value);
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{FACTOR_LABELS[key] ?? key}</span>
                    <span className={b === "strong" ? "font-medium text-signal" : "font-medium text-foreground"}>{b}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${b === "strong" ? "bg-signal" : "bg-foreground/45"}`}
                      style={{ width: `${Math.round(value * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {sentiment.typeMismatch && sentiment.conversationType && (
            <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">watch out · </span>
              {sentiment.conversationType === "emotional"
                ? "They're sharing feelings and you're solving logistics. Meet them where they are before moving anything forward."
                : sentiment.conversationType === "practical"
                  ? "They're trying to sort something practical. Help with the plan first, play after."
                  : "They're in play and connection mode. Match the energy before getting practical."}
            </p>
          )}
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
          {walkAway && (
            <p className="mt-2 rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">real talk · </span>
              Two reads in a row say this one&apos;s not being met with much. You can keep going and
              I&apos;ll keep helping, but the strongest move might be spending this energy on someone
              who matches it. Your call, no judgement.
            </p>
          )}
          <div className="mt-3">
            <ShareCard
              kind="read"
              label="share this read"
              params={{
                sig: sentiment.signal,
                stage: STAGE_LABELS[stage],
                i: band(sentiment.factors.interest),
                w: band(sentiment.factors.warmth),
                r: band(sentiment.factors.reciprocity),
                m: band(sentiment.factors.responsiveness),
              }}
              quoteOptions={messages
                .filter((m) => m.speaker === "match")
                .slice(-6)
                .map((m) => m.text)}
              consentNote="No names on the card, bands only. Their words appear only if you pick a line below, and you see the exact image before anything leaves this device."
            />
          </div>
        </div>
      )}
    </section>
  );
}

function ReplyCard({
  reply,
  index,
  sent,
  dimmed,
  onCopied,
  onSent,
}: {
  reply: CoachingResponse["replies"][number];
  index: number;
  sent: boolean;
  dimmed: boolean;
  onCopied: () => void;
  onSent: () => void;
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

  if (dimmed) {
    return (
      <div className="rounded-2xl border border-border/50 px-4 py-2.5 opacity-40">
        <p className="truncate text-sm">{reply.text}</p>
      </div>
    );
  }

  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-2 rounded-2xl border bg-card p-4 ${sent ? "border-primary/60" : "border-border"}`}
      style={{ animationDelay: `${index * 90}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
          {reply.style}
        </span>
        {sent && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            sent ✓
          </span>
        )}
      </div>
      <p className="mt-2.5 text-[15px] leading-relaxed">{reply.text}</p>
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => setOpen(!open)} className="text-xs font-medium text-primary/90">
          {open ? "hide" : "why this works"}
        </button>
        {!sent && (
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className={`chip px-3 py-1.5 text-xs font-medium ${copied ? "!text-primary" : ""}`}
            >
              {copied ? "copied" : "copy"}
            </button>
            <button
              onClick={onSent}
              className="btn-primary !rounded-full px-3 py-1.5 text-xs"
            >
              I sent this
            </button>
          </div>
        )}
      </div>
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
  messages,
  stage,
  walkAway,
  timingNote,
  gateActive,
  personaId,
  factSuggestions,
  onFactsDone,
  checkInDue,
  onCheckIn,
  onAppend,
  onRecoach,
  onXP,
  onSent,
  onPickStyle,
  onOwnAttemptGraded,
  loading,
  error,
}: {
  coaching: CoachingResponse;
  messages: TranscriptEntry[];
  stage: Stage;
  walkAway: boolean;
  timingNote: string | null;
  gateActive: boolean;
  personaId: string | null;
  factSuggestions: { type: FactType; text: string; quote: string }[];
  onFactsDone: () => void;
  checkInDue: boolean;
  onCheckIn: (outcome: "met" | "fizzled" | null) => void;
  onAppend: () => void;
  onRecoach: (tone: Tone) => void;
  onXP: (points: number) => void;
  onSent: (reply: { text: string; style: string }) => void;
  onPickStyle: (style: string) => void;
  onOwnAttemptGraded: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [tone, setTone] = useState<Tone | null>(null);
  const [gate, setGate] = useState(gateActive);
  const [sentIndex, setSentIndex] = useState<number | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  function handleSent(i: number) {
    setSentIndex(i);
    onSent(coaching.replies[i]);
    onPickStyle(coaching.replies[i].style);
    onXP(sentXP());
  }

  return (
    <div className="flex flex-1 flex-col gap-5 animate-in fade-in duration-300">
      {checkInDue && (
        <section className="rounded-2xl border border-primary/25 bg-card p-4">
          <h2 className="text-sm font-medium">quick one, did you two meet up?</h2>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                onCheckIn("met");
                onXP(100);
              }}
              className="btn-primary flex-1 !rounded-xl py-2.5 text-sm"
            >
              we met 🎉
            </button>
            <button onClick={() => onCheckIn(null)} className="btn-secondary flex-1 !rounded-xl py-2.5 text-sm !font-normal">
              not yet
            </button>
            <button
              onClick={() => onCheckIn("fizzled")}
              className="btn-secondary flex-1 !rounded-xl py-2.5 text-sm !font-normal text-muted-foreground"
            >
              it fizzled
            </button>
          </div>
        </section>
      )}

      <Conversation messages={messages} loading={loading} onAppend={onAppend} />

      <ReadStrip coaching={coaching} messages={messages} stage={stage} walkAway={walkAway} timingNote={timingNote} />

      {personaId && factSuggestions.length > 0 && (
        <FactSuggestions personaId={personaId} suggestions={factSuggestions} onDone={onFactsDone} />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

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
          <div>
            <h2 className="mb-3 text-[13px] font-medium lowercase text-muted-foreground">
              what I&apos;d send
            </h2>
            {loading ? (
              /* Skeletons in place while re-coaching - the shape of what's coming. */
              <div className="flex flex-col gap-3">
                <div className="skeleton h-28" />
                <div className="skeleton h-28 [animation-delay:120ms]" />
                <div className="skeleton h-28 [animation-delay:240ms]" />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {coaching.replies.map((r, i) => (
                  <ReplyCard
                    key={`${coaching.conversationId}-${i}-${r.text.slice(0, 12)}`}
                    reply={r}
                    index={i}
                    sent={sentIndex === i}
                    dimmed={sentIndex !== null && sentIndex !== i}
                    onCopied={() => {
                      onXP(copyXP());
                      onPickStyle(r.style);
                    }}
                    onSent={() => handleSent(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {sentIndex !== null ? (
            <div className="rounded-2xl bg-secondary/50 p-4 text-center animate-in fade-in">
              <p className="text-sm">Nice. Come back when they reply.</p>
              <button onClick={onAppend} className="mt-2 text-xs font-medium text-primary">
                ＋ add their reply
              </button>
            </div>
          ) : (
            <>
              <YourTurn
                messages={messages}
                suggestions={coaching.replies.map((r) => r.text)}
                conversationId={coaching.conversationId}
                onXP={onXP}
                onGraded={onOwnAttemptGraded}
                gateMode={false}
              />
              <ProfileCard />
            </>
          )}

          <div>
            <button
              onClick={() => setOptionsOpen(!optionsOpen)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {optionsOpen ? "hide options" : "coaching options"}
            </button>
            {optionsOpen && (
              <div className="mt-3 flex flex-col gap-3 animate-in fade-in">
                <div>
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
                        className={`px-3.5 py-1.5 text-sm ${tone === t ? "chip-active" : "chip"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {personaId && (
                  <>
                    <PersonaPanel personaId={personaId} />
                    <SelfPanel personaId={personaId} />
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">resonance</p>
                      <ResonancePanel personaId={personaId} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
