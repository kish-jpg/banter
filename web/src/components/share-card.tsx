"use client";

import { useState } from "react";
import { getRefCode } from "@/lib/referral";
import { track } from "@/lib/analytics";

/**
 * Consent-gated share flow (PRD §7.8): nothing leaves the device without a
 * preview of the exact pixels. Read cards carry no XP (other-party content);
 * DNA and We-Met are self-referential and earn a small share XP. Inline
 * progressive disclosure, no modal.
 */

const SHARE_XP = 5;

export function ShareCard({
  kind,
  label,
  params,
  quoteOptions,
  consentNote,
  xpOnShare = false,
  onXP,
}: {
  kind: "read" | "dna" | "met";
  label: string;
  params: Record<string, string>;
  /** For the Read card: match lines the user may choose to include, verbatim. */
  quoteOptions?: string[];
  consentNote: string;
  xpOnShare?: boolean;
  onXP?: (points: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fmt, setFmt] = useState<"story" | "post">("story");
  const [quote, setQuote] = useState("");
  const [rewarded, setRewarded] = useState(false);
  const [sharing, setSharing] = useState(false);

  function cardUrl(): string {
    const qs = new URLSearchParams({ ...params, fmt, ref: getRefCode() });
    if (quote) qs.set("q", quote);
    return `/api/card/${kind}?${qs.toString()}`;
  }

  function reward() {
    track("card_shared", { kind, fmt });
    if (xpOnShare && !rewarded && onXP) {
      onXP(SHARE_XP);
      setRewarded(true);
    }
  }

  async function share() {
    setSharing(true);
    try {
      const blob = await fetch(cardUrl()).then((r) => r.blob());
      const file = new File([blob], `banter-${kind}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      reward();
    } catch {
      // user cancelled the share sheet; nothing to clean up
    } finally {
      setSharing(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          track("card_previewed", { kind });
        }}
        className="text-xs font-medium text-primary/90"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3 animate-in fade-in">
      {/* the consent gate: the preview IS the exact shared image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardUrl()}
        alt={`${label} preview`}
        className={`w-full rounded-2xl border border-border ${fmt === "story" ? "aspect-[9/16]" : "aspect-[4/5]"} object-cover`}
      />
      <p className="text-xs text-muted-foreground">{consentNote}</p>

      {quoteOptions && quoteOptions.length > 0 && (
        <select
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          aria-label="include one of their lines"
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground focus:outline-none"
        >
          <option value="">no quote on the card</option>
          {quoteOptions.map((q) => (
            <option key={q} value={q}>
              include: &quot;{q.length > 60 ? `${q.slice(0, 58)}…` : q}&quot;
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-2">
        {(["story", "post"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFmt(f)}
            className={`px-3 py-1.5 text-xs ${fmt === f ? "chip-active" : "chip"}`}
          >
            {f === "story" ? "9:16 story" : "4:5 post"}
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground">
          close
        </button>
        <button onClick={share} disabled={sharing} className="btn-primary !rounded-full px-4 py-2 text-xs">
          {sharing ? "preparing…" : rewarded ? "share again" : xpOnShare ? `share · +${SHARE_XP} xp` : "share"}
        </button>
      </div>
    </div>
  );
}
