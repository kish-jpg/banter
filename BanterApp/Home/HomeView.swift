import SwiftUI
import UIKit
import BanterShared

/// Post-onboarding home surface: the real (non-demo), cap-gated import ->
/// coach loop. Mirrors ValueDemoCoordinatorView's dispatcher shape minus the
/// onboarding Welcome/permission-priming states, with HomeModel supplying
/// the capGate/onAnalysisRecorded machinery ValueDemoCoordinatorView
/// deliberately omits (ONBD-01).
struct HomeView: View {
    @State private var model = HomeModel()
    @State private var showPaywall = false
    @State private var showKeyboardEnable = false

    /// BanterKeyboard's bundle id — derived from project.yml's
    /// bundleIdPrefix (com.banter) + XcodeGen's default target-name suffix.
    /// Used only for the fail-open best-effort AppleKeyboards check below.
    private static let keyboardExtensionBundleID = "com.banter.BanterKeyboard"

    private var shouldShowKeyboardEnableBanner: Bool {
        let dismissed = AppGroupStore.read(Bool.self, forKey: KeyboardEnableBannerStorageKey.dismissed) ?? false
        if dismissed { return false }
        // Fail-open (05-RESEARCH.md Assumption A1): an uncertain/false read
        // means "show the banner", never "hide it".
        return !isKeyboardLikelyEnabled(bundleID: Self.keyboardExtensionBundleID)
    }

    var body: some View {
        VStack(spacing: 0) {
            if model.showDowngradeBanner {
                DowngradeBanner(onGoPremium: { showPaywall = true })
                    .padding(.horizontal, Banter.Spacing.md)
                    .padding(.top, Banter.Spacing.sm)
            }

            if shouldShowKeyboardEnableBanner {
                KeyboardEnableBanner(onTap: { showKeyboardEnable = true })
                    .padding(.horizontal, Banter.Spacing.md)
                    .padding(.top, Banter.Spacing.sm)
            }

            Group {
                if model.coaching != nil {
                    suggestionsContent
                } else {
                    importFlowContent
                }
            }
        }
        .onChange(of: model.importModel.state) { _, newState in
            // CAPT-04: coaching starts on the user's Confirm tap
            // (.confirmed), never on parse completion (.confirm) — the
            // Confirm screen must be reviewable before anything leaves
            // the device.
            if newState == .confirmed {
                Task { await model.startCoaching() }
            }
        }
        .task {
            await model.refreshEntitlement()
        }
        .onChange(of: showPaywall) { _, isShowing in
            // Re-reconcile after the paywall closes: an in-session purchase
            // must clear the downgrade banner and update lastKnownPremium so
            // the NEXT downgrade is still detected.
            if !isShowing {
                Task { await model.refreshEntitlement() }
            }
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView(entitlementManager: model.entitlement, onDismiss: { showPaywall = false })
        }
        .sheet(isPresented: $showKeyboardEnable) {
            PermissionPrimingView.keyboard(
                onContinue: { openKeyboardSettings() },
                onSkip: { dismissKeyboardBanner() }
            )
        }
    }

    /// KEYS-04 primary CTA: deep-links to Settings > General > Keyboard via
    /// the prefs URL type registered in BanterApp/Info.plist (QA1924).
    private func openKeyboardSettings() {
        if let url = URL(string: "prefs:root=General&path=Keyboard") {
            UIApplication.shared.open(url)
        }
    }

    /// One-shot dismissal (mirrors DowngradeBanner's dedup shape) — the
    /// banner does not reappear once dismissed (05-UI-SPEC.md Screen 5.3).
    private func dismissKeyboardBanner() {
        AppGroupStore.write(true, forKey: KeyboardEnableBannerStorageKey.dismissed)
        showKeyboardEnable = false
    }

    @ViewBuilder
    private var importFlowContent: some View {
        switch model.importModel.state {
        case .entry(let startInPasteMode):
            ImportEntryView(model: model.importModel, startInPasteMode: startInPasteMode)
        case .parsing(let source):
            ParsingProgressView(
                source: source,
                isFailure: false,
                onTryAgain: { model.importModel.retryFromFailure() },
                onPasteInstead: { model.importModel.pasteInsteadFromFailure() }
            )
        case .failure(let source):
            ParsingProgressView(
                source: source,
                isFailure: true,
                onTryAgain: { model.importModel.retryFromFailure() },
                onPasteInstead: { model.importModel.pasteInsteadFromFailure() }
            )
        case .confirm, .confirmed:
            // .confirmed renders for at most a frame before startCoaching
            // sets `coaching` and the dispatcher switches surfaces.
            ConfirmTranscriptView(model: model.importModel)
        }
    }

    @ViewBuilder
    private var suggestionsContent: some View {
        if let coaching = model.coaching {
            ScrollView {
                VStack(spacing: Banter.Spacing.lg) {
                    TonePickerView(model: coaching)

                    if coaching.dailyCapReached {
                        dailyCapBanner
                    }

                    if coaching.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.top, Banter.Spacing.xl)
                    } else if let errorMessage = coaching.errorMessage {
                        VStack(spacing: Banter.Spacing.sm) {
                            Text(errorMessage)
                                .font(Banter.TextStyle.body)
                                .foregroundStyle(Banter.Colors.textSecondary)
                                .multilineTextAlignment(.center)
                            Button("Retry") {
                                Task { await coaching.selectTone(coaching.selectedTone) }
                            }
                            .font(Banter.TextStyle.body)
                            .foregroundStyle(Banter.Colors.accent)
                            .frame(minHeight: 44)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, Banter.Spacing.xl)
                    }

                    ForEach(Array(coaching.replies.enumerated()), id: \.offset) { index, reply in
                        SuggestionCardView(index: index, reply: reply, model: coaching)
                    }

                    NavigationLink {
                        ConversationHealthView(conversationId: model.conversationId, store: model.sentimentStore)
                    } label: {
                        Label("Conversation Health", systemImage: "heart.text.square")
                            .font(Banter.TextStyle.body)
                            .foregroundStyle(Banter.Colors.accent)
                            .frame(minHeight: 44)
                    }

                    Button {
                        model.startNewConversation()
                    } label: {
                        Label("New Conversation", systemImage: "plus.bubble")
                            .font(Banter.TextStyle.body)
                            .foregroundStyle(Banter.Colors.accent)
                            .frame(minHeight: 44)
                    }
                }
                .padding(.horizontal, Banter.Spacing.md)
                .padding(.top, Banter.Spacing.md)
            }
            .background(Banter.Colors.background.ignoresSafeArea())
        }
    }

    /// Daily-cap-reached surface (UI-SPEC Screen 4.3 States): shown ABOVE
    /// already-loaded cards, never in place of them — the cap only blocks
    /// generating NEW analyses, tags on existing cards stay visible
    /// (MONE-01).
    private var dailyCapBanner: some View {
        VStack(alignment: .leading, spacing: Banter.Spacing.xs) {
            Text("You've used today's free analyses")
                .font(Banter.TextStyle.heading)
                .foregroundStyle(Banter.Colors.textPrimary)

            Text("Tags are still yours — come back tomorrow, or go unlimited now.")
                .font(Banter.TextStyle.body)
                .foregroundStyle(Banter.Colors.textSecondary)

            Button {
                showPaywall = true
            } label: {
                Text("See Premium")
                    .font(Banter.TextStyle.body)
                    .foregroundStyle(Banter.Colors.accent)
                    .frame(minHeight: 44)
            }
        }
        .padding(Banter.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Banter.Colors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))
    }
}
