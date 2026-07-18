"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";
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

  const landing = hydrated && threads.length === 0;
  useEffect(() => {
    if (landing) track("landing_view");
  }, [landing]);

  if (!hydrated) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
        <p className="text-lg font-semibold tracking-tight">
          banter<span className="text-signal">.</span>
        </p>
      </main>
    );
  }

  if (threads.length === 0) {
    return (
      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col overflow-x-clip px-4 pb-10 pt-6">
        <p className="text-lg font-semibold tracking-tight">
          banter<span className="text-signal">.</span>
        </p>

        <h1 className="mt-9 text-[2.5rem] font-bold leading-[1.05] tracking-[-0.03em]">
          Know what
          <br />
          to say<span className="text-signal">.</span>
        </h1>
        <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
          Your texting coach. It reads the conversation, tells you what&apos;s working, and helps
          you say it like you, not like a bot.
        </p>

        <div className="relative mt-7">
          <div className="rounded-3xl border border-border bg-background">
            <Demo />
          </div>
        </div>

        <Link
          href="/new"
          className="btn-primary mt-7 w-full py-4 text-center text-base"
        >
          Coach my conversation
        </Link>
        <Link
          href="/openers"
          className="mt-4 text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          haven&apos;t messaged them yet? start from their profile
        </Link>
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground/70">
          Screenshots are read once and never stored.
          <br />
          Delete everything anytime.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <AppHeader />

      <h1 className="text-2xl font-semibold tracking-tight">your conversations</h1>

      {/* Avatar rows, not a card grid: each conversation is a person, not a tile. */}
      <div className="mt-3 flex flex-col divide-y divide-border/60">
        {threads.map((t) => {
          const last = t.analyses?.[t.analyses.length - 1];
          const stage = stageFor(t.messages.length, t.analyses ?? []);
          const interestBand = last ? band(last.factors.interest) : null;
          return (
            <div key={t.id} className="group flex items-center gap-1">
              <Link
                href={`/t/${t.id}`}
                className="flex flex-1 items-center gap-3 rounded-xl px-1 py-3 transition-colors hover:bg-secondary/40 active:bg-secondary/60"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    interestBand === "strong"
                      ? "bg-primary/20 text-primary"
                      : interestBand === "warming"
                        ? "bg-primary/10 text-primary/80"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t.label.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{t.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {STAGE_LABELS[stage]}
                    {interestBand ? ` · interest ${interestBand}` : ""}
                    {t.outcome === "met" ? " · you met 🎉" : ""}
                  </span>
                </span>
              </Link>
              <button
                aria-label={`delete ${t.label}`}
                onClick={() => deleteThread(t.id)}
                className="px-2 py-3 text-muted-foreground/40 transition-colors hover:text-destructive"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <Link href="/new" className="btn-primary mt-7 w-full py-4 text-center text-base">
        ＋ new conversation
      </Link>
      <Link
        href="/openers"
        className="mt-4 text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        or start from a profile
      </Link>
    </main>
  );
}
