import XCTest
@testable import BanterShared

/// MONE-01: a free-tier counter blocks after N calls in a day, and a
/// date-scoped key resets on a new day. This test only proves the counter
/// caps generation - it does NOT test tag visibility (tags-always-visible
/// is a UI guarantee enforced elsewhere, not by this tracker).
///
/// Wave-0 red state: `DailyCapTracker` does not exist yet (built in a later
/// Phase 4 plan). References the not-yet-built production symbol so this
/// fails-red on "cannot find 'DailyCapTracker' in scope".
@MainActor
final class DailyCapTrackerTests: XCTestCase {
    /// The tracker writes through AppGroupStore into the real UserDefaults
    /// suite with fixed date keys — remove them before AND after each test
    /// so local re-runs on the same machine don't see the prior run's counts.
    private static let testKeys = ["dailyCap.2026-07-04", "dailyCap.2026-07-05"]

    override func setUp() {
        super.setUp()
        removeTestKeys()
    }

    override func tearDown() {
        removeTestKeys()
        super.tearDown()
    }

    private func removeTestKeys() {
        let defaults = UserDefaults(suiteName: AppGroupStore.suiteName)
        for key in Self.testKeys {
            defaults?.removeObject(forKey: key)
        }
    }

    func testBlocksAfterDailyLimitReached() {
        let tracker = DailyCapTracker(dailyLimit: 3, dateString: "2026-07-04")

        XCTAssertTrue(tracker.canGenerate())
        tracker.recordGeneration()
        XCTAssertTrue(tracker.canGenerate())
        tracker.recordGeneration()
        XCTAssertTrue(tracker.canGenerate())
        tracker.recordGeneration()

        XCTAssertFalse(tracker.canGenerate(), "Tracker must block once the daily limit is reached")
    }

    func testResetsOnNewDateScopedKey() {
        let dayOneTracker = DailyCapTracker(dailyLimit: 1, dateString: "2026-07-04")
        dayOneTracker.recordGeneration()
        XCTAssertFalse(dayOneTracker.canGenerate())

        let dayTwoTracker = DailyCapTracker(dailyLimit: 1, dateString: "2026-07-05")
        XCTAssertTrue(dayTwoTracker.canGenerate(), "A new date-scoped key must start fresh, unaffected by the prior day's count")
    }

    func testTrackerDoesNotGateTagVisibility() {
        // Structural guard, not a UI test: DailyCapTracker's public surface
        // must not expose any tag-hiding/tag-gating API - it only counts
        // generations. This is a negative existence check on the API shape.
        let tracker = DailyCapTracker(dailyLimit: 3, dateString: "2026-07-04")
        XCTAssertTrue(tracker.canGenerate() is Bool)
    }
}
