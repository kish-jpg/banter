import Foundation

/// Who sent a given message in a dating-app conversation.
public enum Speaker: String, Codable {
    case user
    case match
}

/// A single message in a transcript, in send order.
public struct ConversationMessage: Codable, Equatable {
    public let speaker: Speaker
    public let text: String
    public let order: Int

    public init(speaker: Speaker, text: String, order: Int) {
        self.speaker = speaker
        self.text = text
        self.order = order
    }
}
