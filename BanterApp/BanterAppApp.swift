import SwiftUI
import RevenueCat
import PostHog

private let posthogProjectToken = "phc_AxzmLNQL2Jz3N7FpAW4MYT2PSbZbgENAGDByTgsfRGr2"
private let posthogHost = "https://us.i.posthog.com"

@main
struct BanterAppApp: App {
    init() {
        let config = PostHogConfig(apiKey: posthogProjectToken, host: posthogHost)
        config.captureApplicationLifecycleEvents = true
        PostHogSDK.shared.setup(config)

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
