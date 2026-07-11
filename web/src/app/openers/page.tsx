"use client";

import { useRouter } from "next/navigation";
import { Openers } from "@/components/openers";
import { AppHeader } from "@/components/app-header";

export default function OpenersPage() {
  const router = useRouter();
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <AppHeader backHref="/" />
      <Openers onPersonaCreated={() => {}} onDone={() => router.push("/")} />
    </main>
  );
}
