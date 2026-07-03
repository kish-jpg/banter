import SwiftUI

/// Banter's design token namespace. The FIRST design system in this project
/// (per 02-UI-SPEC.md) — reused unchanged by Phase 4. Token names and values
/// must match 02-UI-SPEC.md exactly; do not add tokens not defined there.
enum Banter {
    /// Spacing scale, multiples of 4. See 02-UI-SPEC.md "Spacing Scale".
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
        static let xxxl: CGFloat = 64
    }

    /// Corner radii. See 02-UI-SPEC.md "Screen 1 — Corner radii token".
    enum Radius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
    }

    /// Typography built on Dynamic Type text styles, never fixed point
    /// sizes — required for accessibility scaling (02-UI-SPEC.md
    /// "Typography", "Accessibility Checklist").
    enum `Type` {
        static let display: Font = .largeTitle.weight(.bold)
        static let heading: Font = .title2.weight(.semibold)
        static let body: Font = .body
        static let label: Font = .footnote.weight(.medium)
    }

    /// Color roles, defined as Assets.xcassets color sets with dark
    /// (canonical) + light variants. See 02-UI-SPEC.md "Color". Accent is
    /// reserved for the elements listed there — do not use it elsewhere.
    enum Colors {
        static let background = Color("BackgroundColor", bundle: .main)
        static let surface = Color("SurfaceColor", bundle: .main)
        static let accent = Color("AccentColor", bundle: .main)
        static let destructive = Color("DestructiveColor", bundle: .main)
        static let textPrimary = Color("TextPrimaryColor", bundle: .main)
        static let textSecondary = Color("TextSecondaryColor", bundle: .main)
    }
}
