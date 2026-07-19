"use client";

import { useSyncExternalStore } from "react";
import { AppHeader } from "@/components/app-header";
import { ProfileCard } from "@/components/profile-card";
import { PersonaPanel, usePersonas } from "@/components/persona-panel";
import { DnaRadar } from "@/components/dna-radar";
import { useXP } from "@/lib/useXP";
import { practiceStreak, textingDNA, useGrades } from "@/lib/grades";
import Link from "next/link";
import { archetypeFor } from "@/lib/dna";
import { ShareCard } from "@/components/share-card";
import { SelfPanel } from "@/components/self-panel";
import { drillDoneToday, useGymDrills } from "@/lib/gym";
import {
  clearAll,
  getThreadsServerSnapshot,
  getThreadsSnapshot,
  subscribeThreads,
} from "@/lib/threads";

export default function YouPage() {
  const xp = useXP();
  const personas = usePersonas();
  const grades = useGrades();
  const threads = useSyncExternalStore(subscribeThreads, getThreadsSnapshot, getThreadsServerSnapshot);

  const gymDrills = useGymDrills();

  const dna = textingDNA(grades);
  const streak = practiceStreak(grades);
  const sentCount = threads.reduce((n, t) => n + (t.sentReplies?.length ?? 0), 0);
  const metCount = threads.filter((t) => t.outcome === "met").length;
  const gymDue = dna !== null && !drillDoneToday(gymDrills);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <AppHeader backHref="/" />

      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-[2.75rem] leading-none">you</h1>
        <span className="text-sm text-muted-foreground">level {xp.level}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${Math.round((xp.into / xp.toNext) * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {xp.into}/{xp.toNext} xp to level {xp.level + 1}
        {streak > 1 ? ` · ${streak} day practice streak 🔥` : ""}
      </p>

      <Link
        href="/gym"
        className="card-tap mt-6 flex items-center justify-between p-4"
      >
        <div>
          <p className="text-sm font-medium">the gym</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {dna === null
              ? "grade a few attempts to unlock daily drills"
              : gymDue
                ? "today's 3-minute drill is ready"
                : "today's drill is done, back tomorrow"}
          </p>
        </div>
        {gymDue && <span className="rounded-full bg-signal/12 px-2.5 py-0.5 text-xs font-medium text-signal">due</span>}
      </Link>

      <section className="mt-8">
        <h2 className="section-label">your texting dna</h2>
        {dna ? (
          <div className="mt-3 rounded-2xl border border-border bg-card p-4 pt-6">
            <DnaRadar values={dna} />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              averaged from your last {Math.min(dna.count, 10)} graded attempts
            </p>
            <div className="mt-3 flex justify-center">
              {(() => {
                const arch = archetypeFor(dna);
                return (
                  <ShareCard
                    kind="dna"
                    label={`share your dna · ${arch.name}`}
                    params={{
                      a: arch.name,
                      t: arch.tagline,
                      s1: arch.strengths[0],
                      s2: arch.strengths[1],
                      g: arch.growth,
                      w: String(dna.warmth),
                      sp: String(dna.specificity),
                      rc: String(dna.reciprocity),
                      n: String(dna.naturalness),
                    }}
                    consentNote="This card is about you only: your skill map and archetype. Nothing from any conversation is on it."
                    xpOnShare
                    onXP={xp.award}
                  />
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Write your own reply in any conversation and get it graded. Your skill map
              grows from every attempt.
            </p>
          </div>
        )}
      </section>

      {(sentCount > 0 || metCount > 0) && (
        <section className="mt-6 flex gap-6 px-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{sentCount}</span> replies sent
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{metCount}</span> {metCount === 1 ? "date" : "dates"} 🎉
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{grades.length}</span> own attempts
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="section-label">how you sound</h2>
        <div className="mt-3">
          <ProfileCard persistent />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="section-label">who you are in chat</h2>
        <div className="mt-3">
          <SelfPanel personaId={null} />
        </div>
      </section>

      {personas.length > 0 && (
        <section className="mt-8">
          <h2 className="section-label">people</h2>
          <div className="mt-3 flex flex-col gap-3">
            {personas.map((p) => (
              <PersonaPanel key={p.id} personaId={p.id} />
            ))}
          </div>
        </section>
      )}

      <button
        onClick={() => {
          if (confirm("Delete every conversation, persona, and all progress on this device?")) {
            clearAll();
            location.href = "/";
          }
        }}
        className="mt-12 text-left text-xs text-muted-foreground/60 transition-colors hover:text-destructive"
      >
        delete everything
      </button>
    </main>
  );
}
