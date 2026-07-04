import SwiftUI
import BanterShared

/// Coordinates the fresh-install onboarding flow: Welcome -> Photos priming
/// -> real Import/Confirm loop -> coaching suggestions. Wraps the existing
/// ImportFlowModel state machine unchanged and, after .confirm, calls
/// CoachingClient directly to show SuggestionCardView/TonePickerView (the
/// Plan 02 surface) - the same Group { switch state { ... } } dispatcher
/// shape as ContentView, never a NavigationStack push flow.
///
/// HARD GUARD (RESEARCH Pitfall 4 / ONBD-01): this file must never reference
/// DailyCapTracker or EntitlementManager. The first coaching call during
/// onboarding is ungated - no cap increment, no entitlement fetch.
struct ValueDemoCoordinatorView: View {
    @State private var onboardingModel: OnboardingFlowModel
    @State private var importModel: ImportFlowModel
    @State private var coachingModel: CoachingResultModel?

    init() {
        let importModel = ImportFlowModel()
        let onboardingModel = OnboardingFlowModel()
        // Phase 2's ScreenshotArtifactTests launches with
        // --seed-sample-transcript alone (no onboarding seed arg) and
        // expects to land directly on Confirm - preserve that existing CI
        // path unchanged by skipping straight to .importFlow when
        // ImportFlowModel's own debug seed already put it in .confirm.
        if importModel.state == .confirm {
            onboardingModel.continueToImport()
        }
        _importModel = State(initialValue: importModel)
        _onboardingModel = State(initialValue: onboardingModel)
    }

    var body: some View {
        Group {
            switch onboardingModel.state {
            case .welcome:
                WelcomeView(model: onboardingModel)
            case .permissionPriming:
                PermissionPrimingView.photos(
                    onContinue: { onboardingModel.continueToImport() },
                    onSkip: { onboardingModel.skipPriming() }
                )
            case .importFlow:
                importFlowContent
            case .suggestionsShown:
                suggestionsContent
            }
        }
        .onChange(of: importModel.state) { _, newState in
            if newState == .confirm {
                Task { await startCoaching() }
            }
        }
    }

    @ViewBuilder
    private var importFlowContent: some View {
        switch importModel.state {
        case .entry(let startInPasteMode):
            ImportEntryView(model: importModel, startInPasteMode: startInPasteMode)
        case .parsing(let source):
            ParsingProgressView(
                source: source,
                isFailure: false,
                onTryAgain: { importModel.retryFromFailure() },
                onPasteInstead: { importModel.pasteInsteadFromFailure() }
            )
        case .failure(let source):
            ParsingProgressView(
                source: source,
                isFailure: true,
                onTryAgain: { importModel.retryFromFailure() },
                onPasteInstead: { importModel.pasteInsteadFromFailure() }
            )
        case .confirm:
            ConfirmTranscriptView(model: importModel)
        }
    }

    @ViewBuilder
    private var suggestionsContent: some View {
        if let coachingModel {
            ScrollView {
                VStack(spacing: Banter.Spacing.lg) {
                    TonePickerView(model: coachingModel)
                    ForEach(Array(coachingModel.replies.enumerated()), id: \.offset) { index, reply in
                        SuggestionCardView(index: index, reply: reply, model: coachingModel)
                    }
                }
                .padding(.horizontal, Banter.Spacing.md)
                .padding(.top, Banter.Spacing.md)
            }
            .background(Banter.Colors.background.ignoresSafeArea())
        }
    }

    /// The onboarding demo's first coaching call - client-minted
    /// conversationId, ungated. Never touches DailyCapTracker/
    /// EntitlementManager.
    @MainActor
    private func startCoaching() async {
        let model = CoachingResultModel(messages: importModel.transcript)
        coachingModel = model
        onboardingModel.showSuggestions()
        await model.selectTone(model.selectedTone)
    }
}
