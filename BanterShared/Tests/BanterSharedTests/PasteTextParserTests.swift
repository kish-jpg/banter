import XCTest
@testable import BanterShared

final class PasteTextParserTests: XCTestCase {
    func testNamePrefixAttributesFirstNameToMatchAndSecondToUser() {
        let raw = """
        Alex: hey how's it going
        Sam: pretty good, you?
        Alex: can't complain
        """

        let result = PasteTextParser.parse(raw)

        XCTAssertEqual(result.map(\.speaker), [.match, .user, .match])
        XCTAssertEqual(result.map(\.text), ["hey how's it going", "pretty good, you?", "can't complain"])
        XCTAssertEqual(result.map(\.order), [0, 1, 2])
    }

    func testUnpatternedLinesAlternateAndNeverCrash() {
        let raw = """
        hey there
        pretty good
        nice
        """

        let result = PasteTextParser.parse(raw)

        XCTAssertEqual(result.count, 3)
        XCTAssertEqual(result.map(\.speaker), [.match, .user, .match])
        XCTAssertEqual(result.map(\.order), [0, 1, 2])
    }

    func testEmptyStringReturnsEmptyArray() {
        XCTAssertEqual(PasteTextParser.parse(""), [])
    }

    func testWhitespaceOnlyLinesAreSkipped() {
        let raw = "hey there\n   \n\nnice one"

        let result = PasteTextParser.parse(raw)

        XCTAssertEqual(result.map(\.text), ["hey there", "nice one"])
        XCTAssertEqual(result.map(\.order), [0, 1])
    }

    func testAdversarialLongSingleLineNoNewlinesDoesNotCrash() {
        let raw = String(repeating: "a", count: 20_000)

        let result = PasteTextParser.parse(raw)

        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result.first?.text, raw)
    }

    func testAdversarialColonsOnlyLineDoesNotCrash() {
        let raw = String(repeating: ":", count: 5000)

        let result = PasteTextParser.parse(raw)

        // No valid "Name: message" match (empty name/text parts) — falls
        // back to alternation, still produces one editable message.
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result.first?.speaker, .match)
    }

    /// WR-03 regression: Windows-style \r\n line endings (common when
    /// pasting from Notes/Mail/Android/Windows sources) must not leak a
    /// trailing \r into parsed names or message text.
    func testWindowsLineEndingsDoNotLeakCarriageReturn() {
        let raw = "Alex: hey how's it going\r\nSam: pretty good, you?\r\n"

        let result = PasteTextParser.parse(raw)

        for message in result {
            XCTAssertFalse(message.text.contains("\r"))
        }
        XCTAssertEqual(result.map(\.text), ["hey how's it going", "pretty good, you?"])
        XCTAssertEqual(result.map(\.speaker), [.match, .user])
    }
}
