import Foundation

/// A single sentiment-scoring event tied to one message in a conversation,
/// feeding the "love calculator".
public struct SentimentEvent: Codable, Equatable {
    public let conversationId: UUID
    public let messageIndex: Int
    public let speaker: Speaker
    public let scoreDelta: Double
    public let signal: String
    public let timestamp: Date

    public init(
        conversationId: UUID,
        messageIndex: Int,
        speaker: Speaker,
        scoreDelta: Double,
        signal: String,
        timestamp: Date
    ) {
        self.conversationId = conversationId
        self.messageIndex = messageIndex
        self.speaker = speaker
        self.scoreDelta = scoreDelta
        self.signal = signal
        self.timestamp = timestamp
    }
}
