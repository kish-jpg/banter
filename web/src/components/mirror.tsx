"use client";

import { useSyncExternalStore } from "react";
import { useGrades } from "@/lib/grades";
import {
  getThreadsServerSnapshot,
  getThreadsSnapshot,
  subscribeThreads,
  type Thread,
} from "@/lib/threads";
import {
  authenticity,
  authenticityBand,
  fingerprint,
  gapNudge,
  reliance,
  VOICE_AXES,
  type Fingerprint,
} from "@/lib/voice";

/**
 * The mirror (anti-chatfishing): chat-you (the AI-leaning replies you send) vs
 * real-you (your own words). Global on /you; compact per-person on each hub.
 * Real-you = your graded attempts + gym reps (their text). Chat-you = the assisted
 * replies you sent. Everything computed from stores already on device.
 */

function useThreads(): Thread[] {
  return useSyncExternalStore(subscribeThreads, getThreadsSnapshot, getThreadsServerSnapshot);
}

/** Gathers the two voice text sets. threadId null = global across all conversations. */
function useVoiceTexts(threadId: string | null) {
  const grades = useGrades();
  const threads = useThreads();
  const own = grades
    .filter((g) => (threadId ? g.threadId === threadId : true))
    .map((g) => g.text)
    .filter((t): t is string => Boolean(t));
  const assisted = (threadId ? threads.filter((t) => t.id === threadId) : threads)
    .flatMap((t) => t.sentReplies ?? [])
    .map((r) => r.text)
    .filter(Boolean);
  return { own, assisted };
}

const AXIS_LABEL: Record<string, string> = {
  playful: "playful",
  elaborate: "elaborate",
  declarative: "declarative",
  polished: "polished",
};

// 4-axis radar, two overlaid shapes: real-you (green fill) and chat-you (ink dashed).
function VoiceRadar({ real, chat }: { real: Fingerprint; chat: Fingerprint }) {
  const C = 120;
  const R = 74;
  const pt = (fp: Fingerprint, axis: (typeof VOICE_AXES)[number]): [number, number] => {
    const v = fp[axis];
    switch (axis) {
      case "playful":
        return [C, C - R * v];
      case "elaborate":
        return [C + R * v, C];
      case "declarative":
        return [C, C + R * v];
      default:
        return [C - R * v, C];
    }
  };
  const poly = (fp: Fingerprint) => VOICE_AXES.map((a) => pt(fp, a).join(",")).join(" ");
  const grid = (f: number) =>
    [
      [C, C - R * f],
      [C + R * f, C],
      [C, C + R * f],
      [C - R * f, C],
    ]
      .map((p) => p.join(","))
      .join(" ");

  return (
    <svg viewBox="0 0 240 220" className="w-full" role="img" aria-label="chat-you versus real-you voice">
      {[1, 0.5].map((f) => (
        <polygon key={f} points={grid(f)} fill="none" stroke="currentColor" className="text-border" strokeWidth="1" />
      ))}
      <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="currentColor" className="text-border" strokeWidth="1" />
      <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="currentColor" className="text-border" strokeWidth="1" />
      {/* chat-you: ink dashed, no fill */}
      <polygon points={poly(chat)} fill="none" stroke="currentColor" className="text-foreground" strokeWidth="2" strokeDasharray="4 3" />
      {/* real-you: signal green filled */}
      <polygon points={poly(real)} fill="var(--signal-dim)" stroke="var(--signal)" strokeWidth="2.5" strokeLinejoin="round" />
      <text x={C} y="16" textAnchor="middle" fontSize="10.5" className="fill-current text-muted-foreground">playful</text>
      <text x="232" y={C + 4} textAnchor="end" fontSize="10.5" className="fill-current text-muted-foreground">elaborate</text>
      <text x={C} y="212" textAnchor="middle" fontSize="10.5" className="fill-current text-muted-foreground">declarative</text>
      <text x="8" y={C + 4} textAnchor="start" fontSize="10.5" className="fill-current text-muted-foreground">polished</text>
    </svg>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex justify-center gap-5 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-signal" /> <span className="font-medium text-foreground">real you</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border-2 border-foreground" />
        <span className="font-medium text-foreground">chat-you</span>
      </span>
    </div>
  );
}

