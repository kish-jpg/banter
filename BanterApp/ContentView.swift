import SwiftUI
import BanterShared

/// Drives the Import Entry -> Parsing Progress -> Confirm Transcript flow
/// via ImportFlowModel. Replaces the Phase-1 sample-writer skeleton — this
/// is the real entry point for CAPT-01/02/03.
struct ContentView: View {
    @State private var model = ImportFlowModel()

    var body: some View {
        NavigationStack {
            Group {
                switch model.state {
                case .entry:
                    ImportEntryView(model: model)
                case .parsing(let source):
                    ParsingProgressView(
                        source: source,
                        isFailure: false,
                        onTryAgain: { model.retryFromFailure() },
                        onPasteInstead: { model.retryFromFailure() }
                    )
                case .failure(let source):
                    ParsingProgressView(
                        source: source,
                        isFailure: true,
                        onTryAgain: { model.retryFromFailure() },
                        onPasteInstead: { model.retryFromFailure() }
                    )
                case .confirm:
                    ConfirmTranscriptView(model: model)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
