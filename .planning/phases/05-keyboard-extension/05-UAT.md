---
status: testing
phase: 05-keyboard-extension
source: [05-VERIFICATION.md]
started: 2026-07-05T00:00:00Z
updated: 2026-07-05T00:00:00Z
---

## Current Test

number: 1
name: Guided enable flow opens Settings and keyboard can be enabled
expected: |
  From Home, tap the "Enable the Banter keyboard" banner → priming sheet shows steps + "no Full Access needed" reassurance → tapping the CTA closes the sheet and opens Settings at the Banter app page → Keyboards → toggle Banter ON (leave Allow Full Access OFF). Returning to the app foreground re-evaluates the banner (it should disappear or show the post-enable state).
awaiting: user response

## Tests

### 1. Guided enable flow opens Settings and keyboard can be enabled
expected: Banner → sheet → CTA closes sheet and opens Settings > Banter; keyboard enableable; banner updates on return (KEYS-04, CR-01/CR-02 fixes confirmed on device)
result: [pending]

### 2. Keyboard appears and shows cached suggestions
expected: After analyzing a conversation in the app (suggestions generated), switch to any chat app (Notes/Messages), switch to the Banter keyboard — up to 3 suggestion rows render from the App Group cache; if nothing analyzed yet, the empty state reads "Open Banter to analyze a conversation" (KEYS-01)
result: [pending]

### 3. Tap-to-insert works with Full Access OFF
expected: With Allow Full Access off, tapping a suggestion inserts its text into the host app's text field in one tap (KEYS-02, KEYS-03 runtime half)
result: [pending]

### 4. Globe key switches keyboards
expected: With ≥2 keyboards enabled, the globe key is visible on the Banter keyboard (including empty state) and switches back to the system keyboard (App Review 4.4.1)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
