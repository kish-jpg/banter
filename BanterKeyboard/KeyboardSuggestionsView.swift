import SwiftUI
import BanterShared

/// Screen 5.1 (05-UI-SPEC.md). The keyboard extension's entire visible UI —
/// up to 3 tappable cached suggestion rows plus the mandatory globe/
/// next-keyboard key. Trivial view tree (no List/ScrollView) to respect the
/// ~48MB keyboard-extension memory ceiling (05-RESEARCH.md Pitfall 2).
///
/// `isDark` is supplied by `KeyboardViewController`, which resolves it from
/// `textDocumentProxy.keyboardAppearance` ahead of ambient trait collection
/// (05-UI-SPEC.md Appearance Strategy) — this view never reads
/// `@Environment(\.colorScheme)` itself. `Banter.Colors.*` are asset-catalog
/// colors that already carry their own light/dark variants, so `isDark` is
/// accepted here as the contract this phase requires, not used to branch
/// between hardcoded hex (ponytail: no new color literals needed since the
/// asset catalog already resolves per-appearance; keep the parameter for the
/// day a keyboard-specific override is needed).
struct KeyboardSuggestionsView: View {
    let suggestions: [ReplySuggestion]
    let onInsert: (String) -> Void
    var needsInputModeSwitchKey: Bool
    let onSwitchKeyboard: () -> Void
    let isDark: Bool

    var body: some View {
        VStack(spacing: Banter.Spacing.xs) {
            if suggestions.isEmpty {
                Text("Open Banter to analyze a conversation")
                    .font(Banter.TextStyle.label)
                    .foregroundStyle(Banter.Colors.textSecondary)
                    .padding()
            } else {
                // id: \.offset, not \.text — suggestion texts are
                // LLM-generated and unvalidated; duplicates would collide as
                // ForEach identities (same pattern as HomeView's reply list).
                ForEach(Array(suggestions.prefix(3).enumerated()), id: \.offset) { _, suggestion in
                    Button {
                        onInsert(suggestion.text)
                    } label: {
                        Text(suggestion.text)
                            .font(Banter.TextStyle.label)
                            .lineLimit(2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(Banter.Spacing.sm)
                    }
                    .background(Banter.Colors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.sm))
                }
            }

            if needsInputModeSwitchKey {
                Button(action: onSwitchKeyboard) {
                    Image(systemName: "globe")
                        .foregroundStyle(Banter.Colors.textSecondary) // never accent — 05-UI-SPEC.md Color
                        .frame(width: 44, height: 44)
                }
            }
        }
    }
}

#Preview("3 suggestions") {
    KeyboardSuggestionsView(
        suggestions: [
            ReplySuggestion(text: "Haha okay you got me there \u{1F602}", psychologyTag: "Playful tease \u{2192} push-pull dynamic", style: .playful),
            ReplySuggestion(text: "What's the story behind that photo?", psychologyTag: "Curiosity hook \u{2192} self-disclosure", style: .sincere),
            ReplySuggestion(text: "Bold claim. Prove it.", psychologyTag: "Reciprocity \u{2192} banter volley", style: .witty)
        ],
        onInsert: { _ in },
        needsInputModeSwitchKey: true,
        onSwitchKeyboard: {},
        isDark: true
    )
    .padding()
}

#Preview("Empty state") {
    KeyboardSuggestionsView(
        suggestions: [],
        onInsert: { _ in },
        needsInputModeSwitchKey: true,
        onSwitchKeyboard: {},
        isDark: true
    )
    .padding()
}
