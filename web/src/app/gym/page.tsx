"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AppHeader } from "@/components/app-header";
import { useXP } from "@/lib/useXP";
import { textingDNA, recordGrade, useGrades } from "@/lib/grades";
import type { GradeResponse } from "@/lib/types";
import { isNearDuplicate } from "@/lib/xp";
import { GradeCard } from "@/components/your-turn";
import { track } from "@/lib/analytics";
import {
  drillDoneToday,
  generateDrill,
  gymStreak,
  gymXP,
  recordDrill,
  useGymDrills,
  type GeneratedDrill,
} from "@/lib/gym";
import { getThreadsServerSnapshot, getThreadsSnapshot, subscribeThreads } from "@/lib/threads";

const DIM_HINT: Record<string, string> = {
  warmth: "your warmth is your lowest score right now",
  specificity: "specificity is your lowest score right now",
  reciprocity: "reciprocity is your lowest score right now",
  naturalness: "naturalness is your lowest score right now",
};

/**
 * Practice Gym (R3 F): one drill a day, from your own history, aimed at your
 * weakest dimension. Skill-proactive, not conversation-reactive. Deferred
 * generation keeps Math.random/Date.now off the render path (React Compiler).
 */
export default function GymPage() {
  const xp = useXP();
  const grades = useGrades();
  const drills = useGymDrills();
  const threads = useSyncExternalStore(subscribeThreads, getThreadsSnapshot, getThreadsServerSnapshot);

  const [attempt, setAttempt] = useState("");
  const [grade, setGrade] = useState<GradeResponse | null>(null);
  const [earned, setEarned] = useState(0);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [constraintMiss, setConstraintMiss] = useState<string | null>(null);

  // Drill generation is pure and deterministic, so it's computed in render from the
  // live stores. Only the calendar-day checks touch Date.now(), which the React
  // Compiler forbids in render - defer that to a mount effect (TRANSFER §6 pattern).
  const dna = textingDNA(grades);
  const drill: GeneratedDrill | null = generateDrill(threads, dna, drills.length);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);
  const doneToday = now === null ? null : drillDoneToday(drills, now);
  const streak = now === null ? 0 : gymStreak(drills, now);

  async function submit() {
    if (!drill) return;
    setError(null);
    setConstraintMiss(null);
    // Mechanical constraint pre-check before spending a grade round-trip.
    if (drill.constraint.check && !drill.constraint.check(attempt)) {
      setConstraintMiss(drill.constraint.checkFailMsg ?? "that didn't meet the constraint, try again.");
      return;
    }
    // Anti-gaming: pasting the moment back isn't practice.
    if (isNearDuplicate(attempt, [drill.momentText])) {
      setConstraintMiss("say something of your own, not theirs back to them.");
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
          messages: [{ speaker: "match", text: drill.momentText, order: 0 }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "grading failed");
      const g = data as GradeResponse;
      recordGrade(g); // feeds DNA + practice streak (no threadId: not a thread)
      recordDrill(drill.momentText, drill.constraint.id, drill.dim, g.overallScore);
      const streak = gymStreak([...drills, { id: "", at: Date.now(), momentText: "", constraintId: "", dim: drill.dim, grade: 0 }]);
      const points = gymXP(streak);
      xp.award(points);
      track("own_attempt_graded", { score: g.overallScore, gym: true });
      setGrade(g);
      setEarned(points);
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong, try again");
    } finally {
      setGrading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <AppHeader backHref="/you" />

      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">the gym</h1>
        {streak > 1 && <span className="text-sm text-signal">{streak} day streak</span>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Three minutes. A real moment from your chats, one constraint, aimed at what your
        texting DNA says is weakest.
      </p>

      {doneToday === null ? (
        <div className="skeleton mt-6 h-40" />
      ) : grade ? (
        <div className="mt-6">
          <GradeCard grade={grade} earned={earned} />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            That&apos;s today&apos;s rep. Come back tomorrow to keep the streak.
          </p>
        </div>
      ) : doneToday ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm">Today&apos;s drill is done. 💪</p>
          <p className="mt-1 text-sm text-muted-foreground">
            One a day. Come back tomorrow for the next one.
          </p>
        </div>
      ) : !drill ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Your gym builds from your real conversations. Coach a chat and grade an attempt or
            two first, then daily drills unlock here, aimed at your weakest dimension.
          </p>
        </div>
      ) : (
        <section className="mt-7">
          <p className="text-[11px] lowercase tracking-wide text-muted-foreground">
            today&apos;s drill · {DIM_HINT[drill.dim]}
          </p>
          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] lowercase tracking-wide text-muted-foreground">they said</p>
            <p className="mt-1 text-[15px]">{drill.momentText}</p>
            <div className="mt-4 rounded-xl bg-secondary/60 p-3">
              <p className="text-sm">
                <span className="font-medium">your constraint · </span>
                {drill.constraint.label}
              </p>
            </div>
          </div>

          <textarea
            value={attempt}
            onChange={(e) => {
              setAttempt(e.target.value);
              setConstraintMiss(null);
            }}
            placeholder="Your reply, within the constraint"
            rows={2}
            className="mt-3 w-full resize-none rounded-2xl border border-border bg-card p-3.5 text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/60"
          />
          {constraintMiss && <p className="mt-2 text-xs text-muted-foreground">{constraintMiss}</p>}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <button
            onClick={submit}
            disabled={attempt.trim().length === 0 || grading}
            className="btn-primary mt-3 w-full py-3 text-sm"
          >
            {grading ? "Grading…" : "Grade my rep"}
          </button>
        </section>
      )}
    </main>
  );
}
