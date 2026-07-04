import Foundation

/// On-device, per-conversation sentiment timeline (CALC-02).
///
/// Every method accepts only a `conversationId: UUID` — never a match
/// name/identity string. This is the CALC-03 no-dossier boundary, enforced
/// by construction here and tripwired by `SentimentTimelineStoreTests`'
/// structural negative guard (forbidden-token source scan of this file).
///
/// Thin wrapper over `AppGroupStore`, keyed strictly by
/// `"timeline.\(conversationId)"` — never a cross-conversation key.
public final class SentimentTimelineStore {
    /// Per-conversation event cap. Conversations are short-lived; unbounded
    /// growth of a single UserDefaults value is accepted-risk (T-04-04-GROWTH)
    /// but capped anyway to keep each write small.
    public static let maxEventsPerConversation = 200

    public init() {}

    private func key(for conversationId: UUID) -> String {
        "timeline.\(conversationId)"
    }

    /// Appends one event to the conversation's timeline, dropping the oldest
    /// events beyond `maxEventsPerConversation`.
    public func append(_ event: SentimentEvent, conversationId: UUID) {
        var events = events(forConversationId: conversationId)
        events.append(event)
        if events.count > Self.maxEventsPerConversation {
            events.removeFirst(events.count - Self.maxEventsPerConversation)
        }
        AppGroupStore.write(events, forKey: key(for: conversationId))
    }

    /// Builds one `SentimentEvent` from a coaching response and appends it.
    public func append(
        from response: CoachingResponseDTO,
        conversationId: UUID,
        messageIndex: Int,
        speaker: Speaker
    ) {
        let event = SentimentEvent(
            conversationId: conversationId,
            messageIndex: messageIndex,
            speaker: speaker,
            scoreDelta: response.sentiment.score,
            signal: response.sentiment.signal,
            timestamp: Date(),
            factors: response.sentiment.factors
        )
        append(event, conversationId: conversationId)
    }

    /// Returns this conversation's events, in append order. Never returns
    /// events belonging to any other conversationId.
    public func events(forConversationId conversationId: UUID) -> [SentimentEvent] {
        AppGroupStore.read([SentimentEvent].self, forKey: key(for: conversationId)) ?? []
    }
}
