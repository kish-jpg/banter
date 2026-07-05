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

    /// Additive response hook (CALC-02): fires once per non-stale coaching
    /// response with the full decoded DTO, so a caller can append a
    /// SentimentEvent without CoachingResultModel knowing about
    /// SentimentTimelineStore. Defaults nil, so the onboarding demo path
    /// (which never supplies it) appends no sentiment (ONBD-01).
    private let onResponse: ((CoachingResponseDTO) -> Void)?

    /// Monotonic request generation. Rapid tone switches start overlapping
    /// requests; only the newest generation may mutate `replies`/`errorMessage`
    /// (or count toward the daily cap) — stale completions are dropped.
    private var requestGeneration = 0

    public init(
        messages: [ConversationMessage],
        replies: [ReplySuggestion] = [],
        selectedTone: ReplyStyle = .playful,
        client: CoachingClient = CoachingClient(),
        capGate: (() -> Bool)? = nil,
        onAnalysisRecorded: (() -> Void)? = nil,
        onResponse: ((CoachingResponseDTO) -> Void)? = nil
    ) {
        self.messages = messages
        self.replies = replies
        self.selectedTone = selectedTone
        self.client = client
        self.capGate = capGate
        self.onAnalysisRecorded = onAnalysisRecorded
        self.onResponse = onResponse
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
        requestGeneration += 1
        let generation = requestGeneration
        defer {
            if generation == requestGeneration { isLoading = false }
        }

        let request = TonePicker(selected: tone).makeRequest(messages: messages)
        do {
            let response = try await client.send(request)
            guard generation == requestGeneration else { return }
            replies = response.replies
            onAnalysisRecorded?()
            onResponse?(response)
        } catch {
            guard generation == requestGeneration else { return }
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
