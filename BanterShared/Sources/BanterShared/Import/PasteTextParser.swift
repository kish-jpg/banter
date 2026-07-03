import Foundation

/// Parses raw pasted chat text into the same ordered [ConversationMessage]
/// transcript the screenshot/OCR path produces (BubbleAttributor). This is
/// the phase's V5 input-validation surface: pasted text is untrusted user
/// input and must never crash the parser, however malformed or adversarial.
public enum PasteTextParser {
    /// Anchored, length-bounded, no nested quantifiers — ReDoS-safe per
    /// RESEARCH.md's Security Domain section. Do not broaden this pattern.
    private static let namePrefixPattern = #"^([\w\s]{1,20}):\s*(.+)$"#

    public static func parse(_ raw: String) -> [ConversationMessage] {
        let lines = raw
            .split(separator: "\n", omittingEmptySubsequences: true)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        var result: [ConversationMessage] = []
        var seenNames: [String] = []

        for (index, line) in lines.enumerated() {
            if let (name, text) = matchNamePrefix(line) {
                if !seenNames.contains(name) { seenNames.append(name) }
                let speaker: Speaker = seenNames.first == name ? .match : .user
                result.append(ConversationMessage(speaker: speaker, text: text, order: result.count))
            } else {
                // No prefix pattern — naive alternation by line index, never
                // crashes, confirm screen fixes any wrong guesses.
                let speaker: Speaker = index % 2 == 0 ? .match : .user
                result.append(ConversationMessage(speaker: speaker, text: line, order: result.count))
            }
        }
        return result
    }

    /// Matches "Name: message" and splits on the first colon. Returns nil
    /// (never force-unwraps) if the line doesn't match or splits oddly.
    private static func matchNamePrefix(_ line: String) -> (name: String, text: String)? {
        guard line.range(of: namePrefixPattern, options: .regularExpression) != nil else { return nil }
        let parts = line.split(separator: ":", maxSplits: 1).map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        guard parts.count == 2, !parts[0].isEmpty, !parts[1].isEmpty else { return nil }
        return (parts[0], parts[1])
    }
}
