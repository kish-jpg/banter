import XCTest
@testable import BanterShared

/// Proves the Deno<->Swift shared-fixture contract: this decodes the SAME
/// coaching-response.sample.json byte content that Backend/tests/index.test.ts
/// asserts a live response body matches (kept in sync via
/// Backend/scripts/sync-fixture.sh). If the Deno response shape and this DTO
/// ever drift, this test fails the decode.
final class CoachingContractTests: XCTestCase {
    private func loadFixture() throws -> Data {
        guard let url = Bundle.module.url(forResource: "coaching-response.sample", withExtension: "json") else {
            XCTFail("coaching-response.sample.json not found in test bundle resources")
            throw CocoaError(.fileNoSuchFile)
        }
        return try Data(contentsOf: url)
    }

    func testDecodesSharedFixtureWithNoError() throws {
        let data = try loadFixture()
        XCTAssertNoThrow(try JSONDecoder().decode(CoachingResponseDTO.self, from: data))
    }

    func testDecodedResponseHasExactlyThreeValidReplies() throws {
        let data = try loadFixture()
        let response = try JSONDecoder().decode(CoachingResponseDTO.self, from: data)

        XCTAssertEqual(response.replies.count, 3)
        for reply in response.replies {
            XCTAssertFalse(reply.text.isEmpty)
            XCTAssertFalse(reply.psychologyTag.isEmpty)
            XCTAssertNotNil(ReplyStyle(rawValue: reply.style.rawValue))
        }
    }

    func testDecodedResponseHasSentimentWithScoreAndFourFactors() throws {
        let data = try loadFixture()
        let response = try JSONDecoder().decode(CoachingResponseDTO.self, from: data)

        XCTAssertTrue(response.sentiment.score.isFinite)
        XCTAssertTrue(response.sentiment.factors.interest.isFinite)
        XCTAssertTrue(response.sentiment.factors.reciprocity.isFinite)
        XCTAssertTrue(response.sentiment.factors.warmth.isFinite)
        XCTAssertTrue(response.sentiment.factors.responsiveness.isFinite)
        XCTAssertFalse(response.sentiment.signal.isEmpty)
    }
}
