import SwiftUI
import BanterShared

/// One-screen skeleton: writes one hardcoded sample of each BanterShared
/// model type into the App Group, proving the write side of the
/// app <-> keyboard round-trip. No onboarding, no real UI — Phase 1 slice.
struct ContentView: View {
    @State private var didWrite = false

    var body: some View {
        VStack(spacing: 16) {
            Text("Banter")
                .font(.title)
            Button("Write sample to App Group") {
                writeSamples()
            }
            if didWrite {
                Text("Wrote sample data to App Group")
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }

    private func writeSamples() {
        let message = ConversationMessage(speaker: .match, text: "hey, how's your week going?", order: 0)
        let suggestion = ReplySuggestion(
            text: "Chaotic in the best way — yours?",
            psychologyTag: "Playful tease → push-pull dynamic",
            style: .playful
        )
        let event = SentimentEvent(
            conversationId: UUID(),
            messageIndex: 0,
            speaker: .match,
            scoreDelta: 0.2,
            signal: "opener_warmth",
            timestamp: Date()
        )

        AppGroupStore.write(message, forKey: "sample_message")
        AppGroupStore.write(suggestion, forKey: "sample_suggestion")
        AppGroupStore.write(event, forKey: "sample_event")

        didWrite = true
    }
}
