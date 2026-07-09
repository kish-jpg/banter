"use client";

import { useRef, useState } from "react";
import type { TranscriptEntry } from "@/lib/types";
import { fileToDataUrl } from "@/lib/image";

export function Capture({
  onExtracted,
  append = false,
}: {
  onExtracted: (msgs: TranscriptEntry[]) => void;
  append?: boolean;
}) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasInput = text.trim().length > 0 || images.length > 0;

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

  async function extract() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(images.length > 0 ? { images } : {}),
          ...(text.trim() ? { text: text.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "extraction failed");
      onExtracted(data.messages as TranscriptEntry[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong, try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-semibold leading-tight tracking-tight">
        {append ? "What happened since?" : "Stuck on what to say?"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {append
          ? "Drop in just the new messages. I remember the rest."
          : "Drop in the conversation. You'll get replies worth sending, and the read on how it's going."}
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Paste the conversation…\n\nthem: how was your weekend\nme: honestly too short"}
        rows={7}
        className="mt-6 w-full resize-none rounded-2xl border border-border bg-card p-4 text-[15px] leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/60"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`screenshot ${i + 1}`} className="h-16 w-12 rounded-lg object-cover" />
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
          aria-label="add screenshots"
        >
          +
        </button>
        <span className="ml-1 text-xs text-muted-foreground">or add screenshots</span>
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
        onClick={extract}
        disabled={!hasInput || loading}
        className="mt-8 w-full rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground transition-opacity disabled:opacity-30"
      >
        {loading ? "Reading the room…" : "Read my conversation"}
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Screenshots are read once and never stored.
      </p>
    </div>
  );
}
