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
    private let onComplete: () -> Void

    init(arguments: [String] = CommandLine.arguments, onComplete: @escaping () -> Void = {}) {
        self.onComplete = onComplete
        let importModel = ImportFlowModel(arguments: arguments)
        let onboardingModel = OnboardingFlowModel(arguments: arguments)
        // ImportFlowModel's own --seed-sample-transcript debug seed already
        // put it in .confirm (bypassing real OCR/paste parsing for CI
        // determinism). Two CI consumers rely on this:
        // - Phase 2's ScreenshotArtifactTests passes --seed-sample-transcript
        //   ALONE and expects Confirm immediately, no Welcome tap - skip
        //   straight past onboarding into .importFlow.
        // - OnboardingFlowTests passes it WITH --seed-fresh-install and
        //   expects to see Welcome first, tap "Try It Now" once, then land
        //   on suggestions with no priming step in between (the seed already
        //   proves no real PhotosPicker/permission flow is exercised) - stay
        //   on .welcome, but pre-mark priming as seen so start() routes
        //   straight to .importFlow on tap.
        #if DEBUG
        if importModel.state == .confirm {
            if arguments.contains(OnboardingFlowModel.seedFreshInstallArgument)
                || arguments.contains(OnboardingFlowModel.resetOnboardingStateArgument) {
                onboardingModel.markPrimingSeenWithoutAdvancing()
            } else {
                onboardingModel.continueToImport()
            }
        }
        #endif
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
        .onChange(of: onboardingModel.state) { _, newState in
            // Covers the CI-seeded case: importModel.state was already
            // .confirm before this view appeared (ImportFlowModel's own
            // debug seed), so the .onChange(of: importModel.state) above
            // never fires for it. Once onboardingModel transitions into
            // .importFlow (the Welcome tap), check whether import is
            // already sitting in .confirm and kick off coaching directly.
            if newState == .importFlow, importModel.state == .confirm, coachingModel == nil {
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

                    // First-run value demo must never dead-end silently:
                    // show a spinner while the request is in flight and an
                    // error + Retry if it fails (offline/backend down).
                    if coachingModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.top, Banter.Spacing.xl)
                    } else if let errorMessage = coachingModel.errorMessage {
                        VStack(spacing: Banter.Spacing.sm) {
                            Text(errorMessage)
                                .font(Banter.TextStyle.body)
                                .foregroundStyle(Banter.Colors.textSecondary)
                                .multilineTextAlignment(.center)
                            Button("Retry") {
                                Task { await coachingModel.selectTone(coachingModel.selectedTone) }
                            }
                            .font(Banter.TextStyle.body)
                            .foregroundStyle(Banter.Colors.accent)
                            .frame(minHeight: 44)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, Banter.Spacing.xl)
                    }

                    ForEach(Array(coachingModel.replies.enumerated()), id: \.offset) { index, reply in
                        SuggestionCardView(index: index, reply: reply, model: coachingModel)
                    }

                    Button {
                        onComplete()
                    } label: {
                        Text("Continue to Banter")
                            .font(Banter.TextStyle.body)
                            .foregroundStyle(Banter.Colors.accent)
                            .frame(minHeight: 44)
                    }
                    .padding(.top, Banter.Spacing.sm)
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
        #if DEBUG
        // CI seed (OnboardingFlowTests): no coaching backend runs on the CI
        // simulator, so `--seed-sample-replies` populates the suggestions
        // surface from a static fixture instead of the network — mirrors
        // ImportFlowModel's --seed-sample-transcript pattern.
        if CommandLine.arguments.contains(Self.seedSampleRepliesArgument) {
            coachingModel = CoachingResultModel(
                messages: importModel.transcript,
                replies: Self.sampleReplies
            )
            onboardingModel.showSuggestions()
            return
        }
        #endif
        let model = CoachingResultModel(messages: importModel.transcript)
        coachingModel = model
        onboardingModel.showSuggestions()
        await model.selectTone(model.selectedTone)
    }

    #if DEBUG
    /// Debug launch argument: seed the suggestions screen with a static
    /// reply fixture (no network call). Tags are real taxonomy.json
    /// tagNames so TagExplainerSheet expansion works in CI too.
    static let seedSampleRepliesArgument = "--seed-sample-replies"

    private static let sampleReplies: [ReplySuggestion] = [
        ReplySuggestion(
            text: "Chaos buddies then — what's been the most 'a lot' part of your week?",
            psychologyTag: "Turning toward a bid",
            style: .playful
        ),
        ReplySuggestion(
            text: "Honestly same. Mine's been saved by good coffee — what's saving yours?",
            psychologyTag: "Reciprocal self-disclosure",
            style: .playful
        ),
        ReplySuggestion(
            text: "Weeks like that deserve a proper debrief. Trade highlights sometime?",
            psychologyTag: "Mutual exchange",
            style: .playful
        ),
    ]
    #endif
}
