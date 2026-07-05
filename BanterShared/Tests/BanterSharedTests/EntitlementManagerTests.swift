import XCTest
@testable import BanterShared

/// MONE-02 / MONE-03: EntitlementManager driven through free / trial-active /
/// premium states via a mocked entitlement source - a protocol seam, NOT a
/// live RevenueCat/network call - so this test compiles and runs without the
/// SDK. Also asserts trial-expired reverts to free without clearing timeline
/// data.
///
/// Wave-0 red state: `EntitlementManager` and `EntitlementSource` do not
/// exist yet (built in a later Phase 4 plan). References the not-yet-built
/// production symbols so this fails-red on "cannot find type in scope".
/// Deliberately does NOT `import RevenueCat` - the protocol seam is defined
/// so this test has zero dependency on the live SDK.
@MainActor
final class EntitlementManagerTests: XCTestCase {
    // @unchecked: mutable stub is set before use and read once per test —
    // single-threaded test access, no real data race.
    private final class MockEntitlementSource: EntitlementSource, @unchecked Sendable {
        var stubbedState: EntitlementState = .free
        func fetchState() async -> EntitlementState { stubbedState }
    }

    func testFreeStateIsNotPremium() async {
        let source = MockEntitlementSource()
        source.stubbedState = .free
        let manager = EntitlementManager(source: source)

        await manager.refresh()
        XCTAssertFalse(manager.isPremium)
    }

    func testTrialActiveStateIsPremium() async {
        let source = MockEntitlementSource()
        source.stubbedState = .trialActive
        let manager = EntitlementManager(source: source)

        await manager.refresh()
        XCTAssertTrue(manager.isPremium)
    }

    func testPremiumStateIsPremium() async {
        let source = MockEntitlementSource()
        source.stubbedState = .premium
        let manager = EntitlementManager(source: source)

        await manager.refresh()
        XCTAssertTrue(manager.isPremium)
    }

    func testTrialExpiredRevertsToFreeWithoutClearingTimelineData() async {
        let source = MockEntitlementSource()
        source.stubbedState = .trialActive
        let manager = EntitlementManager(source: source)
        await manager.refresh()
        XCTAssertTrue(manager.isPremium)

        // Simulate a conversation's timeline data existing while premium.
        let conversationId = UUID()
        let store = SentimentTimelineStore()
        let event = SentimentEvent(
            conversationId: conversationId,
            messageIndex: 0,
            speaker: .user,
            scoreDelta: 1.0,
            signal: "warmth",
            timestamp: Date()
        )
        store.append(event, conversationId: conversationId)

        source.stubbedState = .free
        await manager.refresh()

        XCTAssertFalse(manager.isPremium, "Trial expiry must revert isPremium to false")
        XCTAssertEqual(
            store.events(forConversationId: conversationId).count, 1,
            "Trial expiry must never clear existing timeline data"
        )
    }
}
