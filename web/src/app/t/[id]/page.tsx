"use client";

import { use, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Tone, TranscriptEntry } from "@/lib/types";
import { Coach } from "@/components/coach";
import { Capture } from "@/components/capture";
import { Confirm } from "@/components/confirm";
import { AppHeader } from "@/components/app-header";
import { useXP } from "@/lib/useXP";
import { useProfile } from "@/lib/profile";
import { markFactsUsed, type FactType } from "@/lib/persona";
import { LoopSuggestions } from "@/components/loop-suggestions";
import type { LoopKind, LoopOwner } from "@/lib/loops";
import { requestCoaching } from "@/lib/coaching";
import { analyzePace, timingWatchOut } from "@/lib/timing";
import { needsOwnAttemptFirst, shouldWalkAway, stageFor } from "@/lib/stage";
import {
  deleteThread,
  getThreadsServerSnapshot,
  getThreadsSnapshot,
  patchThread,
  renameThread,
  saveThread,
  subscribeThreads,
  type Thread,
} from "@/lib/threads";

const CHECK_IN_QUIET_MS = 48 * 3600 * 1000;

function checkInDueFor(t: Thread): boolean {
  return (
    t.outcome === undefined &&
    Date.now() - t.updatedAt > CHECK_IN_QUIET_MS &&
    stageFor(t.messages.length, t.analyses ?? []) === "momentum"
  );
}

