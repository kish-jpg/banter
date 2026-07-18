"use client";

import { useState } from "react";
import type { FactType } from "@/lib/persona";
import { addSelfFacts, deleteSelfFact, selfFactsFor, updateSelfFact, useSelfFacts } from "@/lib/self";

/**
 * "You in this chat" (R3 B): the chat-self persona, same transparency rules as
 * the receiver panel. personaId=null renders the global you (used on /you).
 */
export function SelfPanel({ personaId }: { personaId: string | null }) {
  const all = useSelfFacts();
  const facts = personaId === null ? all : selfFactsFor(all, personaId);
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
        <span className="text-sm font-medium">
          {personaId === null ? "who you are in chat" : "you in this chat"}
          <span className="ml-2 text-xs text-muted-foreground">({facts.length})</span>
        </span>
        <span className="text-xs text-muted-foreground">{open ? "hide" : "view / edit"}</span>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {facts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing yet. As you chat, the traits and stories you present collect here — the
              chat-you that real-you gets to grow into.
            </p>
          )}
          {facts.map((f) => (
            <div key={f.id} className="rounded-xl bg-secondary/60 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <input
                  defaultValue={f.text}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== f.text) updateSelfFact(f.id, v);
                  }}
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
                <button
                  aria-label="delete self fact"
                  onClick={() => deleteSelfFact(f.id)}
                  className="text-muted-foreground/40 transition-colors hover:text-destructive"
                >
                  ×
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {f.type}
                {f.quote ? ` · you said: "${f.quote}"` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Post-coaching review of extracted self facts: suggested, never silently saved. */
export function SelfFactSuggestions({
  personaId,
  suggestions,
  onDone,
}: {
  personaId: string;
  suggestions: { type: FactType; text: string; quote: string }[];
  onDone: () => void;
}) {
  const [remaining, setRemaining] = useState(suggestions);

  if (remaining.length === 0) return null;

  function resolve(index: number, keep: boolean) {
    const s = remaining[index];
    if (keep) addSelfFacts([{ ...s, personaId, source: "conversation" }]);
    const next = remaining.filter((_, i) => i !== index);
    setRemaining(next);
    if (next.length === 0) onDone();
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-medium">this is how you showed up</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Traits and claims chat-you presented. Keep the ones real-you wants to own.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {remaining.map((s, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary/60 p-2.5">
            <div className="flex-1">
              <p className="text-sm">{s.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">you said: &quot;{s.quote}&quot;</p>
            </div>
            <button onClick={() => resolve(i, true)} className="text-xs font-medium text-foreground underline underline-offset-2">
              keep
            </button>
            <button onClick={() => resolve(i, false)} className="text-xs text-muted-foreground">
              drop
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
