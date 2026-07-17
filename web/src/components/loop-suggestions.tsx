"use client";

import { useState } from "react";
import { addLoops, type LoopKind, type LoopOwner } from "@/lib/loops";

const KIND_LABELS: Record<LoopKind, string> = {
  story: "story promised",
  plan: "plan seeded",
  bit: "running bit",
  claim: "claim made",
};

/** Post-coaching review of detected open loops: suggested, never silently saved. */
export function LoopSuggestions({
  personaId,
  threadId,
  suggestions,
  onDone,
}: {
  personaId: string;
  threadId: string;
  suggestions: { kind: LoopKind; owner: LoopOwner; text: string; quote: string }[];
  onDone: () => void;
}) {
  const [remaining, setRemaining] = useState(suggestions);

  if (remaining.length === 0) return null;

  function resolve(index: number, keep: boolean) {
    const s = remaining[index];
    if (keep) addLoops([{ ...s, personaId, threadId }]);
    const next = remaining.filter((_, i) => i !== index);
    setRemaining(next);
    if (next.length === 0) onDone();
  }

  return (
    <section className="rounded-2xl border border-primary/25 bg-card p-4">
      <h2 className="text-sm font-medium">open loops I noticed</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Promises and running bits worth closing in person. Only saved if you keep them.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {remaining.map((s, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary/60 p-2.5">
            <div className="flex-1">
              <p className="text-sm">{s.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                {KIND_LABELS[s.kind]}
                {s.owner === "user" ? " · yours to deliver" : s.owner === "match" ? " · theirs" : " · shared"}
                {s.quote ? ` · "${s.quote}"` : ""}
              </p>
            </div>
            <button onClick={() => resolve(i, true)} className="text-xs font-medium text-primary">
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