export default function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const threads = useSyncExternalStore(subscribeThreads, getThreadsSnapshot, getThreadsServerSnapshot);
  const thread = threads.find((t) => t.id === id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factSuggestions, setFactSuggestions] = useState<{ type: FactType; text: string; quote: string }[]>([]);
  const [loopSuggestions, setLoopSuggestions] = useState<
    { kind: LoopKind; owner: LoopOwner; text: string; quote: string }[]
  >([]);
  const [checkInDue, setCheckInDue] = useState(false);
  const [append, setAppend] = useState<"capture" | "confirm" | null>(null);
  const [pendingMessages, setPendingMessages] = useState<TranscriptEntry[]>([]);
  const started = useRef(false);
  const xp = useXP();
  const { summary, recordPick } = useProfile();

  async function coach(t: Thread, messages: TranscriptEntry[], tone?: Tone) {
    setLoading(true);
    setError(null);
    try {
      const { response, injectedFactIds } = await requestCoaching({
        threadId: t.id,
        messages,
        analyses: t.analyses ?? [],
        personaId: t.personaId ?? null,
        profileSummary: summary,
        tone,
      });
      const ordered = messages.map((m, i) => ({ ...m, order: i }));
      const history = [...(t.analyses ?? []), response.sentiment].slice(-5);
      saveThread({
        ...t,
        messages: ordered,
        lastCoaching: response,
        analyses: history,
        assistsSinceOwnAttempt: (t.assistsSinceOwnAttempt ?? 0) + 1,
        injectedFactIds,
      });
      setAppend(null);
      if (t.personaId) {
        fetch("/api/facts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: ordered }),
        })
          .then((r) => (r.ok ? r.json() : { facts: [] }))
          .then((d) => setFactSuggestions(d.facts ?? []))
          .catch(() => {});
        fetch("/api/loops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: ordered }),
        })
          .then((r) => (r.ok ? r.json() : { loops: [] }))
          .then((d) => setLoopSuggestions(d.loops ?? []))
          .catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong, try again");
    } finally {
      setLoading(false);
    }
  }

  // First visit to a freshly-created thread: coaching starts itself. The timeout moves
  // state updates off the effect's sync call stack (react-hooks/set-state-in-effect);
  // the started guard lives INSIDE it so StrictMode's mount-cleanup-mount cycle can't
  // set the guard and then cancel the work.
  useEffect(() => {
    if (!thread) return;
    const t = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      setCheckInDue(checkInDueFor(thread));
      if (!thread.lastCoaching && thread.messages.length > 0) {
        void coach(thread, thread.messages);
      }
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread]);

  if (!thread) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
        <AppHeader backHref="/" />
        <p className="mt-10 text-center text-sm text-muted-foreground">
          This conversation isn&apos;t on this device.
        </p>
      </main>
    );
  }

  const stage = stageFor(thread.messages.length, thread.analyses ?? []);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <AppHeader backHref="/" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          defaultValue={thread.label}
          aria-label="conversation name"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== thread.label) renameThread(thread.id, v);
          }}
          className="w-full truncate bg-transparent text-xl font-semibold tracking-tight focus:outline-none"
        />
        {thread.personaId && (
          <Link
            href={`/t/${thread.id}/brief`}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            date brief
          </Link>
        )}
        <button
          aria-label="delete conversation"
          onClick={() => {
            if (confirm("Delete this conversation?")) {
              deleteThread(thread.id);
              router.push("/");
            }
          }}
          className="shrink-0 text-xs text-muted-foreground/60 transition-colors hover:text-destructive"
        >
          delete
        </button>
      </div>

      {append === "capture" && (
        <Capture
          append
          onExtracted={(msgs) => {
            setPendingMessages([...thread.messages, ...msgs].map((m, i) => ({ ...m, order: i })));
            setAppend("confirm");
          }}
        />
      )}
      {append === "confirm" && (
        <Confirm
          messages={pendingMessages}
          onChange={setPendingMessages}
          onConfirm={() => coach(thread, pendingMessages)}
          loading={loading}
          error={error}
        />
      )}
      {append !== null && (
        <button
          onClick={() => setAppend(null)}
          className="mt-4 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          never mind, back to coaching
        </button>
      )}

      {append === null && !thread.lastCoaching && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
          <div className="h-2 w-40 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-1/3 animate-[scan_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
          </div>
          <p className="text-sm text-muted-foreground">reading the room…</p>
          {error && (
            <>
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={() => coach(thread, thread.messages)}
                className="rounded-full bg-secondary px-4 py-2 text-sm"
              >
                try again
              </button>
            </>
          )}
        </div>
      )}

      {append === null && thread.personaId && loopSuggestions.length > 0 && (
        <div className="mb-5">
          <LoopSuggestions
            personaId={thread.personaId}
            threadId={thread.id}
            suggestions={loopSuggestions}
            onDone={() => setLoopSuggestions([])}
          />
        </div>
      )}

      {append === null && thread.lastCoaching && (
        <Coach
          key={`${thread.id}-${(thread.analyses ?? []).length}`}
          coaching={thread.lastCoaching}
          messages={thread.messages}
          stage={stage}
          walkAway={shouldWalkAway(thread.analyses ?? [])}
          timingNote={timingWatchOut(analyzePace(thread.messages), new Date())}
          gateActive={needsOwnAttemptFirst(thread.assistsSinceOwnAttempt ?? 0, xp.level)}
          personaId={thread.personaId ?? null}
          factSuggestions={factSuggestions}
          onFactsDone={() => setFactSuggestions([])}
          checkInDue={checkInDue}
          onCheckIn={(outcome) => {
            patchThread(thread.id, { outcome });
            setCheckInDue(false);
          }}
          onAppend={() => {
            setPendingMessages(thread.messages);
            setAppend("capture");
          }}
          onRecoach={(tone) => coach(thread, thread.messages, tone)}
          onXP={xp.award}
          onSent={(reply) => {
            patchThread(thread.id, {
              sentReplies: [...(thread.sentReplies ?? []), { ...reply, at: Date.now() }],
            });
            if (thread.personaId && (thread.injectedFactIds ?? []).length > 0) {
              markFactsUsed(thread.personaId, thread.injectedFactIds ?? []);
            }
          }}
          onPickStyle={recordPick}
          onOwnAttemptGraded={() => patchThread(thread.id, { assistsSinceOwnAttempt: 0 })}
          loading={loading}
          error={error}
        />
      )}
    </main>
  );
}
