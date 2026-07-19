"use client";

import { use, useSyncExternalStore } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { usePersonas, PersonaPanel } from "@/components/persona-panel";
import { ResonancePanel } from "@/components/resonance-panel";
import { band, stageFor, STAGE_LABELS } from "@/lib/stage";
import { useGrades } from "@/lib/grades";
import { debtList, useLoops } from "@/lib/loops";
import { quizMastery, useQuizStates } from "@/lib/quiz";
import { independenceRatio, readinessBand, readinessScore, storiesOwnedRatio } from "@/lib/readiness";
import { getThreadsServerSnapshot, getThreadsSnapshot, subscribeThreads } from "@/lib/threads";
import type { Sentiment } from "@/lib/types";

/**
 * Person hub (person-first IA): the screen you land on when you tap someone on the
 * home. Answers "who is she and where do we stand" at a glance — the read,
 * resonance, readiness, what you know — then Continue drops into the coach. The
 * coach is a mode you enter from here, not the home for a person.
 */

function BandRow({ label, value }: { label: string; value: number }) {
  const b = band(value);
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[74px] font-mono text-[11px] text-muted-foreground">{label}</span>
      <span className="relative h-[3px] flex-1 bg-foreground/12">
        <span
          className={`absolute left-0 top-0 h-[3px] ${b === "strong" ? "bg-signal" : "bg-foreground/40"}`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </span>
      <span className={`w-[52px] text-right font-mono text-[11px] font-medium ${b === "strong" ? "text-signal" : "text-muted-foreground"}`}>
        {b}
      </span>
    </div>
  );
}

export default function PersonHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const threads = useSyncExternalStore(subscribeThreads, getThreadsSnapshot, getThreadsServerSnapshot);
  const personas = usePersonas();
  const grades = useGrades();
  const loops = useLoops();
  const states = useQuizStates();

  const thread = threads.find((t) => t.id === id);
  const persona = personas.find((p) => p.id === thread?.personaId);

  if (!thread) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
        <AppHeader backHref="/" />
        <p className="mt-10 text-center text-sm text-muted-foreground">This conversation no longer exists.</p>
      </main>
    );
  }

  const read: Sentiment | undefined = thread.analyses?.[thread.analyses.length - 1] ?? thread.lastCoaching?.sentiment;
  const stage = stageFor(thread.messages.length, thread.analyses ?? []);

  let readinessWord: string | null = null;
  if (persona) {
    const debt = debtList(loops, persona.id);
    const ownAttempts = grades.filter((g) => g.threadId === thread.id).length;
    const score = readinessScore({
      factsCold: quizMastery(persona.facts, states.filter((s) => s.personaId === persona.id)),
      storiesOwned: storiesOwnedRatio(debt),
      independence: independenceRatio(ownAttempts, thread.sentReplies?.length ?? 0),
    });
    readinessWord = readinessBand(score);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-28 pt-6">
      <AppHeader backHref="/" />

      <div className="flex items-center gap-3">
        <h1 className="font-serif text-[2.5rem] leading-none">{persona?.name ?? thread.label}</h1>
        {persona && <span className="chip px-2.5 py-1 text-xs">{persona.contextType}</span>}
        {thread.outcome === "met" && <span className="text-sm">🎉</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{STAGE_LABELS[stage]}</p>

      {read ? (
        <section className="mt-5 rounded-2xl border border-border bg-card p-4">
          <p className="font-mono text-[11px] text-muted-foreground">where things stand</p>
          <p className="mt-1.5 mb-4 font-serif text-[18px] leading-snug">{read.signal}</p>
          <div className="flex flex-col gap-2">
            <BandRow label="interest" value={read.factors.interest} />
            <BandRow label="warmth" value={read.factors.warmth} />
            <BandRow label="reciprocity" value={read.factors.reciprocity} />
            <BandRow label="momentum" value={read.factors.responsiveness} />
          </div>
        </section>
      ) : (
        <section className="mt-5 rounded-2xl bg-secondary/50 p-4 text-sm text-muted-foreground">
          Not coached yet. Continue below to get your first read on this one.
        </section>
      )}

      {persona && (
        <>
          <section className="mt-6">
            <p className="mb-2 section-label">what you two share</p>
            <ResonancePanel personaId={persona.id} />
          </section>

          {readinessWord && (
            <Link
              href={`/t/${thread.id}/brief`}
              className="card-tap mt-6 flex items-center justify-between p-4"
            >
              <div>
                <p className="text-sm font-medium">date brief</p>
                <p className="mt-0.5 text-xs text-muted-foreground">readiness: {readinessWord}</p>
              </div>
              <span className="text-muted-foreground">›</span>
            </Link>
          )}

          <section className="mt-6">
            <PersonaPanel personaId={persona.id} />
          </section>
        </>
      )}

      {/* Fat primary, pinned within reach — Continue is the job people come to do. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          href={`/t/${thread.id}/chat`}
          className="btn-primary mx-auto block w-full max-w-lg py-3.5 text-center text-[15px]"
        >
          Continue the conversation
        </Link>
      </div>
    </main>
  );
}
