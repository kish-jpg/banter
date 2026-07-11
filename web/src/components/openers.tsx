"use client";

import { useRef, useState } from "react";
import type { Reply } from "@/lib/types";
import { fileToDataUrl } from "@/lib/image";
import { explain } from "@/lib/taxonomy";
import { addFacts, createPersona, type ContextType } from "@/lib/persona";

// Cold start (COAC-07 finally gets a UI): profile screenshots/bio -> hooks -> 3 gated
// openers. Reading the profile also seeds the persona - the hooks ARE the first facts.

export function Openers({
  onPersonaCreated,
  onDone,
}: {
  onPersonaCreated: (personaId: string, name: string) => void;
  onDone: () => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [name, setName] = useState("");
  const [context, setContext] = useState<ContextType>("date");
  const [openers, setOpeners] = useState<Reply[] | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasInput = bio.trim().length > 0 || images.length > 0;

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => fileToDataUrl(f)));
      setImages((prev) => [...prev, ...urls].slice(0, 6));
    } catch {
      setError("couldn't read that image, try another");
    }
  }

  async function generate() {
    setError(null);
    setLoading("Reading their profile…");
    try {
      const pr = await fetch("/api/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(images.length > 0 ? { images } : {}),
          ...(bio.trim() ? { text: bio.trim() } : {}),
        }),
      });
      const profile = await pr.json();
      if (!pr.ok) throw new Error(profile.error ?? "profile reading failed");

      setLoading("Writing openers…");
      const or = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileText: profile.profileText }),
      });
      const data = await or.json();
      if (!or.ok) throw new Error(data.error ?? "opener generation failed");

      const persona = createPersona(name.trim() || "them", context);
      addFacts(
        persona.id,
        (profile.hooks ?? []).map((h: { text: string; quote: string }) => ({
          type: "hook" as const,
          text: h.text,
          quote: h.quote,
          source: "profile" as const,
        })),
      );
      onPersonaCreated(persona.id, persona.name);
      setOpeners(data.openers as Reply[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong, try again");
    } finally {
      setLoading(null);
    }
  }

  async function copy(text: string, i: number) {
    await navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  }

  if (openers) {
    return (
      <div className="flex flex-1 flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
        <h1 className="text-2xl font-semibold tracking-tight">Openers worth sending</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Grounded in their actual profile. When they reply, come back and paste the conversation.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          {openers.map((o, i) => {
            const why = explain(o.psychologyTag);
            return (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                    {o.style}
                  </span>
                  <button
                    onClick={() => copy(o.text, i)}
                    className={`text-xs font-medium ${copied === i ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {copied === i ? "copied" : "copy"}
                  </button>
                </div>
                <p className="mt-2.5 text-[15px] leading-relaxed">{o.text}</p>
                {why && <p className="mt-2 text-xs text-muted-foreground/70">{why.tagName} · {why.explanation}</p>}
              </div>
            );
          })}
        </div>
        <button onClick={onDone} className="btn-secondary mt-6 w-full py-3.5 text-sm">
          done for now
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h1 className="text-3xl font-semibold leading-tight tracking-tight">
        Haven&apos;t messaged yet?
      </h1>
      <p className="mt-2 text-muted-foreground">
        Drop in their profile. I&apos;ll find the hooks and write openers that don&apos;t sound
        like everyone else&apos;s.
      </p>

      <div className="mt-5 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="their name"
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/60"
        />
        {(["date", "friend", "business"] as ContextType[]).map((c) => (
          <button
            key={c}
            onClick={() => setContext(c)}
            className={`px-3 py-2 text-sm ${context === c ? "chip-active" : "chip"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Paste their bio / prompts… or just add screenshots below"
        rows={4}
        className="mt-3 w-full resize-none rounded-2xl border border-border bg-card p-4 text-[15px] leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/60"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`profile screenshot ${i + 1}`} className="h-16 w-12 rounded-lg object-cover" />
            <button
              aria-label="remove screenshot"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground"
              onClick={() => setImages(images.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-16 w-12 items-center justify-center rounded-lg border border-dashed border-border text-2xl text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          aria-label="add profile screenshots"
        >
          +
        </button>
        <span className="ml-1 text-xs text-muted-foreground">profile screenshots</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <button
        onClick={generate}
        disabled={!hasInput || loading !== null}
        className="btn-primary mt-8 w-full py-4 text-base"
      >
        {loading ?? "Find my opener"}
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Screenshots are read once and never stored.
      </p>
    </div>
  );
}
