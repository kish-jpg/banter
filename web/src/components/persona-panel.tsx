"use client";

import { useState, useSyncExternalStore } from "react";
import {
  addFacts,
  createPersona,
  deleteFact,
  getPersonasSnapshot,
  getPersonasServerSnapshot,
  isSensitiveFact,
  subscribePersonas,
  updateFact,
  updatePersona,
  type ContextType,
  type FactType,
  type Persona,
} from "@/lib/persona";

const CONTEXTS: ContextType[] = ["date", "friend", "business"];

export function usePersonas(): Persona[] {
  return useSyncExternalStore(subscribePersonas, getPersonasSnapshot, getPersonasServerSnapshot);
}

/** Chip-row picker: pick an existing persona or create one inline. */
export function PersonaPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const personas = usePersonas();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [context, setContext] = useState<ContextType>("date");

  return (
    <div>
      <p className="text-xs text-muted-foreground">who&apos;s this with?</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(selectedId === p.id ? null : p.id)}
            className={`px-3 py-1.5 text-sm ${selectedId === p.id ? "chip-active" : "chip"}`}
          >
            {p.name}
          </button>
        ))}
        {naming ? (
          <span className="flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="their name"
              className="w-28 rounded-full border border-ring/60 bg-card px-3 py-1.5 text-sm focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  const p = createPersona(name.trim(), context);
                  onSelect(p.id);
                  setNaming(false);
                  setName("");
                }
              }}
            />
            {CONTEXTS.map((c) => (
              <button
                key={c}
                onClick={() => setContext(c)}
                className={`px-2 py-1 text-xs ${context === c ? "chip-active" : "chip"}`}
              >
                {c}
              </button>
            ))}
          </span>
        ) : (
          <button
            onClick={() => setNaming(true)}
            className="rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            + new
          </button>
        )}
      </div>
    </div>
  );
}

const FACT_TYPES: FactType[] = ["interest", "dislike", "story", "inside-joke", "boundary", "logistics", "hook"];

/** Collapsible view/edit surface - the transparency mechanism for strict provenance. */
export function PersonaPanel({ personaId }: { personaId: string }) {
  const personas = usePersonas();
  const persona = personas.find((p) => p.id === personaId);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState("");
  const [addType, setAddType] = useState<FactType>("interest");
  const [blocked, setBlocked] = useState(false);

  if (!persona) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
        <span className="text-sm font-medium">
          what I know about {persona.name}
          <span className="ml-2 text-xs text-muted-foreground">({persona.facts.length})</span>
        </span>
        <span className="text-xs text-muted-foreground">{open ? "hide" : "view / edit"}</span>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            {CONTEXTS.map((c) => (
              <button
                key={c}
                onClick={() => updatePersona(persona.id, { contextType: c })}
                className={`px-2.5 py-1 text-xs ${persona.contextType === c ? "chip-active" : "chip"}`}
              >
                {c}
              </button>
            ))}
          </div>
          {persona.facts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing yet. Facts appear here as conversations are imported, only from their own words.
            </p>
          )}
          {persona.facts.map((f) => (
            <div key={f.id} className="group rounded-xl bg-secondary/60 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <input
                  defaultValue={f.text}
                  onBlur={(e) => {
                    const t = e.target.value.trim();
                    if (t && t !== f.text) updateFact(persona.id, f.id, t);
                  }}
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
                <button
                  aria-label="delete fact"
                  onClick={() => deleteFact(persona.id, f.id)}
                  className="text-muted-foreground/40 transition-colors hover:text-destructive"
                >
                  ×
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {f.type}
                {f.quote ? ` · they said: "${f.quote}"` : f.source === "manual" ? " · added by you" : ""}
              </p>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-2">
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value as FactType)}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-muted-foreground focus:outline-none"
            >
              {FACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              value={adding}
              onChange={(e) => {
                setAdding(e.target.value);
                setBlocked(false);
              }}
              placeholder="add something you know"
              className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring/60"
              onKeyDown={(e) => {
                if (e.key === "Enter" && adding.trim()) {
                  if (isSensitiveFact(adding)) {
                    setBlocked(true);
                    return;
                  }
                  addFacts(persona.id, [{ type: addType, text: adding.trim(), quote: "", source: "manual" }]);
                  setAdding("");
                }
              }}
            />
          </div>
          {blocked && (
            <p className="text-xs text-muted-foreground">
              Banter doesn&apos;t store facts about religion, health, orientation, politics, or money,
              theirs to share, not ours to file.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** Post-coaching review of auto-extracted facts: suggested, never silently saved. */
export function FactSuggestions({
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
    if (keep) addFacts(personaId, [{ ...s, source: "conversation" }]);
    const next = remaining.filter((_, i) => i !== index);
    setRemaining(next);
    if (next.length === 0) onDone();
  }

  return (
    <section className="rounded-2xl border border-primary/25 bg-card p-4">
      <h2 className="text-sm font-medium">I picked up on a few things</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Only saved if you keep them.</p>
      <div className="mt-2 flex flex-col gap-2">
        {remaining.map((s, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary/60 p-2.5">
            <div className="flex-1">
              <p className="text-sm">{s.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">they said: &quot;{s.quote}&quot;</p>
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
