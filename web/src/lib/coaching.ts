import type { CoachingResponse, Sentiment, Tone, TranscriptEntry } from "./types";
import { getPersona } from "./persona";
import { renderFact, selectFacts } from "./salience";
import { analyzePace, paceContextLine } from "./timing";
import { stageFor } from "./stage";
import { getFlywheelSnapshot, scoreMapFor } from "./flywheel";

/**
 * One place that assembles a coaching request (persona salience, pace, context tag)
 * and calls /api/coach. Used by /new (first coaching) and /t/[id] (re-coach, append).
 * Returns the injected fact ids so "I sent this" can close the callback ledger.
 */
export async function requestCoaching(args: {
  threadId: string;
  messages: TranscriptEntry[];
  analyses: Sentiment[];
  personaId: string | null;
  profileSummary: string;
  tone?: Tone;
}): Promise<{ response: CoachingResponse; injectedFactIds: string[] }> {
  const ordered = args.messages.map((m, i) => ({ ...m, order: i }));
  const stage = stageFor(ordered.length, args.analyses);
  const persona = args.personaId ? getPersona(args.personaId) : undefined;
  // Flywheel scores bend salience: facts that landed before surface more, flopped ones sink.
  const outcomeScores = args.personaId ? scoreMapFor(getFlywheelSnapshot(), args.personaId) : undefined;
  const selected = persona
    ? selectFacts(persona.facts, ordered.slice(-6), stage, Date.now(), 4, outcomeScores)
    : [];
  const pace = paceContextLine(analyzePace(ordered), new Date());
  const contextLine = persona && persona.contextType !== "date"
    ? `this is a ${persona.contextType} conversation, keep it appropriate to that`
    : "";
  const profileSummary = [args.profileSummary, contextLine].filter(Boolean).join(". ");

  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: args.threadId,
      messages: ordered,
      ...(args.tone ? { tone: args.tone } : {}),
      ...(profileSummary ? { profileSummary } : {}),
      ...(selected.length > 0 ? { personaFacts: selected.map(renderFact) } : {}),
      ...(pace ? { paceContext: pace } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "coaching failed");
  return { response: data as CoachingResponse, injectedFactIds: selected.map((f) => f.id) };
}