const EMPTY = (
  <div className="rounded-2xl bg-secondary/50 p-5 text-center text-sm text-muted-foreground">
    Write a few of your own replies (in any conversation or the gym) to reveal your real voice.
    The mirror needs your words to compare chat-you against.
  </div>
);

/** Full global mirror — lives on its own /mirror screen. */
export function Mirror() {
  const { own, assisted } = useVoiceTexts(null);
  const real = fingerprint(own);
  const chat = fingerprint(assisted);

  if (!real) return EMPTY;

  const score = chat ? authenticity(real, chat) : 1;
  const band = authenticityBand(score);
  const nudge = chat ? gapNudge(real, chat) : null;
  const own_ = own.length;
  const rel = Math.round(reliance(own_, assisted.length) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4 pt-5">
        {chat ? <VoiceRadar real={real} chat={chat} /> : <VoiceRadar real={real} chat={real} />}
        <Legend />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">authenticity</span>
          <span className={`text-sm font-semibold ${band === "this is you" ? "text-signal" : ""}`}>{band}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-700 ${band === "this is you" ? "bg-signal" : "bg-foreground/40"}`}
            style={{ width: `${Math.round(score * 100)}%` }}
          />
        </div>
      </div>

      {nudge ? (
        <p className="rounded-xl border border-border bg-card p-3.5 text-sm leading-relaxed text-muted-foreground">
          {nudge}
        </p>
      ) : chat ? (
        <p className="rounded-xl border border-border bg-card p-3.5 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">This is you. </span>
          Chat-you and real-you read like the same person. Whoever you meet will recognise you.
        </p>
      ) : null}

      <div className="border-t border-border pt-3">
        <p className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground/70">your own words</p>
        <p className="mt-1 font-serif text-2xl">
          {rel}%
          <span className="ml-2 align-middle text-xs font-sans text-muted-foreground">
            of what you send is yours
          </span>
        </p>
      </div>
    </div>
  );
}

/** Compact per-person authenticity — on a hub / date brief. */
export function AuthenticityLine({ threadId }: { threadId: string }) {
  const { own, assisted } = useVoiceTexts(threadId);
  const real = fingerprint(own);
  const chat = fingerprint(assisted);

  if (!real || !chat) {
    return (
      <p className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
        Write a few of your own replies here to see how close chat-you is to the real you before you meet.
      </p>
    );
  }

  const score = authenticity(real, chat);
  const band = authenticityBand(score);
  const nudge = gapNudge(real, chat);

  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">meeting as yourself</span>
        <span className={`text-sm font-semibold ${band === "this is you" ? "text-signal" : ""}`}>{band}</span>
      </div>
      <div className="mt-2 flex gap-3">
        {VOICE_AXES.map((a) => (
          <div key={a} className="flex-1">
            <div className="relative h-[3px] bg-foreground/12">
              <span
                className="absolute -top-[3px] h-[9px] w-[9px] rounded-full bg-signal"
                style={{ left: `calc(${Math.round(real[a] * 100)}% - 4px)` }}
              />
              <span
                className="absolute -top-[3px] h-[9px] w-[9px] rounded-full border-2 border-foreground bg-transparent"
                style={{ left: `calc(${Math.round(chat[a] * 100)}% - 4px)` }}
              />
            </div>
            <p className="mt-1.5 text-center text-[9.5px] text-muted-foreground">{AXIS_LABEL[a]}</p>
          </div>
        ))}
      </div>
      {nudge && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{nudge}</p>}
    </div>
  );
}
