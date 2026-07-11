"use client";

import { useEffect, useState } from "react";

/**
 * The onboarding IS the product running: a scripted coaching moment that plays
 * itself in ~8 seconds. No LLM, no network - deterministic and instant.
 */

const SCRIPT = {
  bubbles: [
    { speaker: "match", text: "okay unpopular opinion: cereal is a soup" },
    { speaker: "user", text: "it's a broth-based breakfast and I'll die on this hill with you" },
    { speaker: "match", text: "FINALLY someone gets it. what else you got" },
  ],
  signal: "They're testing if you can play. You passed.",
  factors: [92, 88, 85, 90],
  replies: [
    { style: "playful", text: "hot dogs are sandwiches. crying is hydration. I have a whole manifesto." },
    { style: "direct", text: "plenty. but the good ones need a coffee, not a text thread." },
  ],
  why: "Turning toward a bid · Gottman Method",
};

// step: 0..2 bubbles, 3 read, 4 reply1, 5 reply2, 6 why-tag, 7 rest
const STEP_DELAYS = [400, 1100, 1100, 1000, 900, 700, 900];

export function Demo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEP_DELAYS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_DELAYS[step]);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="rounded-[calc(1.5rem-1px)] bg-card/70 p-4" aria-hidden>
      <div className="flex min-h-[290px] flex-col gap-1.5">
        {SCRIPT.bubbles.map(
          (b, i) =>
            step > i && (
              <div key={i} className={`flex ${b.speaker === "user" ? "justify-end" : ""} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug ${
                    b.speaker === "user"
                      ? "rounded-br-md bg-primary/15"
                      : "rounded-bl-md bg-secondary"
                  }`}
                >
                  {b.text}
                </div>
              </div>
            ),
        )}

        {step > 3 && (
          <div className="mt-2 rounded-xl border border-border bg-background/60 p-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
            <p className="text-xs">{SCRIPT.signal}</p>
            <div className="mt-2 flex gap-2">
              {["interest", "warmth", "reciprocity", "momentum"].map((label, i) => (
                <div key={label} className="flex-1">
                  <div className="h-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000"
                      style={{ width: step > 3 ? `${SCRIPT.factors[i]}%` : "0%" }}
                    />
                  </div>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {SCRIPT.replies.map(
          (r, i) =>
            step > 4 + i && (
              <div key={r.style} className="mt-1.5 rounded-xl border border-border bg-background/60 p-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{r.style}</span>
                  {i === 0 && step > 6 && (
                    <span className="text-[10px] text-primary animate-in fade-in duration-500">{SCRIPT.why}</span>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] leading-snug">{r.text}</p>
              </div>
            ),
        )}
      </div>
    </div>
  );
}
