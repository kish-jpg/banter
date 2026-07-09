"use client";

import { useState } from "react";
import { useProfile } from "@/lib/profile";

const GOALS = ["dating apps", "someone specific", "general social"];
const STYLES = ["playful", "dry", "warm", "direct"];

/** Shown after the first value moment (on the coach screen), never before. One-time, dismissible. */
export function ProfileCard() {
  const { profile, save } = useProfile();
  const [goal, setGoal] = useState("");
  const [style, setStyle] = useState("");

  if (profile.dismissed || profile.goal) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium">make it sound like you</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Two taps, better replies. Stays on this device.
          </p>
        </div>
        <button
          aria-label="dismiss"
          onClick={() => save({ dismissed: true })}
          className="text-muted-foreground/50 transition-colors hover:text-foreground"
        >
          ×
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">this is for…</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {GOALS.map((g) => (
          <button
            key={g}
            onClick={() => setGoal(g)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              goal === g
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">my texting style is…</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {STYLES.map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              style === s
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {(goal || style) && (
        <button
          onClick={() => save({ goal, style })}
          className="mt-4 w-full rounded-xl bg-secondary py-2.5 text-sm font-semibold"
        >
          got it, use this
        </button>
      )}
    </section>
  );
}
