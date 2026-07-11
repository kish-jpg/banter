"use client";

import { AppHeader } from "@/components/app-header";
import { ProfileCard } from "@/components/profile-card";
import { PersonaPanel, usePersonas } from "@/components/persona-panel";
import { useXP } from "@/lib/useXP";
import { clearAll } from "@/lib/threads";

export default function YouPage() {
  const xp = useXP();
  const personas = usePersonas();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
      <AppHeader backHref="/" />

      <h1 className="text-2xl font-semibold tracking-tight">you</h1>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">level {xp.level}</span>
          <span className="text-xs text-muted-foreground">
            {xp.into}/{xp.toNext} xp to level {xp.level + 1}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${Math.round((xp.into / xp.toNext) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Own attempts earn the most. Sending what works earns the rest.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-muted-foreground">how you sound</h2>
        <div className="mt-3">
          <ProfileCard persistent />
        </div>
      </section>

      {personas.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-muted-foreground">people</h2>
          <div className="mt-3 flex flex-col gap-3">
            {personas.map((p) => (
              <PersonaPanel key={p.id} personaId={p.id} />
            ))}
          </div>
        </section>
      )}

      <button
        onClick={() => {
          if (confirm("Delete every conversation, persona, and all progress on this device?")) {
            clearAll();
            location.href = "/";
          }
        }}
        className="mt-10 text-left text-xs text-muted-foreground/60 transition-colors hover:text-destructive"
      >
        delete everything
      </button>
    </main>
  );
}
