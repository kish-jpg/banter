import SwiftUI
import BanterShared

/// Screen 4.3's suggestion card: reply text + always-visible psychology tag
/// chip (COAC-04 — never hidden behind any tier) + Copy-to-clipboard action.
/// Tapping the tag chip expands TagExplainerSheet's inline content.
struct SuggestionCardView: View {
    let index: Int
    let reply: ReplySuggestion
    let model: CoachingResultModel

    @State private var showCopiedToast = false

    private var isExpanded: Bool { model.expandedTagIndices.contains(index) }

    var body: some View {
        VStack(alignment: .leading, spacing: Banter.Spacing.sm) {
            HStack(alignment: .top) {
                Text(reply.text)
                    .font(Banter.TextStyle.body)
                    .foregroundStyle(Banter.Colors.textPrimary)
                Spacer()
                copyButton
            }

            tagChip

            if isExpanded {
                TagExplainerSheet(tag: reply.psychologyTag)
            }
        }
        .padding(Banter.Spacing.md)
        .background(Banter.Colors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))
        .overlay(alignment: .bottom) {
            if showCopiedToast {
                copiedToast
            }
        }
    }

    private var tagChip: some View {
        Button {
            withAnimation(reduceMotionAwareAnimation) {
                model.toggleTagExpanded(at: index)
            }
        } label: {
            HStack(spacing: Banter.Spacing.xs) {
                Text(reply.psychologyTag)
                    .font(Banter.TextStyle.label)
                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .font(.caption)
            }
            .foregroundStyle(isExpanded ? Banter.Colors.accent : Banter.Colors.textSecondary)
            .padding(.horizontal, Banter.Spacing.xs)
            .padding(.vertical, Banter.Spacing.xs / 2)
            .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.sm))
        }
        .frame(minHeight: 44)
        .accessibilityLabel("Psychology tag: \(reply.psychologyTag). Double tap to \(isExpanded ? "collapse" : "expand") explanation")
    }

    private var copyButton: some View {
        Button {
            UIPasteboard.general.string = reply.text
            withAnimation(reduceMotionAwareAnimation) {
                showCopiedToast = true
            }
            Task {
                try? await Task.sleep(for: .seconds(2))
                withAnimation(reduceMotionAwareAnimation) {
                    showCopiedToast = false
                }
            }
        } label: {
            Image(systemName: "doc.on.doc")
                .foregroundStyle(Banter.Colors.textSecondary)
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel("Copy reply")
        // Stable hook for OnboardingFlowTests' `app.buttons["Copy"]` query —
        // the label above is user-facing VoiceOver text, this is the test id.
        .accessibilityIdentifier("Copy")
    }

    private var copiedToast: some View {
        Text("Copied")
            .font(Banter.TextStyle.label)
            .padding(.horizontal, Banter.Spacing.md)
            .padding(.vertical, Banter.Spacing.sm)
            .background(Banter.Colors.surface)
            .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.md))
            .padding(.bottom, Banter.Spacing.sm)
    }

    private var reduceMotionAwareAnimation: Animation? {
        UIAccessibility.isReduceMotionEnabled ? nil : .spring(response: 0.3, dampingFraction: 0.85)
    }
}
