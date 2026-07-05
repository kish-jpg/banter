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

    /// Resolves entitlement state on appear. Downgrade-transition detection
    /// is layered onto this same call site by Task 2.
    func refreshEntitlement() async {
        await entitlement.refresh()
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
