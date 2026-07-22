"use client";

import type { Persona } from "./persona";
import type { SelfFact } from "./self";
import type { LoopItem } from "./loops";
import type { Thread } from "./threads";
import type { GradeRecord } from "./grades";

/**
 * Shippable demo mode (/demo): a fully-fictional conversation with "Maya" that
 * lights up every surface — persona facts, resonance, the mirror, readiness — so
 * the app can be shown on any device without exposing a real person. NOT real
 * data. `demoData()` is pure (testable); `loadDemo()` writes it to localStorage.
 */

const PID = "demo-maya";
const TID = "demo-thread-maya";

function fact(type: string, text: string, quote: string): Persona["facts"][number] {
  return {
    id: crypto.randomUUID(),
    type: type as Persona["facts"][number]["type"],
    text,
    quote,
    source: "conversation",
    addedAt: Date.now(),
    timesUsed: 0,
    lastUsedAt: null,
  };
}

export interface DemoData {
  personas: Persona[];
  self: SelfFact[];
  loops: LoopItem[];
  threads: Thread[];
  grades: GradeRecord[];
  xp: number;
}

export function demoData(now = Date.now()): DemoData {
  const DAY = 86_400_000;
  const t = (daysAgo: number) => now - daysAgo * DAY;

  const facts = [
    fact("interest", "reorganizes her whole bookshelf by colour at 1am on a whim", "I reorganized my whole bookshelf by colour last night"),
    fact("interest", "used to be in a band — quit it, there's a story there", "the real reason I quit the band"),
    fact("food", "comfort order is a dirty chai with oat milk", "my comfort order is a dirty chai, oat milk, don't judge"),
    fact("people-animals", "has a cat, Miso, who knocks things off shelves", "Miso knocked it off the shelf again, on purpose"),
    fact("values", "a chronic late-night overthinker — same as you", "I'm a chronic overthinker, it's genuinely a problem"),
    fact("boundary", "hates being called 'chill' — she runs hot", "please never call me chill, I am the exact opposite"),
    fact("logistics", "works from home on Tuesdays", "I work from home Tuesdays so those are my slow mornings"),
    fact("story", "moved a lot growing up — six schools", "I went to six different schools growing up"),
    fact("open-question", "still unknown: what she actually does on weekends", ""),
    fact("hook", "the 'chaos section' of her colour-coded bookshelf", "the chaos section is where the real personality lives"),
  ];

  const personas: Persona[] = [
    { id: PID, name: "Maya", contextType: "date", createdAt: t(8), updatedAt: now, facts },
  ];

  const self: SelfFact[] = [
    { id: crypto.randomUUID(), personaId: PID, type: "humor" as SelfFact["type"], text: "playful, teasing, commits to the bit", quote: "unhinged (complimentary)", source: "conversation", addedAt: t(7) },
    { id: crypto.randomUUID(), personaId: PID, type: "interest" as SelfFact["type"], text: "curious — you ask a lot of questions", quote: "wait now I need the whole story", source: "conversation", addedAt: t(7) },
  ];

  const loop = (kind: string, owner: string, text: string, quote: string, d: number, seen = 1): LoopItem => ({
    id: crypto.randomUUID(),
    personaId: PID,
    threadId: TID,
    kind: kind as LoopItem["kind"],
    owner: owner as LoopItem["owner"],
    text,
    quote,
    status: "open",
    addedAt: t(d),
    resolvedAt: null,
    seenCount: seen,
  });
  const loops: LoopItem[] = [
    loop("story", "user", "owes her the story of your worst impulse decision", "okay you have to tell me your worst impulse buy now", 2),
    loop("bit", "mutual", "the 'unhinged (complimentary)' running joke", "unhinged (complimentary)", 3, 4),
    loop("plan", "mutual", "the dirty chai you promised to judge together", "you have to let me judge your chai order in person", 1),
  ];

  const raw: [("user" | "match"), string][] = [
    ["match", "ok this is going to sound insane but I reorganized my whole bookshelf by colour last night"],
    ["user", "unhinged (complimentary). what does the chaos section look like"],
    ["match", "the chaos section is where the real personality lives. it's mostly half-read books and one very confused cat"],
    ["user", "the cat has notes"],
    ["match", "Miso knocked three off the shelf while I was doing it. on purpose. she's a critic"],
    ["user", "a harsh one by the sound of it"],
    ["match", "brutal. she only respects the poetry section"],
    ["user", "ok show me the worst one, the most cursed book in the pile"],
    ["match", "a 2011 self-help book called 'Unf*ck Your Habits' that I have never opened once"],
    ["user", "the irony of it sitting unopened is genuinely perfect"],
    ["match", "it's aspirational clutter. anyway what's your excuse for being up at 1am"],
    ["user", "no excuse, just a chronic inability to end the day. you?"],
    ["match", "I'm a chronic overthinker, it's genuinely a problem. my brain files everything at midnight"],
    ["user", "two overthinkers, this is either going to be great or a disaster"],
    ["match", "probably both, in sequence. speaking of, don't ever call me chill, I run hot"],
    ["user", "noted. so what's the loudest thing you've ever done"],
    ["match", "quit a band the night before our first real gig. long story"],
    ["user", "you cannot drop 'quit a band' and not tell me"],
    ["match", "I'll trade you. worst impulse decision you've ever made, then I'll tell you"],
    ["user", "deal, but only in person, with a coffee"],
    ["match", "a coffee. I only accept a dirty chai, oat milk, don't judge"],
    ["user", "I'm absolutely judging, that's a dessert. but okay, I'll allow it"],
    ["match", "rude. I work from home Tuesdays if you're ever brave enough to test the chai theory"],
    ["user", "tuesday's dangerous, I'd have all day to overthink it"],
    ["match", "we'd both spiral. it'd be efficient at least"],
  ];
  const messages = raw.map((m, i) => ({ speaker: m[0], text: m[1], order: i, ts: t(8 - (i / raw.length) * 7) }));

  const read = (i: number, r: number, w: number, rs: number, signal: string) => ({
    score: (i + r + w + rs) / 4,
    factors: { interest: i, reciprocity: r, warmth: w, responsiveness: rs },
    signal,
    conversationType: "social" as const,
    typeMismatch: false,
  });
  const analyses = [
    read(0.7, 0.7, 0.72, 0.68, "Warming — she's testing if you'll play"),
    read(0.85, 0.8, 0.85, 0.75, "She's in, matching you beat for beat"),
  ];

  const grade = (text: string, w: number, s: number, r: number, n: number): GradeRecord => ({
    at: t(5 - Math.min(4, text.length / 20)),
    overall: (w + s + r + n) / 4,
    dims: { warmth: w, specificity: s, reciprocity: r, naturalness: n },
    threadId: TID,
    text,
  });
  const grades: GradeRecord[] = [
    grade("unhinged (complimentary)", 4, 3, 5, 5),
    grade("the cat has notes", 4, 4, 4, 5),
    grade("ok show me the worst one", 3, 4, 5, 5),
    grade("two overthinkers, this is either going to be great or a disaster", 5, 4, 4, 5),
  ];

  const sentReplies = [
    "That is genuinely one of the most delightfully chaotic things I have heard all week, and I mean that as the highest compliment.",
    "It is honestly so refreshing to meet someone who approaches even their bookshelf with this much creativity and self-awareness.",
    "I find your whole outlook genuinely compelling, and it resonates with how I try to move through the world myself.",
  ].map((text, i) => ({ text, style: "sincere" as const, at: t(3 - i) }));

  const threads: Thread[] = [
    {
      id: TID,
      label: "Maya",
      personaId: PID,
      updatedAt: now,
      messages,
      lastCoaching: {
        conversationId: TID,
        replies: [
          { text: "efficient spiralling is basically a personality match. tuesday it is", psychologyTag: "Turning toward a bid", style: "playful" },
          { text: "I'll bring the impulse-decision story if you bring the band one. fair trade", psychologyTag: "Reciprocal self-disclosure", style: "direct" },
          { text: "one dirty chai, judged in person, no takebacks. what time works", psychologyTag: "Mutual exchange", style: "sincere" },
        ],
        sentiment: analyses[1],
      },
      analyses,
      sentReplies,
      assistsSinceOwnAttempt: 2,
      injectedFactIds: [facts[0].id, facts[4].id],
    },
  ];

  return { personas, self, loops, threads, grades, xp: 420 };
}

/** Writes the demo into localStorage, replacing current state. Client-only. */
export function loadDemo() {
  const d = demoData();
  localStorage.setItem("banter.personas", JSON.stringify(d.personas));
  localStorage.setItem("banter.self", JSON.stringify(d.self));
  localStorage.setItem("banter.loops", JSON.stringify(d.loops));
  localStorage.setItem("banter.threads", JSON.stringify(d.threads));
  localStorage.setItem("banter.grades", JSON.stringify(d.grades));
  localStorage.setItem("banter.xp", String(d.xp));
}
