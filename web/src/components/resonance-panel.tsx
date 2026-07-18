"use client";

import { useSyncExternalStore } from "react";
import { getPersonasSnapshot, getPersonasServerSnapshot, subscribePersonas } from "@/lib/persona";
import { selfFactsFor, useSelfFacts } from "@/lib/self";
import { bitsAlive, useLoops } from "@/lib/loops";
import {
  computeLocks,
  cycleTension,
  deleteTension,
  dismissTensionCandidate,
  tensionCandidates,
  trackTension,
  useTensions,
  type TensionState,
} from "@/lib/resonance";

const STATE_LABELS: Record<TensionState, string> = {
  open: "open",
  bridged: "bridged",
  paused: "paused — don't force",
};

/**
 * The resonance map (R3 C): locks · tensions · alive bits. Renders on the
 * persona surfaces and the date brief. Everything traceable to quotes.
 */
export function ResonancePanel({ personaId }: { personaId: string }) {
  const personas = useSyncExternalStore(subscribePersonas, getPersonasSnapshot, getPersonasServerSnapshot);
  const persona = personas.find((p) => p.id === personaId);
  const selfAll = useSelfFacts();
  const loops = useLoops();
  const tensions = useTensions();

  if (!persona) return null;

  const self = selfFactsFor(selfAll, personaId);
  const locks = computeLocks(self, persona.facts);
  const tracked = tensions.filter((t) => t.personaId === personaId);
  // A fact that already formed a lock is shared ground, not a tension candidate.
  const candidates = tensionCandidates(persona.facts, tensions, personaId)
    .filter((f) => !locks.some((l) => l.label === f.text))
    .slice(0, 3);
  const bits = bitsAlive(loops, personaId);

  if (locks.length === 0 && tracked.length === 0 && candidates.length === 0 && bits.length === 0) {
    return (
      <p className="rounded-2xl bg-secondary/50 p-4 text-sm text-muted-foreground">
        Resonance builds as both sides show up in the conversation — shared rare traits,
        honest tensions, and the bits you two keep coming back to will appear here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {locks.map((l) => (
        <div key={l.label} className="rounded-xl bg-secondary/60 p-2.5">
          <p className="text-sm">
            locked · {l.label}{" "}
            {l.tag !== "shared" && <span className="font-semibold text-signal">{l.tag}</span>}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            you: &quot;{l.selfQuote}&quot; · them: &quot;{l.matchQuote}&quot;
          </p>
        </div>
      ))}

      {tracked.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-xl bg-secondary/60 p-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm">tension · {t.factText}</p>
            {t.quote && <p className="mt-0.5 truncate text-xs text-muted-foreground/70">&quot;{t.quote}&quot;</p>}
          </div>
          <button
            onClick={() => cycleTension(t.id)}
            className="chip shrink-0 px-2.5 py-1 text-[11px]"
            title="tap to change state"
          >
            {STATE_LABELS[t.state]}
          </button>
          <button
            aria-label="stop tracking tension"
            onClick={() => deleteTension(t.id)}
            className="text-muted-foreground/40 transition-colors hover:text-destructive"
          >
            ×
          </button>
        </div>
      ))}

      {candidates.map((f) => (
        <div key={f.id} className="flex items-center gap-2 rounded-xl border border-dashed border-border p-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">track as a tension? {f.text}</p>
          </div>
          <button
            onClick={() => trackTension(personaId, f)}
            className="text-xs font-medium text-foreground underline underline-offset-2"
          >
            track
          </button>
          <button
            onClick={() => dismissTensionCandidate(personaId, f.text)}
            className="text-xs text-muted-foreground"
          >
            skip
          </button>
        </div>
      ))}

      {bits.map((b) => (
        <div key={b.id} className="rounded-xl bg-secondary/60 p-2.5">
          <p className="text-sm">
            alive bit · {b.text}
            {(b.seenCount ?? 1) > 1 && <span className="ml-1 font-semibold text-signal">×{b.seenCount}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
