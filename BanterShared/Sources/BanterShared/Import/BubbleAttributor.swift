import Foundation

/// Turns raw OCR lines (plan 01's RecognizedLine) into an ordered,
/// speaker-attributed transcript. Two hard pitfalls live here:
/// - Vision's boundingBox origin is bottom-left, so reading order requires
///   a descending sort by y, not ascending.
/// - Noise lines (timestamps, delivery receipts) must never be forced into
///   the transcript as fake messages.
public enum BubbleAttributor {
    /// x-position threshold (normalized 0...1, leading edge) below which a
    /// line is attributed to the match (left column), else the user (right
    /// column).
    ///
    /// ponytail: 0.4 is a reasonable default for a roughly-centered two-column
    /// layout, not tuned against real screenshots yet. Upgrade path: replace
    /// with a per-import calibrated threshold once real Tinder/Hinge/Bumble
    /// screenshots are collected during execution and a wrong-attribution
    /// rate is measurable.
    public static let userSideXThreshold: CGFloat = 0.4

    public static func attribute(_ lines: [RecognizedLine]) -> [ConversationMessage] {
        // Defensive: a NaN origin would make the sort comparator an invalid
        // strict-weak-ordering (undefined behavior for sorted(by:)). Vision's
        // contract guarantees finite 0...1 values, but drop anything that
        // isn't rather than trust it blindly.
        let finiteLines = lines.filter { $0.boundingBox.origin.y.isFinite && $0.boundingBox.origin.x.isFinite }

        // Pitfall 2: Vision's boundingBox origin is bottom-left, so the
        // topmost line has the largest y. Sort descending for top-to-bottom
        // reading order.
        let sorted = finiteLines.sorted { $0.boundingBox.origin.y > $1.boundingBox.origin.y }
        let content = sorted.filter { !isNoise($0) }

        var order = 0
        return content.map { line in
            let speaker: Speaker = line.boundingBox.origin.x < userSideXThreshold ? .match : .user
            defer { order += 1 }
            return ConversationMessage(speaker: speaker, text: line.text, order: order)
        }
    }

    /// Anchored, bounded regex only (no nested quantifiers) per the ReDoS
    /// mitigation in RESEARCH.md's Security Domain section.
    private static let timeOfDayPattern = #"^\d{1,2}:\d{2}\s?(AM|PM)?$"#
    private static let deliveryStatusWords: Set<String> = ["delivered", "read", "today", "yesterday"]

    // ponytail: case-folded exact-match against a fixed word list is a known,
    // accepted false-negative risk — a real one-word message that is exactly
    // "Read"/"Today"/etc. is silently dropped with no recovery path (the user
    // never sees it to correct it in Confirm). Upgrade path: only treat these
    // as noise when position/reading-order context (e.g. no bubble alignment
    // change) also indicates a status line, once real screenshots surface
    // this as an actual false-negative rate worth the complexity.
    private static func isNoise(_ line: RecognizedLine) -> Bool {
        let trimmed = line.text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return true }
        if deliveryStatusWords.contains(trimmed.lowercased()) { return true }
        if trimmed.range(of: timeOfDayPattern, options: .regularExpression) != nil { return true }
        return false
    }
}
