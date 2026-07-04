import BanterShared
import RevenueCat

/// Production EntitlementSource, wrapping the RevenueCat v5.x SDK.
/// Entitlement id "premium" and product id "com.banter.premium.weekly" are
/// confirmed against Banter.storekit (Plan 01) and the live RevenueCat docs
/// (https://www.revenuecat.com/docs/customers/customer-info) — Task 1 gate.
///
/// Lives in BanterApp (not BanterShared) because RevenueCat/purchases-ios is
/// only a BanterApp package dependency (project.yml) — BanterShared's
/// EntitlementSource protocol seam has zero SDK dependency so
/// EntitlementManagerTests never needs `import RevenueCat` to compile.
public struct RevenueCatEntitlementSource: EntitlementSource {
    /// RevenueCat's entitlement identifier configured in the dashboard,
    /// confirmed to match Banter.storekit's subscription group (Task 1).
    static let entitlementId = "premium"

    public init() {}

    public func fetchState() async -> EntitlementState {
        // Unconfigured SDK (placeholder key build) degrades to .free instead
        // of tripping Purchases.shared's not-configured fatalError.
        guard Purchases.isConfigured else {
            return .free
        }
        guard let info = try? await Purchases.shared.customerInfo() else {
            return .free
        }
        guard let entitlement = info.entitlements[Self.entitlementId], entitlement.isActive else {
            return .free
        }
        return entitlement.periodType == .trial ? .trialActive : .premium
    }
}

/// RevenueCat SDK configuration. StoreKit-config-only local testing for now
/// (per Task 1 resolution) — this key is a runtime-config placeholder, never
/// a real embedded secret. Safe to embed once real: RevenueCat's public SDK
/// key is designed to be public (T-04-05-KEY, unlike GEMINI_API_KEY).
enum RevenueCatConfig {
    /// TODO(deferred): replace via Info.plist/xcconfig once the RevenueCat
    /// dashboard project exists. RC_PUBLIC_SDK_KEY_PLACEHOLDER is an obvious
    /// sentinel — Purchases.configure must not be called with this value in
    /// a build that expects live purchases to work.
    static let placeholderKey = "RC_PUBLIC_SDK_KEY_PLACEHOLDER"
    static let publicSDKKey = placeholderKey

    /// True only once publicSDKKey has been replaced with a real dashboard
    /// key — BanterAppApp gates Purchases.configure on this.
    static var hasRealKey: Bool { publicSDKKey != placeholderKey }
}
