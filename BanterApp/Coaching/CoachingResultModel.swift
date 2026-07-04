import Foundation
import Observation
import BanterShared

/// State for the coaching result surface: 3 tagged suggestion cards,
/// steerable by tone (COAC-02). Mutated only via methods, mirroring
/// ImportFlowModel's private(set)-state shape.
@Observable
@MainActor
public final class CoachingResultModel {
    public private(set) var replies: [ReplySuggestion]
    public private(set) var selectedTone: ReplyStyle
    public private(set) var isLoading: Bool = false
    public private(set) var errorMessage: String?
    public private(set) var expandedTagIndices: Set<Int> = []

    /// Set by a later Phase 4 plan's daily-cap wiring; defaults false here so
    /// the onboarding demo path stays ungated (RESEARCH.md Pitfall 4).
    public private(set) var dailyCapReached: Bool = false

    private let messages: [ConversationMessage]
    private let client: CoachingClient

    public init(
        messages: [ConversationMessage],
        replies: [ReplySuggestion] = [],
        selectedTone: ReplyStyle = .playful,
        client: CoachingClient = CoachingClient()
    ) {
        self.messages = messages
        self.replies = replies
        self.selectedTone = selectedTone
        self.client = client
    }

    public func selectTone(_ tone: ReplyStyle) async {
        selectedTone = tone
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        let request = TonePicker(selected: tone).makeRequest(messages: messages)
        do {
            let response = try await client.send(request)
            replies = response.replies
        } catch {
            errorMessage = "Couldn't get suggestions"
        }
    }

    public func toggleTagExpanded(at index: Int) {
        if expandedTagIndices.contains(index) {
            expandedTagIndices.remove(index)
        } else {
            expandedTagIndices.insert(index)
        }
    }
}
