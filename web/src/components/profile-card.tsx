"use client";

import { useState } from "react";
import { useProfile } from "@/lib/profile";

const GOALS = ["dating apps", "someone specific", "general social"];
const STYLES = ["playful", "dry", "warm", "direct"];

/**
 * Light profile capture/edit. Default mode: shown once after the first value moment,
 * dismissible, hides when filled. persistent mode (/you): always visible, edits save
 * immediately.
 */
export function ProfileCard({ persistent = false }: { persistent?: boolean }) {
  const { profile, save } = useProfile();
  const [goal, setGoal] = useState("");
  const [style, setStyle] = useState("");

  if (!persistent && (profile.dismissed || profile.goal)) return null;

  const activeGoal = persistent ? profile.goal : goal;
  const activeStyle = persistent ? profile.style : style;

  function pickGoal(g: string) {
    if (persistent) save({ goal: g });
    else setGoal(g);
  }
  function pickStyle(s: string) {
    if (persistent) save({ style: s });
    else setStyle(s);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium">make it sound like you</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {persistent ? "Tweaks apply to every suggestion. Stays on this device." : "Two taps, better replies. Stays on this device."}
          </p>
        </div>
        {!persistent && (
          <button
            aria-label="dismiss"
            onClick={() => save({ dismissed: true })}
            className="text-muted-foreground/50 transition-colors hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">this is for…</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {GOALS.map((g) => (
          <button
            key={g}
            onClick={() => pickGoal(g)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              activeGoal === g
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
            onClick={() => pickStyle(s)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              activeStyle === s
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {persistent && (
        <input
          defaultValue={profile.note}
          placeholder="anything else? (e.g. I hate small talk)"
          onBlur={(e) => save({ note: e.target.value.trim() })}
          className="mt-3 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring/60"
        />
      )}
      {!persistent && (goal || style) && (
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
