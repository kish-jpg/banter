import Foundation

// This file defines the request boundary that would cross to the backend.
// Structured text only, by construction: every member below is a String,
// a primitive, or another Codable model type from this package. Binary
// image payloads are structurally excluded — there is no member here that
// could ever hold a screenshot or raw pixel buffer. This is CAPT-04's
// guarantee, enforced by the type system and tripwired by
// NetworkBoundaryGuardTests, not by convention.

/// A request to analyze a conversation transcript and produce reply
/// suggestions. Carries only structured text — never raw image data.
public struct AnalyzeConversationRequest: Codable {
    public let messages: [ConversationMessage]
    public let tone: ReplyStyle?

    public init(messages: [ConversationMessage], tone: ReplyStyle? = nil) {
        self.messages = messages
        self.tone = tone
    }
}

/// The four fixed sentiment factors returned by the coaching backend.
/// Mirrors Backend/functions/coaching/llm/LLMProvider.ts's
/// CoachingResponse.sentiment.factors exactly — a fixed-key object, not a
/// dictionary, matching the locked Deno<->Swift contract.
public struct SentimentFactors: Codable, Equatable {
    public let interest: Double
    public let reciprocity: Double
    public let warmth: Double
    public let responsiveness: Double

    public init(interest: Double, reciprocity: Double, warmth: Double, responsiveness: Double) {
        self.interest = interest
        self.reciprocity = reciprocity
        self.warmth = warmth
        self.responsiveness = responsiveness
    }
}

/// Aggregate sentiment for a coaching response. Server-stateless in Phase 3 —
/// no event-timeline persistence yet (deferred to Phase 4, see Backend/README.md).
public struct SentimentDTO: Codable, Equatable {
    public let score: Double
    public let factors: SentimentFactors
    public let signal: String

    public init(score: Double, factors: SentimentFactors, signal: String) {
        self.score = score
        self.factors = factors
        self.signal = signal
    }
}

/// The coaching edge function's response body. Mirrors
/// Backend/functions/coaching/llm/LLMProvider.ts's CoachingResponse exactly
/// (replies: ReplySuggestion, no confidence field) plus an echoed,
/// client-minted conversationId (see Backend/README.md for the decision).
/// This is the Deno<->Swift shared-fixture contract — kept byte-identical to
/// coaching-response.sample.json via Backend/scripts/sync-fixture.sh.
public struct CoachingResponseDTO: Codable, Equatable {
    public let replies: [ReplySuggestion]
    public let sentiment: SentimentDTO
    public let conversationId: UUID?

    public init(replies: [ReplySuggestion], sentiment: SentimentDTO, conversationId: UUID? = nil) {
        self.replies = replies
        self.sentiment = sentiment
        self.conversationId = conversationId
    }
}
