"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TranscriptEntry } from "@/lib/types";
import { Capture } from "@/components/capture";
import { Confirm } from "@/components/confirm";
import { PersonaPicker } from "@/components/persona-panel";
import { AppHeader } from "@/components/app-header";
import { getPersona } from "@/lib/persona";
import { defaultLabel, saveThread } from "@/lib/threads";

export default function NewConversation() {
  const router = useRouter();
  const [step, setStep] = useState<"capture" | "confirm">("capture");
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [personaId, setPersonaId] = useState<string | null>(null);

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
    router.push(`/t/${id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <AppHeader backHref="/" />
      {step === "capture" ? (
        <Capture
          onExtracted={(msgs) => {
            setMessages(msgs);
            setStep("confirm");
          }}
        />
      ) : (
        <div className="flex flex-1 flex-col">
          <Confirm
            messages={messages}
            onChange={setMessages}
            onConfirm={startCoaching}
            loading={false}
            error={null}
          />
          <div className="mt-6">
            <PersonaPicker selectedId={personaId} onSelect={setPersonaId} />
          </div>
        </div>
      )}
    </main>
  );
}
