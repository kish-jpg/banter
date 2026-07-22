"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadDemo } from "@/lib/demo";

/**
 * /demo — loads a fully-fictional sample conversation ("Maya") and drops you into
 * the populated app. Safe to show anyone on any device; overwrites current local
 * data by design (it's a reset-to-demo entry point).
 */
export default function DemoPage() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => {
      loadDemo();
      router.replace("/");
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4">
      <p className="font-serif text-xl">
        banter<span className="text-signal">.</span>
      </p>
      <p className="mt-3 text-sm text-muted-foreground">loading the demo…</p>
    </main>
  );
}
