import SwiftUI

/// Screen 2 — OCR Parsing Progress (02-UI-SPEC.md). Same layout for both
/// entry paths (screenshot OCR / paste-text splitting); heading is
/// path-aware, everything else identical. Also renders the OCR-failure
/// state (indeterminate spinner never blocks reaching this screen — see
/// Pitfall 3, RESEARCH.md).
struct ParsingProgressView: View {
    let source: ImportFlowModel.ParsingSource
    let isFailure: Bool
    let onTryAgain: () -> Void
    let onPasteInstead: () -> Void

    var body: some View {
        VStack(spacing: Banter.Spacing.md) {
            Spacer()
            if isFailure {
                failureContent
            } else {
                progressContent
            }
            Spacer()
        }
        .padding(.horizontal, Banter.Spacing.md)
        .background(Banter.Colors.background)
    }

    private var progressContent: some View {
        VStack(spacing: Banter.Spacing.md) {
            ProgressView()
                .progressViewStyle(.circular)
                .tint(Banter.Colors.accent)
                .scaleEffect(2.0)
                .frame(width: 48, height: 48)

            Text(heading)
                .font(Banter.Type.heading)

            Text("This stays on your device.")
                .font(Banter.Type.label)
                .foregroundStyle(Banter.Colors.textSecondary)
                .padding(.top, Banter.Spacing.sm)
        }
    }

    private var failureContent: some View {
        VStack(spacing: Banter.Spacing.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(Banter.Colors.destructive)
                .accessibilityHidden(true)

            Text("Couldn't read that screenshot")
                .font(Banter.Type.heading)

            Text("Make sure the chat text is clearly visible and try again, or paste the conversation as text.")
                .font(Banter.Type.body)
                .foregroundStyle(Banter.Colors.textSecondary)
                .multilineTextAlignment(.center)

            Button {
                onTryAgain()
            } label: {
                Text("Try Again")
                    .font(Banter.Type.body)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            .tint(Banter.Colors.accent)
            .padding(.top, Banter.Spacing.md)

            Button {
                onPasteInstead()
            } label: {
                Text("Paste Text Instead")
                    .font(Banter.Type.body)
                    .foregroundStyle(Banter.Colors.accent)
                    .frame(minHeight: 44)
            }
        }
    }

    private var heading: String {
        switch source {
        case .screenshot: return "Reading your screenshot…"
        case .pasteText: return "Splitting your conversation…"
        }
    }
}
