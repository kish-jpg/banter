import XCTest
@testable import BanterShared
#if canImport(UIKit)
import UIKit
#endif

/// Wave-0 canary: proves Vision's RecognizeTextRequest actually recognizes
/// text from a static fixture image inside the CI simulator. If this test
/// fails in CI, the phase's core assumption (Vision-in-simulator works) is
/// disproven and everything downstream should stop, not be built on top of it.
final class OCRPipelineTests: XCTestCase {
    func testRecognizesFixtureText() async throws {
        let url = try XCTUnwrap(
            Bundle.module.url(forResource: "imessage_two_column", withExtension: "png", subdirectory: "Fixtures")
                ?? Bundle.module.url(forResource: "imessage_two_column", withExtension: "png"),
            "Fixture imessage_two_column.png not found in Bundle.module"
        )
        let data = try Data(contentsOf: url)

        #if canImport(UIKit)
        let uiImage = try XCTUnwrap(UIImage(data: data))
        let cgImage = try XCTUnwrap(uiImage.cgImage)
        #else
        let provider = try XCTUnwrap(CGDataProvider(data: data as CFData))
        let cgImage = try XCTUnwrap(
            CGImage(
                pngDataProviderSource: provider,
                decode: nil,
                shouldInterpolate: true,
                intent: .defaultIntent
            )
        )
        #endif

        let lines = try await OCRPipeline.recognize(in: cgImage)

        XCTAssertFalse(lines.isEmpty, "Vision returned no recognized lines from the fixture image")

        let allText = lines.map(\.text).joined(separator: " ").lowercased()
        XCTAssertTrue(allText.contains("hey"), "Expected fixture text 'hey' not recognized. Got: \(allText)")
        XCTAssertTrue(allText.contains("sounds good"), "Expected fixture text 'sounds good' not recognized. Got: \(allText)")

        for line in lines {
            XCTAssertTrue((0...1).contains(line.boundingBox.origin.x), "boundingBox.origin.x out of 0...1: \(line.boundingBox)")
            XCTAssertTrue((0...1).contains(line.boundingBox.origin.y), "boundingBox.origin.y out of 0...1: \(line.boundingBox)")
            XCTAssertTrue((0...1).contains(line.boundingBox.width), "boundingBox.width out of 0...1: \(line.boundingBox)")
            XCTAssertTrue((0...1).contains(line.boundingBox.height), "boundingBox.height out of 0...1: \(line.boundingBox)")
        }
    }
}
