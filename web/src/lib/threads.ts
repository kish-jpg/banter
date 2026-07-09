import type { CoachingResponse, TranscriptEntry } from "./types";

/**
 * Thread persistence. localStorage-first so the whole loop works before any
 * signup (first-value-before-auth is the UX bar); the same shapes move to
 * Supabase Postgres rows when auth lands. Strictly user-keyed, wiped by clearAll.
 */
export interface Thread {
  id: string;
  label: string;
  messages: TranscriptEntry[];
  lastCoaching: CoachingResponse | null;
  updatedAt: number;
}

const KEY = "banter.threads";

// External-store plumbing so components read threads via useThreads() without
// setState-in-effect (react-hooks lint) or SSR/localStorage clashes.
const listeners = new Set<() => void>();
let snapshotCache: Thread[] | null = null;

export function subscribeThreads(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getThreadsSnapshot(): Thread[] {
  if (snapshotCache === null) {
    snapshotCache = read().sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return snapshotCache;
}

const EMPTY: Thread[] = [];
export function getThreadsServerSnapshot(): Thread[] {
  return EMPTY;
}

function notify() {
  snapshotCache = null;
  listeners.forEach((cb) => cb());
}

function read(): Thread[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Thread[];
  } catch {
    return [];
  }
}

function write(threads: Thread[]) {
  localStorage.setItem(KEY, JSON.stringify(threads));
  notify();
}

export function listThreads(): Thread[] {
  return getThreadsSnapshot();
}

export function getThread(id: string): Thread | undefined {
  return read().find((t) => t.id === id);
}

export function saveThread(thread: Omit<Thread, "updatedAt">): Thread {
  const threads = read();
  const saved: Thread = { ...thread, updatedAt: Date.now() };
  const i = threads.findIndex((t) => t.id === thread.id);
  if (i >= 0) threads[i] = saved;
  else threads.push(saved);
  write(threads);
  return saved;
}

export function renameThread(id: string, label: string) {
  const threads = read();
  const t = threads.find((t) => t.id === id);
  if (t) {
    t.label = label;
    write(threads);
  }
}

export function deleteThread(id: string) {
  write(read().filter((t) => t.id !== id));
}

/** One-tap delete-everything (hard privacy constraint): all conversation data + XP. */
export function clearAll() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith("banter.")) localStorage.removeItem(k);
  }
  notify();
}

/** Default label: the other person's first line, trimmed. */
export function defaultLabel(messages: TranscriptEntry[]): string {
  const firstMatch = messages.find((m) => m.speaker === "match")?.text ?? "new conversation";
  return firstMatch.length > 34 ? `${firstMatch.slice(0, 32)}…` : firstMatch;
}
