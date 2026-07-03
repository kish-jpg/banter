import XCTest

/// Structural CAPT-04 guard: reads NetworkDTOs.swift source directly and
/// fails the build if any forbidden binary-payload token appears. This is a
/// cheap tripwire on top of the type-system guarantee (the DTOs simply never
/// declare Data/UIImage/CGImage/[UInt8] members) — not a substitute for it.
final class NetworkBoundaryGuardTests: XCTestCase {
    func testNetworkDTOsContainNoBinaryImagePayloadTokens() throws {
        // #filePath points at this test file; navigate to
        // Sources/BanterShared/NetworkDTOs.swift relative to it.
        let thisFile = URL(fileURLWithPath: #filePath)
        let dtoFileURL = thisFile
            .deletingLastPathComponent() // NetworkBoundaryGuardTests.swift -> BanterSharedTests/
            .deletingLastPathComponent() // BanterSharedTests/ -> Tests/
            .deletingLastPathComponent() // Tests/ -> BanterShared/ (package root)
            .appendingPathComponent("Sources")
            .appendingPathComponent("BanterShared")
            .appendingPathComponent("NetworkDTOs.swift")

        let source = try String(contentsOf: dtoFileURL, encoding: .utf8)

        let forbidden = ["UIImage", ": Data", "[UInt8]", "CGImage"]
        for token in forbidden {
            XCTAssertFalse(
                source.contains(token),
                "Forbidden binary-payload token '\(token)' found in NetworkDTOs.swift — CAPT-04 boundary violated"
            )
        }
    }
}
