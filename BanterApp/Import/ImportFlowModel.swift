import CoreGraphics
import Foundation
import Observation
import BanterShared
import PostHog

/// State machine driving the Import Entry -> Parsing Progress -> Confirm
/// Transcript flow. Both the screenshot path (OCRPipeline + BubbleAttributor)
/// and the paste path (PasteTextParser) converge here, producing the same
/// [ConversationMessage] the Confirm screen renders.
@Observable
final class ImportFlowModel {
    enum ParsingSource {
        case screenshot
        case pasteText
    }

    enum State: Equatable {
        case entry(startInPasteMode: Bool = false)
        case parsing(source: ParsingSource)
        case confirm
        /// Entered ONLY by the user's Confirm tap (`confirm()`), never by
        /// parsing — the CAPT-04 consent signal consumers trigger coaching on.
        case confirmed
        case failure(source: ParsingSource)
    }

    private(set) var state: State = .entry()
    private(set) var transcript: [ConversationMessage] = []

    /// Debug launch argument (plan 05's XCUITest depends on this) —
    /// pre-seeds a static sample transcript straight into .confirm, bypassing
    /// any real OCR/parse work so CI can screenshot the Confirm screen
    /// without driving the system PhotosPicker.
    static let seedSampleTranscriptArgument = "--seed-sample-transcript"

    init(arguments: [String] = CommandLine.arguments) {
        #if DEBUG
        if arguments.contains(Self.seedSampleTranscriptArgument) {
            transcript = Self.sampleTranscript
            state = .confirm
        }
        #endif
    }

    // MARK: - Screenshot path

    @MainActor
    func importScreenshot(_ cgImage: CGImage) async {
        state = .parsing(source: .screenshot)
        do {
            let lines = try await OCRPipeline.recognize(in: cgImage)
            let messages = BubbleAttributor.attribute(lines)
            guard !messages.isEmpty else {
                PostHogSDK.shared.capture("import_failed", properties: ["source": "screenshot"])
                state = .failure(source: .screenshot)
                return
            }
            transcript = messages
            state = .confirm
        } catch {
            PostHogSDK.shared.capture("import_failed", properties: ["source": "screenshot"])
            state = .failure(source: .screenshot)
        }
    }

    // MARK: - Paste path

    @MainActor
    func parsePastedText(_ raw: String) async {
        state = .parsing(source: .pasteText)
        let messages = PasteTextParser.parse(raw)
        guard !messages.isEmpty else {
            PostHogSDK.shared.capture("import_failed", properties: ["source": "paste_text"])
            state = .failure(source: .pasteText)
            return
        }
        transcript = messages
        state = .confirm
    }

    // MARK: - Confirm screen mutations (CAPT-02 core)

    func flipSpeaker(at index: Int) {
        guard transcript.indices.contains(index) else { return }
        let current = transcript[index]
        let flipped: Speaker = current.speaker == .user ? .match : .user
        transcript[index] = ConversationMessage(speaker: flipped, text: current.text, order: current.order)
    }

    func editText(at index: Int, to newText: String) {
        guard transcript.indices.contains(index) else { return }
        let trimmed = newText.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            transcript.remove(at: index)
        } else {
            let current = transcript[index]
            transcript[index] = ConversationMessage(speaker: current.speaker, text: trimmed, order: current.order)
        }
    }

    func startOver() {
        transcript = []
        state = .entry()
    }

    func confirm() {
        // CAPT-04 gate: this is the tap that makes the transcript eligible
        // to leave the device — the parse landing in .confirm is NOT
        // consent. No network call here; downstream observes the
        // .confirm -> .confirmed transition and starts coaching from it.
        guard !transcript.isEmpty else { return }
        PostHogSDK.shared.capture("conversation_confirmed", properties: [
            "message_count": transcript.count
        ])
        state = .confirmed
    }

    func retryFromFailure() {
        state = .entry()
    }

    func pasteInsteadFromFailure() {
        state = .entry(startInPasteMode: true)
    }

    // MARK: - Fixtures

    private static let sampleTranscript: [ConversationMessage] = [
        ConversationMessage(speaker: .match, text: "hey, how's your week going?", order: 0),
        ConversationMessage(speaker: .user, text: "Chaotic in the best way — yours?", order: 1),
        ConversationMessage(speaker: .match, text: "Same honestly, work's been a lot", order: 2),
    ]
}
