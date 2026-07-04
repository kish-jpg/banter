import XCTest
@testable import BanterShared

/// CALC-02 / CALC-03: SentimentTimelineStore append/read round-trip, strict
/// per-conversationId isolation, and a structural negative guard proving no
/// match-name/identity parameter can ever be threaded through the store by
/// construction.
///
/// Wave-0 red state: `SentimentTimelineStore` does not exist yet (built in a
/// later Phase 4 plan). References the not-yet-built production symbol so
/// this fails-red on "cannot find 'SentimentTimelineStore' in scope".
@MainActor
final class SentimentTimelineStoreTests: XCTestCase {
    func testAppendingEventsRoundTripsInOrder() {
        let conversationId = UUID()
        let store = SentimentTimelineStore()

        for index in 0..<3 {
            let event = SentimentEvent(
                conversationId: conversationId,
                messageIndex: index,
                speaker: .user,
                scoreDelta: Double(index),
                signal: "warmth",
                timestamp: Date()
            )
            store.append(event, conversationId: conversationId)
        }

        let events = store.events(forConversationId: conversationId)
        XCTAssertEqual(events.count, 3)
        XCTAssertEqual(events.map(\.messageIndex), [0, 1, 2])
    }

    func testEventsForOneConversationNeverAppearInAnother() {
        let conversationA = UUID()
        let conversationB = UUID()
        let store = SentimentTimelineStore()

        let eventA = SentimentEvent(
            conversationId: conversationA,
            messageIndex: 0,
            speaker: .user,
            scoreDelta: 1.0,
            signal: "warmth",
            timestamp: Date()
        )
        store.append(eventA, conversationId: conversationA)

        let eventsForB = store.events(forConversationId: conversationB)
        XCTAssertTrue(eventsForB.isEmpty, "Conversation B must never see conversation A's events (CALC-03 isolation)")
    }

    /// CALC-03 negative structural guard: source-scan SentimentTimelineStore.swift
    /// for forbidden identity-parameter tokens, enforcing per-conversationId-only
    /// keying by construction, not by convention.
    func testSourceContainsNoMatchIdentityTokens() throws {
        let thisFile = URL(fileURLWithPath: #filePath)
        let storeFileURL = thisFile
            .deletingLastPathComponent() // SentimentTimelineStoreTests.swift -> BanterSharedTests/
            .deletingLastPathComponent() // BanterSharedTests/ -> Tests/
            .deletingLastPathComponent() // Tests/ -> BanterShared/ (package root)
            .appendingPathComponent("Sources")
            .appendingPathComponent("BanterShared")
            .appendingPathComponent("Calculator")
            .appendingPathComponent("SentimentTimelineStore.swift")

        let source = try String(contentsOf: storeFileURL, encoding: .utf8)

        let forbidden = ["matchName", "matchId", "matchIdentity"]
        for token in forbidden {
            XCTAssertFalse(
                source.contains(token),
                "Forbidden identity token '\(token)' found in SentimentTimelineStore.swift - CALC-03 boundary violated"
            )
        }
    }
}
