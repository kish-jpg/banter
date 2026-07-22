import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { demoData } from "./demo.ts";
// @ts-expect-error .ts extension
import { fingerprint } from "./voice.ts";

test("demo data is well-formed across every surface", () => {
  const d = demoData(1_000_000_000);
  assert.equal(d.personas.length, 1);
  assert.ok(d.personas[0].facts.length >= 8, "persona should be richly populated");
  assert.ok(d.self.length >= 2);
  assert.ok(d.loops.some((l) => l.kind === "bit" && (l.seenCount ?? 1) >= 2), "an alive bit for resonance");
  assert.ok(d.threads[0].messages.length >= 12, "enough messages to reach momentum");
  assert.ok(d.threads[0].sentReplies!.length >= 3);
  assert.ok(d.grades.every((g) => typeof g.text === "string" && g.text.length > 0), "grades carry real-you text");
  assert.equal(typeof d.xp, "number");
});

test("the demo produces a visible mirror gap (casual real-you vs polished chat-you)", () => {
  const d = demoData();
  const real = fingerprint(d.grades.map((g) => g.text!));
  const chat = fingerprint(d.threads[0].sentReplies!.map((r) => r.text));
  assert.ok(real && chat);
  // chat-you should read as more elaborate / polished than real-you
  assert.ok(chat.elaborate > real.elaborate, "chat-you should be wordier");
  assert.ok(chat.polished > real.polished, "chat-you should be more edited");
});
