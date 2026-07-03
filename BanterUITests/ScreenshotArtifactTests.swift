import XCTest

/// CI screenshot-artifact deliverable (plan 02-05). Captures the two
/// deterministic, screenshot-safe screens from the Phase-2 import flow as
/// persistent .xcresult attachments so a developer without a Mac can
/// visually verify the UI from a downloaded GitHub Actions artifact.
///
/// Does NOT drive the system PhotosPicker (RESEARCH.md Assumptions A3 —
/// it's a separate out-of-process picker outside the app's accessibility
/// tree, unreliable to automate in CI). Instead the Confirm screen is
/// reached via the `--seed-sample-transcript` debug launch argument
/// (ImportFlowModel, plan 02-04), which seeds a static synthetic transcript
/// directly into .confirm state — never real conversation data.
final class ScreenshotArtifactTests: XCTestCase {
    func testCaptureKeyScreens() throws {
        // Import Entry: default launch, no seed arg, lands on .entry.
        let entryApp = XCUIApplication()
        entryApp.launch()
        waitForLaunchAnimationToSettle(entryApp, matching: "Choose Screenshot")
        capture(entryApp, name: "00_import_entry")
        entryApp.terminate()

        // Confirm Transcript: seeded launch arg jumps straight to .confirm
        // with a synthetic fixture transcript, bypassing PhotosPicker.
        let confirmApp = XCUIApplication()
        confirmApp.launchArguments = ["--seed-sample-transcript"]
        confirmApp.launch()
        waitForLaunchAnimationToSettle(confirmApp, matching: "Confirm & Continue")
        capture(confirmApp, name: "01_confirm_transcript")
    }

    /// `app.launch()` returns as soon as the app process starts — it does
    /// NOT wait for the springboard-to-app open animation (the app's window
    /// animating up from the home-screen icon) to finish. Capturing
    /// immediately after launch() screenshots that transition mid-flight:
    /// a rounded, shrunken card on a black backdrop, not the settled
    /// full-screen UI. Waiting for a concrete post-launch element lets the
    /// animation complete before XCUIScreen.main.screenshot() runs.
    private func waitForLaunchAnimationToSettle(_ app: XCUIApplication, matching label: String) {
        let element = app.buttons[label]
        _ = element.waitForExistence(timeout: 10)
    }

    private func capture(_ app: XCUIApplication, name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
