"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Demo } from "@/components/demo";
import { AppHeader } from "@/components/app-header";
import { band, STAGE_LABELS, stageFor } from "@/lib/stage";
import {
  deleteThread,
  getThreadsServerSnapshot,
  getThreadsSnapshot,
  subscribeThreads,
} from "@/lib/threads";

const noopSubscribe = () => () => {};

export default function Home() {
  const threads = useSyncExternalStore(subscribeThreads, getThreadsSnapshot, getThreadsServerSnapshot);
  // False during SSR/hydration, true after - prevents a landing-page flash for returning users.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!hydrated) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
        <p className="text-lg font-semibold tracking-tight">
          banter<span className="text-primary">.</span>
        </p>
      </main>
    );
  }

  if (threads.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
        <p className="text-lg font-semibold tracking-tight">
          banter<span className="text-primary">.</span>
        </p>

        <h1 className="mt-8 text-4xl font-semibold leading-[1.1] tracking-tight">
          Know what to say.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your texting coach. It reads the conversation, tells you what&apos;s working, and helps
          you say it like you, not like a bot.
        </p>

        <div className="mt-6">
          <Demo />
        </div>

        <Link
          href="/new"
          className="mt-6 w-full rounded-2xl bg-primary py-4 text-center text-base font-semibold text-primary-foreground"
        >
          Coach my conversation
        </Link>
        <Link
          href="/openers"
          className="mt-3 text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          haven&apos;t messaged them yet? start from their profile
        </Link>
        <p className="mt-4 text-center text-xs text-muted-foreground/70">
          Screenshots are read once and never stored. Delete everything anytime.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <AppHeader />

      <h1 className="text-2xl font-semibold tracking-tight">your conversations</h1>

      <div className="mt-4 flex flex-col gap-2">
        {threads.map((t) => {
          const last = t.analyses?.[t.analyses.length - 1];
          const stage = stageFor(t.messages.length, t.analyses ?? []);
          return (
            <div key={t.id} className="group flex items-center gap-2">
              <Link
                href={`/t/${t.id}`}
                className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[15px]">{t.label}</span>
                  {last && (
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        band(last.factors.interest) === "strong"
                          ? "bg-primary"
                          : band(last.factors.interest) === "warming"
                            ? "bg-primary/50"
                            : "bg-muted-foreground/40"
                      }`}
                      title={`interest: ${band(last.factors.interest)}`}
                    />
                  )}
                </div>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t.messages.length} messages · {STAGE_LABELS[stage]}
                  {t.outcome === "met" ? " · you met 🎉" : ""}
                </span>
              </Link>
              <button
                aria-label={`delete ${t.label}`}
                onClick={() => deleteThread(t.id)}
                className="px-1 text-muted-foreground/40 transition-colors hover:text-destructive"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <Link
        href="/new"
        className="mt-6 w-full rounded-2xl bg-primary py-4 text-center text-base font-semibold text-primary-foreground"
      >
        ＋ new conversation
      </Link>
      <Link
        href="/openers"
        className="mt-3 text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        or start from a profile
      </Link>
    </main>
  );
}
