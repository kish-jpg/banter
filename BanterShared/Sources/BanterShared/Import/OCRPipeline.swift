import Foundation
import Vision

/// Thin wrapper around Vision's Swift-native text recognition (iOS 18+).
/// Returns raw recognized lines only — no sorting, no filtering, no
/// attribution. That logic belongs to BubbleAttributor (plan 02).
public enum OCRPipeline {
    public static func recognize(in cgImage: CGImage) async throws -> [RecognizedLine] {
        var request = RecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let observations = try await request.perform(on: cgImage)
        return observations.compactMap { (observation) -> RecognizedLine? in
            guard let candidate = observation.topCandidates(1).first else { return nil }
            return RecognizedLine(text: candidate.string, boundingBox: observation.boundingBox)
        }
    }
}
