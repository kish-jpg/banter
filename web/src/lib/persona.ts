/**
 * Receiver personas (INTENT-PERSONA-ENGINE). Strict provenance: every fact carries
 * the quote it came from and a source of conversation | profile | manual - nothing
 * external. Always visible/editable in the UI. localStorage, wiped by clearAll.
 */

/**
 * R3 bucket vocabulary (decision #1): the original 7 types stay valid — zero
 * migration — and the case-study buckets are ADDED. New extractions use the
 * full list; old stored facts load untouched.
 */
export type FactType =
  | "interest"
  | "dislike"
  | "story"
  | "inside-joke"
  | "boundary"
  | "logistics"
  | "hook"
  | "food"
  | "people-animals"
  | "values"
  | "humor"
  | "love-language"
  | "style"
  | "open-question";

export type ContextType = "date" | "friend" | "business";

export interface PersonaFact {
  id: string;
  type: FactType;
  text: string; // the fact, phrased for prompt injection
  quote: string; // exact words it was derived from ("" for manual entries)
  source: "conversation" | "profile" | "manual";
  addedAt: number;
  timesUsed: number;
  lastUsedAt: number | null;
}

export interface Persona {
  id: string;
  name: string;
  contextType: ContextType;
  facts: PersonaFact[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Sensitive-inference blocklist: fact texts touching these are dropped at intake even
 * when inferable - dignity guard from the intent doc. Checked case-insensitively.
 */
const SENSITIVE_PATTERNS = [
  /religio|christian|muslim|hindu|jewish|buddhis|atheis|church|mosque|temple/i,
  /\bgay\b|\blesbian\b|bisexual|sexual orientation|sexuality/i,
  /diagnos|illness|disease|medication|therapy|mental health|depress|anxiet|adhd/i,
  /ethnicit|race\b|racial/i,
  /politic|voted|conservative|liberal|left-wing|right-wing/i,
  /salary|income|net worth|debt|broke\b/i,
];

export function isSensitiveFact(text: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}

const KEY = "banter.personas";

const listeners = new Set<() => void>();
let cache: Persona[] | null = null;

export function subscribePersonas(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getPersonasSnapshot(): Persona[] {
  if (cache === null) {
    try {
      cache = (JSON.parse(localStorage.getItem(KEY) ?? "[]") as Persona[])
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      cache = [];
    }
  }
  return cache;
}

const EMPTY: Persona[] = [];
export function getPersonasServerSnapshot(): Persona[] {
  return EMPTY;
}

function write(personas: Persona[]) {
  localStorage.setItem(KEY, JSON.stringify(personas));
  cache = null;
  listeners.forEach((cb) => cb());
}

export function getPersona(id: string): Persona | undefined {
  return getPersonasSnapshot().find((p) => p.id === id);
}

export function createPersona(name: string, contextType: ContextType): Persona {
  const persona: Persona = {
    id: crypto.randomUUID(),
    name,
    contextType,
    facts: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  write([...getPersonasSnapshot(), persona]);
  return persona;
}

export function updatePersona(id: string, patch: Partial<Pick<Persona, "name" | "contextType">>) {
  write(getPersonasSnapshot().map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)));
}

export function deletePersona(id: string) {
  write(getPersonasSnapshot().filter((p) => p.id !== id));
}

/** Adds facts, silently dropping sensitive ones and near-duplicate texts (case-insensitive). */
export function addFacts(
  personaId: string,
  facts: Omit<PersonaFact, "id" | "addedAt" | "timesUsed" | "lastUsedAt">[],
): number {
  const persona = getPersona(personaId);
  if (!persona) return 0;
  const existing = new Set(persona.facts.map((f) => f.text.toLowerCase().trim()));
  const fresh = facts
    .filter((f) => !isSensitiveFact(f.text) && !isSensitiveFact(f.quote))
    .filter((f) => !existing.has(f.text.toLowerCase().trim()))
    .map((f) => ({
      ...f,
      id: crypto.randomUUID(),
      addedAt: Date.now(),
      timesUsed: 0,
      lastUsedAt: null,
    }));
  if (fresh.length === 0) return 0;
  write(
    getPersonasSnapshot().map((p) =>
      p.id === personaId ? { ...p, facts: [...p.facts, ...fresh], updatedAt: Date.now() } : p,
    ),
  );
  return fresh.length;
}

export function updateFact(personaId: string, factId: string, text: string) {
  if (isSensitiveFact(text)) return;
  write(
    getPersonasSnapshot().map((p) =>
      p.id === personaId
        ? {
            ...p,
            facts: p.facts.map((f) => (f.id === factId ? { ...f, text } : f)),
            updatedAt: Date.now(),
          }
        : p,
    ),
  );
}

export function deleteFact(personaId: string, factId: string) {
  write(
    getPersonasSnapshot().map((p) =>
      p.id === personaId
        ? { ...p, facts: p.facts.filter((f) => f.id !== factId), updatedAt: Date.now() }
        : p,
    ),
  );
}

/** Callback ledger write path: marks facts as used when a suggestion containing them is sent. */
export function markFactsUsed(personaId: string, factIds: string[]) {
  const ids = new Set(factIds);
  write(
    getPersonasSnapshot().map((p) =>
      p.id === personaId
        ? {
            ...p,
            facts: p.facts.map((f) =>
              ids.has(f.id) ? { ...f, timesUsed: f.timesUsed + 1, lastUsedAt: Date.now() } : f,
            ),
          }
        : p,
    ),
  );
}
