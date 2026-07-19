"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setReferredBy } from "@/lib/referral";
import { track } from "@/lib/analytics";

/**
 * Referral landing (PRD §7.8): /r/{code} records the referrer and drops the
 * visitor straight into the landing's auto-playing demo read — the live demo
 * IS the pitch. No interstitial, no friction.
 */
export default function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      setReferredBy(code);
      track("ref_visit", { code });
      router.replace("/");
    }, 0);
    return () => clearTimeout(t);
  }, [code, router]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4">
      <p className="font-serif text-xl">
        banter<span className="text-signal">.</span>
      </p>
    </main>
  );
}
