"use client";

import { useState } from "react";
import type { TranscriptEntry } from "@/lib/types";

export function Confirm({
  messages,
  onChange,
  onConfirm,
  loading,
  error,
}: {
  messages: TranscriptEntry[];
  onChange: (msgs: TranscriptEntry[]) => void;
  onConfirm: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [editing, setEditing] = useState<number | null>(null);

  function toggleSpeaker(i: number) {
    onChange(
      messages.map((m, j) =>
        j === i ? { ...m, speaker: m.speaker === "user" ? "match" : "user" } : m,
      ),
    );
  }

  function setText(i: number, text: string) {
    onChange(messages.map((m, j) => (j === i ? { ...m, text } : m)));
  }

  function remove(i: number) {
    onChange(messages.filter((_, j) => j !== i));
  }

  return (
    <div className="flex flex-1 flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h1 className="text-2xl font-semibold tracking-tight">Did I get this right?</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your messages on the right, theirs on the left. Tap a bubble to swap sides, tap ✎ to fix
        the text.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`group flex items-start gap-1.5 ${m.speaker === "user" ? "flex-row-reverse" : ""}`}
          >
            {editing === i ? (
              <textarea
                autoFocus
                defaultValue={m.text}
                rows={2}
                className="w-full max-w-[80%] rounded-2xl border border-ring/60 bg-card p-3 text-[15px] focus:outline-none"
                onBlur={(e) => {
                  const t = e.target.value.trim();
                  if (t) setText(i, t);
                  else remove(i);
                  setEditing(null);
                }}
              />
            ) : (
              <button
                onClick={() => toggleSpeaker(i)}
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-left text-[15px] leading-snug transition-transform active:scale-[0.98] ${
                  m.speaker === "user"
                    ? "rounded-br-md bg-primary/90 text-primary-foreground"
                    : "rounded-bl-md bg-secondary text-secondary-foreground"
                }`}
              >
                {m.text}
              </button>
            )}
            {editing !== i && (
              <button
                aria-label="edit message"
                onClick={() => setEditing(i)}
                className="mt-2 text-xs text-muted-foreground/50 transition-colors hover:text-foreground"
              >
                ✎
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
        <span>← them</span>
        <span>you →</span>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <button
        onClick={onConfirm}
        disabled={loading || messages.length === 0}
        className="mt-8 w-full rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground transition-opacity disabled:opacity-30"
      >
        {loading ? "Thinking it through…" : "Looks right — coach me"}
      </button>
    </div>
  );
}
