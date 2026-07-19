"use client";

import { use, useEffect, useState, useSyncExternalStore } from "react";
import { AppHeader } from "@/components/app-header";
import { usePersonas } from "@/components/persona-panel";
import type { PersonaFact } from "@/lib/persona";
import { useGrades } from "@/lib/grades";
import { bitsAlive, debtList, openLoops, setLoopStatus, useLoops, type LoopItem } from "@/lib/loops";
import { dueCards, quizMastery, recordAnswer, useQuizStates } from "@/lib/quiz";
import { independenceRatio, readinessBand, readinessScore, storiesOwnedRatio } from "@/lib/readiness";
import { getThreadsServerSnapshot, getThreadsSnapshot, subscribeThreads } from "@/lib/threads";
import { ResonancePanel } from "@/components/resonance-panel";

/**
 * The date brief (PRD §7.5): one screen, 30 seconds, the night before or in the uber.
 * Facts to cold memory, stories owned, loops to close, bits as safety net, the
 * do-not-force list. Rote-learning the night before is what this replaces.
 */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="section-label">{children}</h2>;
}

/** Card front: enough to jog, not enough to read. First words only. */
function quizHint(text: string): string {
  const words = text.trim().split(/\s+/);
  return words.slice(0, Math.min(3, Math.max(1, words.length - 1))).join(" ") + " …";
}

function QuizDrill({ facts, personaId }: { facts: PersonaFact[]; personaId: string }) {
  const states = useQuizStates();
  const [revealed, setRevealed] = useState(false);
  // Date.now() deferred off the render path (React Compiler purity lint — see TRANSFER §6).
  // A mount-time clock is fine: answers stamp real time and push cards ≥1 day out.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);

  if (now === null) return <div className="skeleton mt-3 h-32" />;

  const due = dueCards(facts, states, now);
  const card = due[0];

  if (!card) {
    return (
      <p className="mt-3 rounded-2xl bg-secondary/50 p-4 text-sm text-muted-foreground">
        Nothing due right now. Cards come back on a 1, 3, 7, 14 day rhythm: spaced beats crammed.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{card.type}</span>
        <span className="text-xs text-muted-foreground">{due.length} due</span>
      </div>
      <p className="mt-3 text-[15px]">{revealed ? card.text : quizHint(card.text)}</p>
      {revealed && card.quote && (
        <p className="mt-1 text-xs text-muted-foreground/70">they said: &quot;{card.quote}&quot;</p>
      )}
      {revealed ? (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              recordAnswer(card, personaId, true);
              setRevealed(false);
            }}
            className="btn-primary flex-1 !rounded-xl py-2.5 text-sm"
          >
            had it cold
          </button>
          <button
            onClick={() => {
              recordAnswer(card, personaId, false);
              setRevealed(false);
            }}
            className="btn-secondary flex-1 !rounded-xl py-2.5 text-sm !font-normal"
          >
            not yet
          </button>
        </div>
      ) : (
        <button onClick={() => setRevealed(true)} className="btn-secondary mt-4 w-full py-2.5 text-sm">
          say it out loud, then check
        </button>
      )}
    </div>
  );
}

