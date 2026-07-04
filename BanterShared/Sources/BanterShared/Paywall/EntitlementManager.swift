import Foundation
import Observation

/// The premium-entitlement states an `EntitlementSource` can report.
/// `.trialActive` and `.premium` both unlock premium access; `.free` is the
/// only non-premium state. Trial-expired is represented by the source simply
/// reporting `.free` again (no separate "expired" case — expiry IS a revert
/// to free, per MONE-03's graceful-downgrade requirement).
public enum EntitlementState: Equatable, Sendable {
    case free
    case trialActive
    case premium
}

/// Seam between EntitlementManager and whatever resolves entitlement truth.
/// The production conformer (BanterApp, RevenueCat-backed) lives outside
/// BanterShared since the RevenueCat SDK is not a BanterShared dependency;
/// this protocol lets EntitlementManagerTests mock entitlement state with
/// zero dependency on the live SDK.
public protocol EntitlementSource: Sendable {
    func fetchState() async -> EntitlementState
}

/// Single source of truth for premium/trial state (MONE-02/MONE-03).
/// `isPremium` is derived ONLY from the source's fetched state each
/// `refresh()` — never a separately-persisted bool a tampered device could
/// flip (T-04-05-SPOOF). `isLoaded` stays false until the first refresh
/// resolves, so callers never assert a tier before the async call completes
/// (RESEARCH.md Pitfall 2).
@Observable
public final class EntitlementManager {
    public private(set) var isPremium: Bool = false
    public private(set) var isLoaded: Bool = false

    private let source: EntitlementSource

    public init(source: EntitlementSource) {
        self.source = source
    }

    public func refresh() async {
        let state = await source.fetchState()
        isPremium = state == .trialActive || state == .premium
        isLoaded = true
    }
}
