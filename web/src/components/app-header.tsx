"use client";

import Link from "next/link";
import { useXP } from "@/lib/useXP";

export function AppHeader({ backHref }: { backHref?: string }) {
  const xp = useXP();
  return (
    <header className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="back"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            ←
          </Link>
        )}
        <Link href="/" className="text-lg font-semibold tracking-tight">
          banter<span className="text-primary">.</span>
        </Link>
      </div>
      <Link
        href="/you"
        className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        title={`${xp.into}/${xp.toNext} xp to level ${xp.level + 1}`}
      >
        lv {xp.level} · {xp.total} xp
      </Link>
    </header>
  );
}
