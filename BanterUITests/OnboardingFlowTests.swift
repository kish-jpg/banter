import XCTest

/// ONBD-01: a fresh install launches into the Welcome screen and the tap
/// path Welcome -> import -> suggestions reaches a suggestions screen with
/// zero paywall/signup UI along the way. Uses a fresh-install seed launch
/// argument so the test is deterministic across CI runs on the same
/// simulator (mirrors ImportFlowModel's `--seed-sample-transcript` /
/// `#if DEBUG` launch-argument pattern).
///
/// Wave-0 red state: the Welcome screen, the fresh-install seed argument,
/// and the coaching-suggestions screen do not exist yet (built in later
/// Phase 4 plans). This file fails-red on missing UI elements / launch
/// arguments, not on an unrelated compile error.
final class OnboardingFlowTests: XCTestCase {
    func testFreshInstallReachesSuggestionsWithNoPaywallOrSignupUI() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--seed-fresh-install", "--seed-sample-transcript"]
        app.launch()

        waitForLaunchAnimationToSettle(app, matching: "Try It Now")
        XCTAssertTrue(app.buttons["Try It Now"].exists, "Welcome screen must show the primary CTA on fresh install")

        app.buttons["Try It Now"].tap()

        // Import -> suggestions loop. Suggestions screen presence is asserted
        // via its Copy action, which is unique to the coaching result surface.
        let copyButton = app.buttons["Copy"]
        _ = copyButton.waitForExistence(timeout: 10)
        XCTAssertTrue(copyButton.exists, "Onboarding demo path must reach a suggestions screen")

        // Hard requirement (ONBD-01): zero paywall/signup UI anywhere on this path.
        XCTAssertFalse(app.staticTexts["Unlock unlimited coaching"].exists, "Onboarding path must never surface the paywall")
        XCTAssertFalse(app.buttons["Start Free Trial"].exists, "Onboarding path must never surface a purchase CTA")
        XCTAssertFalse(app.textFields["Email"].exists, "Onboarding path must never surface a signup form")
    }

    private func waitForLaunchAnimationToSettle(_ app: XCUIApplication, matching label: String) {
        let element = app.buttons[label]
        _ = element.waitForExistence(timeout: 10)
    }
}
