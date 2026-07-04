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

    /// True once a non-onboarding caller's DailyCapTracker has blocked a new
    /// analysis. Defaults false, and the onboarding demo path never supplies
    /// a capGate closure, so it can never become true there (RESEARCH.md
    /// Pitfall 4 — the demo call stays structurally ungated).
    public private(set) var dailyCapReached: Bool = false

    private let messages: [ConversationMessage]
    private let client: CoachingClient

    /// Non-onboarding callers pass a closure consulting
    /// DailyCapTracker.canAnalyze(isPremium:)/EntitlementManager.isPremium;
    /// nil (the default) means "never capped" — the shape the onboarding
    /// demo path relies on by simply not supplying one.
    private let capGate: (() -> Bool)?
    private let onAnalysisRecorded: (() -> Void)?

    public init(
        messages: [ConversationMessage],
        replies: [ReplySuggestion] = [],
        selectedTone: ReplyStyle = .playful,
        client: CoachingClient = CoachingClient(),
        capGate: (() -> Bool)? = nil,
        onAnalysisRecorded: (() -> Void)? = nil
    ) {
        self.messages = messages
        self.replies = replies
        self.selectedTone = selectedTone
        self.client = client
        self.capGate = capGate
        self.onAnalysisRecorded = onAnalysisRecorded
    }

    public func selectTone(_ tone: ReplyStyle) async {
        if let capGate, !capGate() {
            dailyCapReached = true
            return
        }
        dailyCapReached = false

        selectedTone = tone
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        let request = TonePicker(selected: tone).makeRequest(messages: messages)
        do {
            let response = try await client.send(request)
            replies = response.replies
            onAnalysisRecorded?()
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
