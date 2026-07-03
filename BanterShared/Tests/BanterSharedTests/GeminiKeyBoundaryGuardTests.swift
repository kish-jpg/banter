import XCTest

/// Structural T-03-04 guard: GEMINI_API_KEY (and the Gemini REST endpoint)
/// must never appear in client (iOS) source. The key lives only in the edge
/// function's env (.env.local, gitignored) - it never crosses into
/// BanterShared or BanterApp. Mirrors NetworkBoundaryGuardTests' #filePath
/// navigation + forbidden-token pattern.
final class GeminiKeyBoundaryGuardTests: XCTestCase {
    func testClientSourceContainsNoGeminiKeyOrEndpointTokens() throws {
        // #filePath points at this test file; navigate to the repo root
        // (BanterShared/Tests/BanterSharedTests/ -> Tests/ -> BanterShared/ -> repo root),
        // then scan BanterShared/Sources and BanterApp/.
        let thisFile = URL(fileURLWithPath: #filePath)
        let repoRoot = thisFile
            .deletingLastPathComponent() // GeminiKeyBoundaryGuardTests.swift -> BanterSharedTests/
            .deletingLastPathComponent() // BanterSharedTests/ -> Tests/
            .deletingLastPathComponent() // Tests/ -> BanterShared/
            .deletingLastPathComponent() // BanterShared/ -> repo root

        let scanRoots = [
            repoRoot.appendingPathComponent("BanterShared").appendingPathComponent("Sources"),
            repoRoot.appendingPathComponent("BanterApp"),
        ]

        let forbidden = ["GEMINI_API_KEY", "generativelanguage.googleapis.com"]
        let fileManager = FileManager.default

        var scannedAtLeastOneFile = false

        for root in scanRoots {
            guard let enumerator = fileManager.enumerator(at: root, includingPropertiesForKeys: nil) else {
                continue
            }
            for case let fileURL as URL in enumerator {
                guard fileURL.pathExtension == "swift" else { continue }
                scannedAtLeastOneFile = true
                let source = try String(contentsOf: fileURL, encoding: .utf8)
                for token in forbidden {
                    XCTAssertFalse(
                        source.contains(token),
                        "Forbidden token '\(token)' found in \(fileURL.path) - GEMINI_API_KEY/endpoint must never appear in client source (T-03-04)"
                    )
                }
            }
        }

        XCTAssertTrue(scannedAtLeastOneFile, "GeminiKeyBoundaryGuardTests scanned zero .swift files - scan roots may be wrong")
    }
}
