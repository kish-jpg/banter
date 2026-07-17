"use client";

import posthog from "posthog-js";

/**
 * Funnel instrumentation (PRD §9/§10): landing → capture → read → own attempt →
 * share → ref visit. Env-gated: without NEXT_PUBLIC_POSTHOG_KEY every call is a
 * no-op, so nothing blocks on account setup and local dev stays quiet.
 * Privacy: events carry counts and kinds only — never message text, names,
 * persona facts, or anything from a conversation.
 */

let ready = false;

function ensureInit(): boolean {
  if (ready) return true;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    autocapture: false, // explicit funnel events only; nothing scraped from the DOM
    capture_pageview: false,
    persistence: "localStorage",
  });
  ready = true;
  return true;
}

export type FunnelEvent =
  | "landing_view"
  | "capture_start"
  | "read_shown"
  | "own_attempt_graded"
  | "card_previewed"
  | "card_shared"
  | "ref_visit";

export function track(event: FunnelEvent, props?: Record<string, string | number | boolean>) {
  try {
    if (!ensureInit()) return;
    posthog.capture(event, props);
  } catch {
    // analytics must never break the product
  }
}
