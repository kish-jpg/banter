import XCTest

/// Structural KEYS-03 guard: enumerates every .swift file under
/// BanterKeyboard/ and fails the build if any network-capable or RevenueCat
/// token appears anywhere in the target's sources. This is the durable gate
/// enforcing the keyboard's no-network boundary — not merely intended, but
/// tripwired.
final class KeyboardNetworkBoundaryGuardTests: XCTestCase {
    func testBanterKeyboardSourcesContainNoNetworkOrRevenueCatTokens() throws {
        // #filePath points at this test file; navigate to BanterKeyboard/
        // relative to it.
        let thisFile = URL(fileURLWithPath: #filePath)
        let keyboardDirURL = thisFile
            .deletingLastPathComponent() // KeyboardNetworkBoundaryGuardTests.swift -> BanterSharedTests/
            .deletingLastPathComponent() // BanterSharedTests/ -> Tests/
            .deletingLastPathComponent() // Tests/ -> BanterShared/ (package root)
            .deletingLastPathComponent() // BanterShared/ -> repo root
            .appendingPathComponent("BanterKeyboard")

        let enumerator = FileManager.default.enumerator(at: keyboardDirURL, includingPropertiesForKeys: nil)
        let forbidden = ["URLSession", "import RevenueCat", "import Network"]

        var scanned = 0
        while let fileURL = enumerator?.nextObject() as? URL {
            guard fileURL.pathExtension == "swift" else { continue }
            scanned += 1
            let source = try String(contentsOf: fileURL, encoding: .utf8)
            for token in forbidden {
                XCTAssertFalse(
                    source.contains(token),
                    "Forbidden token '\(token)' found in \(fileURL.lastPathComponent) — KEYS-03 boundary violated"
                )
            }
        }

        // Anti-vacuity floor: if the path derivation breaks (directory
        // renamed, checkout layout differs), the enumerator yields nothing
        // and this guard would silently pass having scanned zero files.
        XCTAssertGreaterThanOrEqual(
            scanned, 2,
            "Expected to scan BanterKeyboard sources at \(keyboardDirURL.path) — path derivation broke, guard is vacuous"
        )
    }
}
