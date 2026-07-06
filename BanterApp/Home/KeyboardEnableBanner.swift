import SwiftUI
import BanterShared

/// Screen 5.3 (05-UI-SPEC.md, KEYS-04) — Home-surface nudge to enable the
/// Banter keyboard. Same visual family as DowngradeBanner (Screen 4.6):
/// non-modal, tappable, routes to the guided enable flow.
struct KeyboardEnableBanner: View {
    let onTap: () -> Void

    var body: some View {
        Button {
            onTap()
        } label: {
            HStack(alignment: .top, spacing: Banter.Spacing.sm) {
                Image(systemName: "keyboard")
                    .foregroundStyle(Banter.Colors.textSecondary)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: Banter.Spacing.xs) {
                    Text("Enable the Banter keyboard")
                        .font(Banter.TextStyle.label.weight(.bold))
                        .foregroundStyle(Banter.Colors.textPrimary)

                    Text("Insert suggestions in any chat app")
                        .font(Banter.TextStyle.label)
                        .foregroundStyle(Banter.Colors.textSecondary)
                }
            }
            .padding(Banter.Spacing.md)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        }
        .background(Banter.Colors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))
    }
}

/// Tracks whether the user has dismissed the keyboard-enable nudge, so it
/// stops appearing after a one-shot dismissal (mirrors
/// DowngradeBannerStorageKey's shape).
enum KeyboardEnableBannerStorageKey {
    static let dismissed = "keyboardEnableBanner.dismissed"
}

/// Best-effort, fail-open detection of whether the Banter keyboard is
/// already enabled system-wide. Reads the undocumented `AppleKeyboards`
/// UserDefaults array (05-RESEARCH.md Assumption A1) — this key format is
/// not part of any public API contract and may change in a future iOS
/// release. MUST fail open: callers should default to showing the banner
/// whenever this returns false, never treat `false` as a confident "not
/// enabled" signal that gates functionality.
func isKeyboardLikelyEnabled(bundleID: String) -> Bool {
    let keyboards = UserDefaults.standard.array(forKey: "AppleKeyboards") as? [String] ?? []
    return keyboards.contains(bundleID)
}

#Preview {
    KeyboardEnableBanner(onTap: {})
        .padding()
        .background(Banter.Colors.background)
}
