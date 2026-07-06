# Testing Banter on your iPhone — $0, no Mac, no Developer Program

Two free paths, both fed by CI artifacts that build automatically on every push to `main`.

## Where the builds live

GitHub → `kish-jpg/banter` → **Actions** → click the latest green **CI** run → scroll to **Artifacts**:

| Artifact | What it is | Used for |
|---|---|---|
| `banter-simulator-app` | Zipped simulator build | Appetize.io (browser) |
| `banter-unsigned-ipa` | Unsigned device IPA | AltStore (your iPhone) |

You must be logged into GitHub to download them. They expire after 14 days — just grab them from a newer run.

---

## Path 1 — Appetize.io: app in your browser (10 minutes)

Tests the full app loop (import → tagged suggestions → tone → "why" → health score). No keyboard (that needs a real device).

1. Create a free account at https://appetize.io (free tier: 1 app, limited streaming minutes/month — plenty for a gut check).
2. Download `banter-simulator-app` from the latest CI run (keep it as the `.zip`).
3. Appetize dashboard → **Upload** → select the zip → platform iOS.
4. Open the generated link on any device — including your iPhone's browser — and use the app.
5. Share that link with a couple of friends for hallway testing if you want (mind the free-tier minutes).

## Path 2 — AltStore: real install on your iPhone (~45 min first time, 2 min after)

Real native feel, real Photos picker, real speed. Uses a **free Apple ID** — AltStore re-signs the IPA on your PC and installs it over USB.

### One-time setup (Windows)

1. Install **iTunes** and **iCloud** — the versions from Apple's website, NOT the Microsoft Store versions (AltServer requires the non-Store builds): https://altstore.io has direct links on the FAQ.
2. Download **AltServer for Windows** from https://altstore.io and run it (it lives in the system tray).
3. Connect your iPhone via USB, trust the computer, and make sure it appears in iTunes.
4. Tray icon → **Install AltStore** → your iPhone → sign in with your Apple ID (a throwaway Apple ID is fine and arguably better).
5. On the iPhone: Settings → General → VPN & Device Management → trust your Apple ID profile.

### Installing Banter (every time / weekly refresh)

1. Download `banter-unsigned-ipa` from the latest CI run; unzip if your browser wrapped it (you want `BanterApp-unsigned.ipa`).
2. Get the IPA onto the phone's AltStore: easiest is **AltStore app on iPhone → My Apps → “+” →** pick the IPA (AirDrop-equivalent: put it in iCloud Drive/OneDrive first), or use AltServer's tray → Sideload from the PC.
3. AltStore re-signs and installs. Open Banter.

### Known caveats (expected, not bugs)

- **7-day expiry** — free Apple ID certs last a week. Open AltStore and tap Refresh (phone on same Wi-Fi as the PC running AltServer, or via USB).
- **3-app limit** on free accounts (AltStore itself counts as one).
- **Keyboard may show its empty state even after analyzing a conversation.** Free-account signing remaps App Group IDs, which can break the app↔keyboard shared container. The keyboard should still appear in Settings → General → Keyboard and be enableable; tap-to-insert of *cached* suggestions may not work under AltStore signing. This is a signing limitation — the real verification of the keyboard loop happens on TestFlight ($99 path).
- The paywall's purchase button won't complete a purchase (no App Store products configured yet — deliberate).

---

## When it's worth the $99

The Developer Program unlocks what the free paths can't:
- Keyboard working end-to-end with proper App Group signing (the actual Phase 5 UAT tests)
- TestFlight: distribute to up to 100 internal / 10,000 external testers — real user testing with crash reports + feedback built in
- No weekly re-signing
- Required for App Store launch (Phase 8) anyway

Enroll at https://developer.apple.com/programs (24–48h approval), then say "prep testflight" and the CI lane gets built.
