import Foundation

/// Single overwrite-on-every-response key for the latest coaching
/// suggestions, written by BanterApp (HomeModel.startCoaching) and read by
/// BanterKeyboard (a separate SPM consumer) — must be `public` on both the
/// enum and the constant, unlike the internal `DowngradeBannerStorageKey`,
/// since it crosses the package boundary (KEYS-01).
public enum CachedSuggestionsStorageKey {
    public static let suggestions = "cached_suggestions"
}
