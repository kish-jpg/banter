import SwiftUI
import BanterShared

/// Screen 4.3's 4-segment tone picker (COAC-02). Data source is the
/// existing ReplyStyle enum — not a parallel enum. Active segment: surface
/// pill + accent 2pt bottom border. Inactive: textSecondary, no fill.
struct TonePickerView: View {
    let model: CoachingResultModel

    private let tones: [ReplyStyle] = [.playful, .sincere, .witty, .direct]

    var body: some View {
        HStack(spacing: Banter.Spacing.sm) {
            ForEach(tones, id: \.self) { tone in
                segment(for: tone)
            }
        }
        .padding(.horizontal, Banter.Spacing.md)
    }

    private func segment(for tone: ReplyStyle) -> some View {
        let isSelected = model.selectedTone == tone
        return Button {
            Task { await model.selectTone(tone) }
        } label: {
            Text(tone.rawValue.capitalized)
                .font(Banter.TextStyle.label)
                .foregroundStyle(isSelected ? Banter.Colors.textPrimary : Banter.Colors.textSecondary)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 44)
                .background(isSelected ? Banter.Colors.surface : Color.clear)
                .overlay(alignment: .bottom) {
                    if isSelected {
                        Rectangle()
                            .fill(Banter.Colors.accent)
                            .frame(height: 2)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.sm))
        }
        .accessibilityLabel("Tone: \(tone.rawValue.capitalized), \(isSelected ? "selected" : "not selected")")
    }

    private var reduceMotionAwareAnimation: Animation? {
        UIAccessibility.isReduceMotionEnabled ? nil : .spring(response: 0.3, dampingFraction: 0.8)
    }
}
