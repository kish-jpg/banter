import SwiftUI
import BanterShared

/// Screen 4.3's inline tag explainer (COAC-04). Despite the "Sheet" name
/// (inherited from RESEARCH.md), this is an inline disclosure per UI-SPEC —
/// no `.sheet()` presentation. Looks up the offline bundled taxonomy via
/// TagExplainer, no network call. Degrades gracefully (raw tag, no crash)
/// if the tag has no taxonomy entry.
struct TagExplainerSheet: View {
    let tag: String

    var body: some View {
        if let entry = TagExplainer.entry(forTag: tag) {
            VStack(alignment: .leading, spacing: Banter.Spacing.xs) {
                Text(entry.framework)
                    .font(Banter.TextStyle.label.bold())
                    .foregroundStyle(Banter.Colors.textPrimary)
                Text(entry.explanation)
                    .font(Banter.TextStyle.body)
                    .foregroundStyle(Banter.Colors.textPrimary)
                Text("Source: \(entry.citation)")
                    .font(Banter.TextStyle.label)
                    .foregroundStyle(Banter.Colors.textSecondary)
            }
            .padding(.top, Banter.Spacing.xs)
        } else {
            Text(tag)
                .font(Banter.TextStyle.body)
                .foregroundStyle(Banter.Colors.textSecondary)
                .padding(.top, Banter.Spacing.xs)
        }
    }
}
