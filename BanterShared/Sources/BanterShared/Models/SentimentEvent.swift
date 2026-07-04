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
    /// Optional so every pre-existing call site (Wave-0 test scaffolds built
    /// before CALC-02's factor grid existed) keeps compiling unchanged.
    public let factors: SentimentFactors?

    public init(
        conversationId: UUID,
        messageIndex: Int,
        speaker: Speaker,
        scoreDelta: Double,
        signal: String,
        timestamp: Date,
        factors: SentimentFactors? = nil
    ) {
        self.conversationId = conversationId
        self.messageIndex = messageIndex
        self.speaker = speaker
        self.scoreDelta = scoreDelta
        self.signal = signal
        self.timestamp = timestamp
        self.factors = factors
    }
}
