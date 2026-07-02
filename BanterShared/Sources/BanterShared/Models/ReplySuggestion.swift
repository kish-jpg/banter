import Foundation

/// The tone of a suggested reply.
public enum ReplyStyle: String, Codable {
    case playful
    case sincere
    case witty
    case direct
}

/// A single suggested reply, with the psychology tag explaining why it works.
public struct ReplySuggestion: Codable, Equatable {
    public let text: String
    public let psychologyTag: String
    public let style: ReplyStyle

    public init(text: String, psychologyTag: String, style: ReplyStyle) {
        self.text = text
        self.psychologyTag = psychologyTag
        self.style = style
    }
}