function LoopRow({ loop, action }: { loop: LoopItem; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-secondary/60 p-2.5">
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${loop.status === "owned" ? "text-muted-foreground line-through decoration-primary/50" : ""}`}>
          {loop.text}
        </p>
        {loop.quote && <p className="mt-0.5 truncate text-xs text-muted-foreground/70">&quot;{loop.quote}&quot;</p>}
      </div>
      {action && (
        <button onClick={action.onClick} className="shrink-0 text-xs font-medium text-primary">
          {action.label}
        </button>
      )}
    </div>
  );
}

const BAND_COPY: Record<string, string> = {
  "not yet": "the gap is retrieval, not content. drill the cards, own the stories.",
  "getting there": "solid base. a few more cold recalls and the owned stories carry you.",
  ready: "you have this in your own words. go be the person from the chat.",
};

export default function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const threads = useSyncExternalStore(subscribeThreads, getThreadsSnapshot, getThreadsServerSnapshot);
  const thread = threads.find((t) => t.id === id);
  const personas = usePersonas();
  const loops = useLoops();
  const states = useQuizStates();
  const grades = useGrades();

  const persona = personas.find((p) => p.id === thread?.personaId);

  if (!thread || !persona) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
        <AppHeader backHref={thread ? `/t/${thread.id}` : "/"} />
        <p className="mt-10 text-center text-sm text-muted-foreground">
          A date brief needs a conversation with a person attached.
        </p>
      </main>
    );
  }

  const debt = debtList(loops, persona.id);
  const open = openLoops(loops, persona.id).filter((l) => !debt.includes(l) && l.kind !== "bit");
  const bits = bitsAlive(loops, persona.id);
  const boundaries = persona.facts.filter((f) => f.type === "boundary");
  const logistics = persona.facts.filter((f) => f.type === "logistics");

  const ownAttempts = grades.filter((g) => g.threadId === thread.id).length;
  const assistedSends = thread.sentReplies?.length ?? 0;
  const score = readinessScore({
    factsCold: quizMastery(persona.facts, states.filter((s) => s.personaId === persona.id)),
    storiesOwned: storiesOwnedRatio(debt),
    independence: independenceRatio(ownAttempts, assistedSends),
  });
  const bandWord = readinessBand(score);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <AppHeader backHref={`/t/${thread.id}`} />

      <h1 className="font-serif text-[2.5rem] leading-none">meeting {persona.name}</h1>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">readiness</span>
          <span className={`text-sm font-semibold ${bandWord === "ready" ? "text-signal" : ""}`}>{bandWord}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-700 ${bandWord === "ready" ? "bg-signal" : "bg-foreground/45"}`}
            style={{ width: `${Math.round(score * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{BAND_COPY[bandWord]}</p>
      </section>

      <section className="mt-7">
        <SectionLabel>resonance — what you two actually share</SectionLabel>
        <div className="mt-3">
          <ResonancePanel personaId={persona.id} />
        </div>
      </section>

      {persona.facts.length > 0 && (
        <section className="mt-7">
          <SectionLabel>facts to cold memory</SectionLabel>
          <QuizDrill facts={persona.facts} personaId={persona.id} />
        </section>
      )}

      {debt.length > 0 && (
        <section className="mt-7">
          <SectionLabel>stories you owe: own them out loud</SectionLabel>
          <p className="mt-1 text-xs text-muted-foreground">
            Said while assisted, so real-you delivers them. Tell each one out loud, 60–90 seconds,
            until it&apos;s yours. Not memorized: owned.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {debt.map((l) => (
              <LoopRow
                key={l.id}
                loop={l}
                action={{
                  label: l.status === "owned" ? "undo" : "owned it",
                  onClick: () => setLoopStatus(l.id, l.status === "owned" ? "open" : "owned"),
                }}
              />
            ))}
          </div>
        </section>
      )}

      {(open.length > 0 || bits.length > 0) && (
        <section className="mt-7">
          <SectionLabel>loops to close · bits as safety net</SectionLabel>
          <div className="mt-3 flex flex-col gap-2">
            {open.map((l) => (
              <LoopRow key={l.id} loop={l} action={{ label: "closed", onClick: () => setLoopStatus(l.id, "closed") }} />
            ))}
            {bits.map((l) => (
              <LoopRow key={l.id} loop={l} />
            ))}
          </div>
        </section>
      )}

      {boundaries.length > 0 && (
        <section className="mt-7">
          <SectionLabel>do not force</SectionLabel>
          <div className="mt-3 flex flex-col gap-2">
            {boundaries.map((f) => (
              <p key={f.id} className="rounded-xl bg-secondary/60 p-2.5 text-sm">
                {f.text}
              </p>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The pattern so far: respect the line, they step closer. Keep it that way in person.
          </p>
        </section>
      )}

      {logistics.length > 0 && (
        <section className="mt-7">
          <SectionLabel>their comfort logistics</SectionLabel>
          <div className="mt-3 flex flex-col gap-2">
            {logistics.map((f) => (
              <p key={f.id} className="rounded-xl bg-secondary/60 p-2.5 text-sm">
                {f.text}
              </p>
            ))}
          </div>
        </section>
      )}

      {persona.facts.length === 0 && debt.length === 0 && open.length === 0 && (
        <p className="mt-8 rounded-2xl bg-secondary/50 p-4 text-sm text-muted-foreground">
          Keep the conversation going — facts, promised stories, and running bits collect here
          as they come up, and this turns into your 30-second pre-date brief.
        </p>
      )}
    </main>
  );
}
