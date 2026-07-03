import Foundation

/// Reads and writes Codable values into the shared App Group container.
///
/// `suiteName` is the ONLY place this string literal is declared — both the
/// app and keyboard targets (wired in a later plan) reference
/// `AppGroupStore.suiteName`, never a duplicated literal, to prevent silent
/// container-mismatch drift between the two targets.
public enum AppGroupStore {
    public static let suiteName = "group.com.banter.shared"

    public static func write<T: Codable>(_ value: T, forKey key: String) {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            assertionFailure("AppGroupStore: UserDefaults(suiteName: \(suiteName)) returned nil — check App Group entitlement")
            return
        }
        guard let data = try? JSONEncoder().encode(value) else {
            assertionFailure("AppGroupStore: failed to encode \(T.self)")
            return
        }
        defaults.set(data, forKey: key)
    }

    public static func read<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            assertionFailure("AppGroupStore: UserDefaults(suiteName: \(suiteName)) returned nil — check App Group entitlement")
            return nil
        }
        guard let data = defaults.data(forKey: key) else { return nil }
        guard let value = try? JSONDecoder().decode(type, from: data) else {
            assertionFailure("AppGroupStore: failed to decode \(T.self)")
            return nil
        }
        return value
    }
}
