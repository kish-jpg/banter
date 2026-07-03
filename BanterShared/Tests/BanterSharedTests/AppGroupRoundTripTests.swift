import XCTest
@testable import BanterShared

/// Same-process XCTest exercising `AppGroupStore` directly. This validates
/// the BanterShared read/write logic in isolation — the accepted Phase 1 bar
/// per 01-RESEARCH.md Open Questions #1. On-device, cross-process (app
/// writes, keyboard reads) proof is explicitly deferred; see VALIDATION.md
/// Manual-Only Verifications.
final class AppGroupRoundTripTests: XCTestCase {
    func testConversationMessageRoundTrips() {
        let message = ConversationMessage(speaker: .user, text: "hey!", order: 0)
        AppGroupStore.write(message, forKey: "test_message")
        let read = AppGroupStore.read(ConversationMessage.self, forKey: "test_message")
        XCTAssertEqual(read, message)
    }

    func testReplySuggestionRoundTrips() {
        let suggestion = ReplySuggestion(text: "...", psychologyTag: "reciprocity", style: .playful)
        AppGroupStore.write(suggestion, forKey: "test_suggestion")
        let read = AppGroupStore.read(ReplySuggestion.self, forKey: "test_suggestion")
        XCTAssertEqual(read, suggestion)
    }

    func testSentimentEventRoundTrips() {
        let event = SentimentEvent(
            conversationId: UUID(),
            messageIndex: 0,
            speaker: .user,
            scoreDelta: 0.5,
            signal: "warmth",
            timestamp: Date()
        )
        AppGroupStore.write(event, forKey: "test_event")
        let read = AppGroupStore.read(SentimentEvent.self, forKey: "test_event")
        XCTAssertEqual(read, event)
    }

    func testMissingKeyReturnsNil() {
        let read = AppGroupStore.read(ConversationMessage.self, forKey: "test_never_written_key")
        XCTAssertNil(read)
    }
}
