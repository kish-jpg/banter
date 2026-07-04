import Foundation

/// MONE-01: caps free-tier analysis *generation* frequency only. This
/// tracker has no API surface related to psychology tags — tags on
/// already-loaded cards stay visible at cap (enforced by the UI, not here;
/// see DailyCapTrackerTests.testTrackerDoesNotGateTagVisibility).
///
/// Backed by AppGroupStore, keyed by `"dailyCap.\(dateString)"` — a
/// date-scoped key so a new day naturally starts at 0 with no explicit
/// midnight-reset logic (T-04-05-CAPBYPASS: a clock rollback can reset this
/// counter early; accepted risk, no financial loss, documented in the plan's
/// threat register).
public final class DailyCapTracker {
    private let dailyLimit: Int
    private let key: String

    public init(dailyLimit: Int, dateString: String) {
        self.dailyLimit = dailyLimit
        self.key = "dailyCap.\(dateString)"
    }

    /// Premium is never capped — callers pass `isPremium` from
    /// EntitlementManager; when true this always returns true regardless of
    /// count.
    public func canAnalyze(isPremium: Bool) -> Bool {
        isPremium || canGenerate()
    }

    public func canGenerate() -> Bool {
        currentCount() < dailyLimit
    }

    public func recordAnalysis() {
        recordGeneration()
    }

    public func recordGeneration() {
        AppGroupStore.write(currentCount() + 1, forKey: key)
    }

    private func currentCount() -> Int {
        AppGroupStore.read(Int.self, forKey: key) ?? 0
    }
}
