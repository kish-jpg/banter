import XCTest

/// ONBD-02: the Photos priming explainer heading "Let Banter read your
/// screenshot" appears before the system Photos prompt is triggered -
/// verifying the priming screen shows first, not the system permission
/// dialog directly.
///
/// Wave-0 red state: the PermissionPrimingView and its heading do not exist
/// yet (built in a later Phase 4 plan). This file fails-red on the missing
/// UI element, not on an unrelated compile error.
final class PermissionPrimingTests: XCTestCase {
    func testPhotosPrimingHeadingAppearsBeforeSystemPrompt() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--seed-fresh-install"]
        app.launch()

        waitForLaunchAnimationToSettle(app, matching: "Try It Now")
        app.buttons["Try It Now"].tap()

        let primingHeading = app.staticTexts["Let Banter read your screenshot"]
        XCTAssertTrue(
            primingHeading.waitForExistence(timeout: 10),
            "Photos permission priming heading must appear before any system Photos prompt"
        )

        // The system permission alert (if triggered) is out-of-process and
        // not reliably automatable in CI (mirrors ScreenshotArtifactTests'
        // documented limitation) - this test only proves the in-app priming
        // screen renders first, not the subsequent system dialog itself.
    }

    private func waitForLaunchAnimationToSettle(_ app: XCUIApplication, matching label: String) {
        let element = app.buttons[label]
        _ = element.waitForExistence(timeout: 10)
    }
}
