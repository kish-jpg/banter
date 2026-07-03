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
        capture(entryApp, name: "00_import_entry")
        entryApp.terminate()

        // Confirm Transcript: seeded launch arg jumps straight to .confirm
        // with a synthetic fixture transcript, bypassing PhotosPicker.
        let confirmApp = XCUIApplication()
        confirmApp.launchArguments = ["--seed-sample-transcript"]
        confirmApp.launch()
        capture(confirmApp, name: "01_confirm_transcript")
    }

    private func capture(_ app: XCUIApplication, name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
