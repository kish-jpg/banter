import SwiftUI
import BanterShared

/// App root. A fresh install enters the onboarding coordinator (Welcome ->
/// Photos priming -> real import/confirm/coaching demo loop, ONBD-01/02)
/// rather than jumping straight to Import Entry. `--seed-sample-transcript`
/// alone (no onboarding seed arg) still lands directly on the Confirm
/// screen via ImportFlowModel's own seed, preserving the Phase 2
/// ScreenshotArtifactTests CI path unchanged.
struct ContentView: View {
    var body: some View {
        NavigationStack {
            ValueDemoCoordinatorView()
                .navigationBarTitleDisplayMode(.inline)
        }
    }
}
