"use client";

import { useState, useSyncExternalStore } from "react";
import type { CoachingResponse, Sentiment, Tone, TranscriptEntry } from "@/lib/types";
import { Capture } from "@/components/capture";
import { Confirm } from "@/components/confirm";
import { Coach } from "@/components/coach";
import { Openers } from "@/components/openers";
import { PersonaPicker } from "@/components/persona-panel";
import { useXP } from "@/lib/useXP";
import { useProfile } from "@/lib/profile";
import { getPersona, type FactType } from "@/lib/persona";
import { renderFact, selectFacts } from "@/lib/salience";
import { analyzePace, paceContextLine, timingWatchOut } from "@/lib/timing";
import { needsOwnAttemptFirst, shouldWalkAway, stageFor } from "@/lib/stage";
import {
  clearAll,
  defaultLabel,
  deleteThread,
  getThreadsServerSnapshot,
  getThreadsSnapshot,
  patchThread,
  saveThread,
  subscribeThreads,
  type Thread,
} from "@/lib/threads";

type Step = "capture" | "openers" | "append" | "confirm" | "coach";

const CHECK_IN_QUIET_MS = 48 * 3600 * 1000;

// Module scope: the React Compiler treats component-body closures as memoizable and
// rejects Date.now() there; this is event-time logic, not render logic.
function checkInDueFor(t: Thread): boolean {
  return (
    t.outcome === undefined &&
    Date.now() - t.updatedAt > CHECK_IN_QUIET_MS &&
    stageFor(t.messages.length, t.analyses ?? []) === "momentum"
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>("capture");
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [coaching, setCoaching] = useState<CoachingResponse | null>(null);
  const [threadId, setThreadId] = useState(() => crypto.randomUUID());
  const [threadLabel, setThreadLabel] = useState<string | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Sentiment[]>([]);
  const [assists, setAssists] = useState(0);
  const [factSuggestions, setFactSuggestions] = useState<{ type: FactType; text: string; quote: string }[]>([]);
  const [checkInDue, setCheckInDue] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const xp = useXP();
  const { summary, recordPick } = useProfile();
  const threads = useSyncExternalStore(subscribeThreads, getThreadsSnapshot, getThreadsServerSnapshot);

  const stage = stageFor(messages.length, analyses);

  async function coach(entries: TranscriptEntry[], tone?: Tone) {
    setLoading(true);
    setError(null);
    try {
      const ordered = entries.map((m, i) => ({ ...m, order: i }));
      const persona = personaId ? getPersona(personaId) : undefined;
      const personaFacts = persona
        ? selectFacts(persona.facts, ordered.slice(-6), stage, Date.now()).map(renderFact)
        : [];
      const pace = paceContextLine(analyzePace(ordered), new Date());
      const contextLine = persona && persona.contextType !== "date"
        ? `this is a ${persona.contextType} conversation, keep it appropriate to that`
        : "";
      const profileSummary = [summary, contextLine].filter(Boolean).join(". ");

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: threadId,
          messages: ordered,
          ...(tone ? { tone } : {}),
          ...(profileSummary ? { profileSummary } : {}),
          ...(personaFacts.length > 0 ? { personaFacts } : {}),
          ...(pace ? { paceContext: pace } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "coaching failed");
      const response = data as CoachingResponse;
      const history = [...analyses, response.sentiment].slice(-5);
      const assistCount = assists + 1;
      setCoaching(response);
      setAnalyses(history);
      setAssists(assistCount);
      const label = threadLabel ?? persona?.name ?? defaultLabel(ordered);
      setThreadLabel(label);
      saveThread({
        id: threadId,
        label,
        messages: ordered,
        lastCoaching: response,
        personaId: personaId ?? undefined,
        analyses: history,
        assistsSinceOwnAttempt: assistCount,
      });
      setStep("coach");

      // Fact extraction rides in the background - suggestions surface when ready.
      if (personaId) {
        fetch("/api/facts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: ordered }),
        })
          .then((r) => (r.ok ? r.json() : { facts: [] }))
          .then((d) => setFactSuggestions(d.facts ?? []))
          .catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong, try again");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("capture");
    setMessages([]);
    setCoaching(null);
    setError(null);
    setThreadId(crypto.randomUUID());
    setThreadLabel(null);
    setPersonaId(null);
    setAnalyses([]);
    setAssists(0);
    setFactSuggestions([]);
    setCheckInDue(false);
  }

  function openThread(t: Thread) {
    setThreadId(t.id);
    setThreadLabel(t.label);
    setMessages(t.messages);
    setCoaching(t.lastCoaching);
    setPersonaId(t.personaId ?? null);
    setAnalyses(t.analyses ?? []);
    setAssists(t.assistsSinceOwnAttempt ?? 0);
    setFactSuggestions([]);
    setCheckInDue(checkInDueFor(t));
    setError(null);
    setStep(t.lastCoaching ? "coach" : "confirm");
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <header className="mb-8 flex items-center justify-between">
        <button className="text-lg font-semibold tracking-tight" onClick={reset}>
          banter<span className="text-primary">.</span>
        </button>
        <div className="flex items-center gap-3">
          {xp.total > 0 && (
            <span
              className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
              title={`${xp.into}/${xp.toNext} xp to level ${xp.level + 1}`}
            >
              lv {xp.level} · {xp.total} xp
            </span>
          )}
          {step !== "capture" && (
            <button
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={reset}
            >
              start over
            </button>
          )}
        </div>
      </header>

      {(step === "capture" || step === "append") && (
        <>
          <Capture
            append={step === "append"}
            onExtracted={(msgs) => {
              setMessages(step === "append" ? [...messages, ...msgs] : msgs);
              setStep("confirm");
            }}
          />
          {step === "capture" && (
            <>
              <button
                onClick={() => setStep("openers")}
                className="mt-4 text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                haven&apos;t messaged them yet? start from their profile
              </button>
              {threads.length > 0 && (
                <section className="mt-8">
                  <h2 className="text-sm font-medium text-muted-foreground">pick up where you left off</h2>
                  <div className="mt-3 flex flex-col gap-2">
                    {threads.map((t) => (
                      <div key={t.id} className="group flex items-center gap-2">
                        <button
                          onClick={() => openThread(t)}
                          className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40"
                        >
                          <span className="block truncate text-[15px]">{t.label}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {t.messages.length} messages
                            {t.outcome === "met" ? " · you met 🎉" : ""}
                          </span>
                        </button>
                        <button
                          aria-label={`delete ${t.label}`}
                          onClick={() => deleteThread(t.id)}
                          className="px-1 text-muted-foreground/40 transition-colors hover:text-destructive"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Delete every conversation, persona, and all progress on this device?")) {
                        clearAll();
                        location.reload();
                      }
                    }}
                    className="mt-4 text-xs text-muted-foreground/60 transition-colors hover:text-destructive"
                  >
                    delete everything
                  </button>
                </section>
              )}
            </>
          )}
        </>
      )}

      {step === "openers" && (
        <Openers
          onPersonaCreated={(id, name) => {
            setPersonaId(id);
            setThreadLabel(name);
          }}
          onDone={reset}
        />
      )}

      {step === "confirm" && (
        <div className="flex flex-1 flex-col">
          <Confirm
            messages={messages}
            onChange={setMessages}
            onConfirm={() => coach(messages)}
            loading={loading}
            error={error}
          />
          <div className="mt-6">
            <PersonaPicker selectedId={personaId} onSelect={setPersonaId} />
          </div>
        </div>
      )}

      {step === "coach" && coaching && (
        <Coach
          key={`${threadId}-${analyses.length}`}
          coaching={coaching}
          messages={messages}
          threadLabel={threadLabel}
          stage={stage}
          walkAway={shouldWalkAway(analyses)}
          timingNote={timingWatchOut(analyzePace(messages), new Date())}
          gateActive={needsOwnAttemptFirst(assists, xp.level)}
          personaId={personaId}
          factSuggestions={factSuggestions}
          onFactsDone={() => setFactSuggestions([])}
          checkInDue={checkInDue}
          onCheckIn={(outcome) => {
            patchThread(threadId, { outcome });
            setCheckInDue(false);
          }}
          onRename={(label) => {
            setThreadLabel(label);
            saveThread({
              id: threadId,
              label,
              messages,
              lastCoaching: coaching,
              personaId: personaId ?? undefined,
              analyses,
              assistsSinceOwnAttempt: assists,
            });
          }}
          onAddMore={() => setStep("append")}
          onRecoach={(tone) => coach(messages, tone)}
          onXP={xp.award}
          onPickStyle={recordPick}
          onOwnAttemptGraded={() => {
            setAssists(0);
            patchThread(threadId, { assistsSinceOwnAttempt: 0 });
          }}
          loading={loading}
          error={error}
        />
      )}
    </main>
  );
}
