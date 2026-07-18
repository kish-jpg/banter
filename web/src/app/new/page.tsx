"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { TranscriptEntry } from "@/lib/types";
import { Capture } from "@/components/capture";
import { Confirm } from "@/components/confirm";
import { PersonaPicker } from "@/components/persona-panel";
import { AppHeader } from "@/components/app-header";
import { getPersona } from "@/lib/persona";
import {
  defaultLabel,
  getThreadsServerSnapshot,
  getThreadsSnapshot,
  saveThread,
  subscribeThreads,
} from "@/lib/threads";

/**
 * New conversation, person-first. Step 1 asks who it's with BEFORE the compose box,
 * so the picker isn't buried. Picking someone who already has a conversation resumes
 * it (routes to their hub) instead of making a duplicate; a fresh person or "skip"
 * proceeds to capture.
 */
export default function NewConversation() {
  const router = useRouter();
  const threads = useSyncExternalStore(subscribeThreads, getThreadsSnapshot, getThreadsServerSnapshot);
  const [step, setStep] = useState<"who" | "capture" | "confirm">("who");
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [personaId, setPersonaId] = useState<string | null>(null);

  // Tapped or created a person: resume their existing conversation, else start fresh.
  function choosePerson(id: string) {
    const existing = threads.find((t) => t.personaId === id);
    if (existing) {
      router.push(`/t/${existing.id}`);
      return;
    }
    setPersonaId(id);
    setStep("capture");
  }

  function startCoaching() {
    const id = crypto.randomUUID();
    const persona = personaId ? getPersona(personaId) : undefined;
    saveThread({
      id,
      label: persona?.name ?? defaultLabel(messages),
      messages: messages.map((m, i) => ({ ...m, order: i })),
      lastCoaching: null,
      personaId: personaId ?? undefined,
      analyses: [],
      assistsSinceOwnAttempt: 0,
    });
    router.push(`/t/${id}/chat`);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <AppHeader backHref="/" />

      {step === "who" && (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">who&apos;s this with?</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Pick who you&apos;re talking to, or start fresh.
          </p>
          <div className="mt-5">
            <PersonaPicker
              selectedId={null}
              onSelect={(id) => {
                if (id) choosePerson(id);
              }}
            />
          </div>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <button
            onClick={() => {
              setPersonaId(null);
              setStep("capture");
            }}
            className="btn-secondary w-full py-3 text-sm"
          >
            just coach one exchange
          </button>
        </div>
      )}

      {step === "capture" && (
        <Capture
          onExtracted={(msgs) => {
            setMessages(msgs);
            setStep("confirm");
          }}
        />
      )}

      {step === "confirm" && (
        <Confirm
          messages={messages}
          onChange={setMessages}
          onConfirm={startCoaching}
          loading={false}
          error={null}
        />
      )}
    </main>
  );
}
