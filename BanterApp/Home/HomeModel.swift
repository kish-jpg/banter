import Foundation
import Observation
import BanterShared

/// Post-onboarding app controller — the ONLY place EntitlementManager and
/// DailyCapTracker are constructed for a real (non-demo) session. The
/// onboarding value-demo path (ValueDemoCoordinatorView) never references
/// either type; this is where the freemium cap/paywall machinery actually
/// starts existing (closes the Phase 4 WR-02 "built but unwired" gap).
@Observable
@MainActor
final class HomeModel {
    let entitlement = EntitlementManager(source: RevenueCatEntitlementSource())
    let importModel = ImportFlowModel()
    private(set) var coaching: CoachingResultModel?

    /// Client-minted, CALC-03-safe key (no match name/identity) scoping the
    /// love-calculator timeline to this one conversation. A fresh
    /// conversation gets a fresh conversationId via startNewConversation().
    private(set) var conversationId = UUID()
    let sentimentStore = SentimentTimelineStore()

    /// True on a premium->free transition (trial/subscription expiry) that
    /// hasn't been shown yet — deduped via
    /// DowngradeBannerStorageKey.lastSeenDowngrade so re-launching on the
    /// free tier doesn't re-show it every time (MONE-03).
    private(set) var showDowngradeBanner = false

    private static let lastKnownPremiumKey = "entitlement.lastKnownPremium"

    /// Resolves entitlement state on appear and detects a premium->free
    /// transition since the last check.
    func refreshEntitlement() async {
        let wasPremium = AppGroupStore.read(Bool.self, forKey: Self.lastKnownPremiumKey) ?? false
        await entitlement.refresh()
        let isPremiumNow = entitlement.isPremium

        if wasPremium, !isPremiumNow {
            let alreadySeen = AppGroupStore.read(Bool.self, forKey: DowngradeBannerStorageKey.lastSeenDowngrade) ?? false
            if !alreadySeen {
                showDowngradeBanner = true
                AppGroupStore.write(true, forKey: DowngradeBannerStorageKey.lastSeenDowngrade)
            }
        }
        if isPremiumNow {
            // Back on premium - hide any showing banner (an in-session
            // re-upgrade must not keep saying "back on the free plan") and
            // clear the marker so a FUTURE downgrade (a second
            // trial/subscription cycle) shows the banner again instead of
            // staying deduped forever.
            showDowngradeBanner = false
            AppGroupStore.write(false, forKey: DowngradeBannerStorageKey.lastSeenDowngrade)
        }
        AppGroupStore.write(isPremiumNow, forKey: Self.lastKnownPremiumKey)
    }

    /// Builds the real, cap-gated coaching model — the injection point the
    /// onboarding demo path deliberately never supplies (RESEARCH.md
    /// Pitfall 4 / ONBD-01).
    func startCoaching() async {
        let model = CoachingResultModel(
            messages: importModel.transcript,
            capGate: { [entitlement] in HomeModel.makeCapTracker().canAnalyze(isPremium: entitlement.isPremium) },
            onAnalysisRecorded: { HomeModel.makeCapTracker().recordAnalysis() },
            onResponse: { [sentimentStore, conversationId, importModel] response in
                sentimentStore.append(from: response, conversationId: conversationId, messageIndex: max(0, importModel.transcript.count - 1), speaker: .match)
                // Caches the latest suggestions for the keyboard to read (KEYS-01).
                AppGroupStore.write(response.replies, forKey: CachedSuggestionsStorageKey.suggestions)
            }
        )
        coaching = model
        await model.selectTone(model.selectedTone)
    }

    /// WR-03: resets the conversation-scoped pieces (coaching surface,
    /// timeline id, import flow) so a second conversation can be analyzed
    /// without killing the app. Session-long cap/entitlement/banner state is
    /// deliberately untouched. The old coaching model's onResponse closure
    /// captured the old conversationId by value, so any in-flight response
    /// still lands in the correct (old) timeline.
    func startNewConversation() {
        coaching = nil
        conversationId = UUID()
        importModel.startOver()
    }

    /// Built per gate/record call (WR-02): the tracker's date-scoped storage
    /// key must reflect "today" at USE time, not HomeModel-init time, so a
    /// session spanning midnight rolls over to the new day's cap instead of
    /// reading/writing yesterday's key forever. DailyCapTracker is stateless
    /// (all state lives in AppGroupStore), so per-call construction is free.
    private static func makeCapTracker() -> DailyCapTracker {
        DailyCapTracker(dailyLimit: 3, dateString: todayDateString)
    }

    private static let dateKeyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static var todayDateString: String {
        dateKeyFormatter.string(from: Date())
    }
}
