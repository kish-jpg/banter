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
