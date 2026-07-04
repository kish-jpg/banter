import XCTest

/// Shared XCUITest launch/capture helpers. Extracted here once
/// ScreenshotArtifactTests, OnboardingFlowTests, and PermissionPrimingTests
/// all needed the same `waitForLaunchAnimationToSettle`/`capture` logic
/// (04-PATTERNS.md: "extract to a shared XCUITest helper if not already
/// shared, since this is the second consumer").
extension XCTestCase {
    /// `app.launch()` returns as soon as the app process starts — it does
    /// NOT wait for the springboard-to-app open animation to finish.
    /// Waiting for a concrete post-launch element lets the animation
    /// complete before any assertion/screenshot runs.
    func waitForLaunchAnimationToSettle(_ app: XCUIApplication, matching label: String) {
        let element = app.buttons[label]
        _ = element.waitForExistence(timeout: 10)
    }

    /// Screenshot the app's own key window, not XCUIScreen.main —
    /// XCUIScreen.main.screenshot() was observed to letterbox the app
    /// content with black bands; app.windows.firstMatch.screenshot()
    /// captures exactly the app's own rendered window bounds.
    func capture(_ app: XCUIApplication, name: String) {
        let screenshot = app.windows.firstMatch.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
