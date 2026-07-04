import SwiftUI
import RevenueCat

@main
struct BanterAppApp: App {
    init() {
        // Purchases.shared traps ("Purchases has not been configured") if
        // touched before configure. Configure once at launch — but never
        // with the placeholder sentinel key; paywall surfaces check
        // Purchases.isConfigured and degrade instead of crashing.
        if RevenueCatConfig.hasRealKey {
            Purchases.configure(withAPIKey: RevenueCatConfig.publicSDKKey)
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
        }
    }
}
