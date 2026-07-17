"use client";

/**
 * Referral plumbing (PRD §7.8): a short code burned into every card's pixels;
 * /r/{code} lands in the live demo read. XP is the only referral reward, never
 * cash (spam guard). Full two-sided XP settlement needs accounts (R4) — until
 * then the code travels and the visit is tracked. banter.* prefix, wiped by
 * delete-everything like all user data.
 */

const CODE_KEY = "banter.ref.code";
const BY_KEY = "banter.ref.by";

/** This device's share code, created on first use. */
export function getRefCode(): string {
  let code = localStorage.getItem(CODE_KEY);
  if (!code) {
    code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => (b % 36).toString(36))
      .join("")
      .slice(0, 6)
      .padEnd(6, "0");
    localStorage.setItem(CODE_KEY, code);
  }
  return code;
}

/** Records who referred this visitor (first referrer wins). */
export function setReferredBy(code: string) {
  if (!/^[a-z0-9]{4,12}$/i.test(code)) return;
  if (!localStorage.getItem(BY_KEY)) localStorage.setItem(BY_KEY, code);
}

export function getReferredBy(): string | null {
  return localStorage.getItem(BY_KEY);
}
