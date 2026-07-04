import SwiftUI

/// Screen 4.6 (04-UI-SPEC.md). Non-modal, shown once per downgrade event —
/// reassures the user that trial/subscription expiry never loses their
/// on-device conversation history or health timelines (MONE-03).
struct DowngradeBanner: View {
    let onGoPremium: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: Banter.Spacing.sm) {
            Image(systemName: "arrow.uturn.backward.circle")
                .foregroundStyle(Banter.Colors.textSecondary)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: Banter.Spacing.xs) {
                Text("You're back on the free plan")
                    .font(Banter.TextStyle.heading)
                    .foregroundStyle(Banter.Colors.textPrimary)

                Text("Your conversation history and health timelines are safe — analyses are just capped again.")
                    .font(Banter.TextStyle.body)
                    .foregroundStyle(Banter.Colors.textSecondary)

                Button {
                    onGoPremium()
                } label: {
                    Text("Go Premium")
                        .font(Banter.TextStyle.body)
                        .foregroundStyle(Banter.Colors.accent)
                        .frame(minHeight: 44)
                }
            }
        }
        .padding(Banter.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Banter.Colors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))
    }
}

/// Tracks whether the downgrade banner has been shown for the current
/// downgrade event, so it appears once and does not re-show on every
/// subsequent free-tier launch (UI-SPEC Screen 4.6 States).
enum DowngradeBannerStorageKey {
    static let lastSeenDowngrade = "downgradeBanner.lastSeenDowngrade"
}
