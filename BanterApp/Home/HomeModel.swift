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
    let capTracker = DailyCapTracker(dailyLimit: 3, dateString: Self.todayDateString)
    let importModel = ImportFlowModel()
    private(set) var coaching: CoachingResultModel?

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
            // Back on premium - clear the marker so a FUTURE downgrade (a
            // second trial/subscription cycle) shows the banner again
            // instead of staying deduped forever.
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
            capGate: { [entitlement, capTracker] in capTracker.canAnalyze(isPremium: entitlement.isPremium) },
            onAnalysisRecorded: { [capTracker] in capTracker.recordAnalysis() }
        )
        coaching = model
        await model.selectTone(model.selectedTone)
    }

    private static var todayDateString: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}
