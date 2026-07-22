"use client";

import { AppHeader } from "@/components/app-header";
import { Mirror } from "@/components/mirror";

export default function MirrorPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <AppHeader backHref="/you" />
      <h1 className="font-serif text-[2.75rem] leading-none">the mirror</h1>
      <p className="mt-1 section-label">how close is chat-you to the real you?</p>
      <p className="mb-6 mt-3 text-sm leading-relaxed text-muted-foreground">
        Every conversation has two authors: you, and the AI helping you. When these two
        shapes overlap, the person they meet is the person you&apos;ve been texting. When they
        split, that&apos;s the gap to close before a date.
      </p>
      <Mirror />
    </main>
  );
}
