import XCTest
@testable import BanterShared

final class BubbleAttributorTests: XCTestCase {
    /// Pitfall 2 guard: Vision's boundingBox origin is bottom-left, so lines
    /// with a HIGHER y value are physically higher on screen (read first).
    /// Feed shuffled/out-of-order input and assert top-to-bottom output order.
    func testReadingOrderTopToBottomFromBottomLeftOrigin() {
        let bottom = RecognizedLine(text: "bottom line", boundingBox: CGRect(x: 0.1, y: 0.1, width: 0.3, height: 0.05))
        let middle = RecognizedLine(text: "middle line", boundingBox: CGRect(x: 0.1, y: 0.5, width: 0.3, height: 0.05))
        let top = RecognizedLine(text: "top line", boundingBox: CGRect(x: 0.1, y: 0.9, width: 0.3, height: 0.05))

        // Deliberately shuffled input.
        let result = BubbleAttributor.attribute([bottom, top, middle])

        XCTAssertEqual(result.map(\.text), ["top line", "middle line", "bottom line"])
        XCTAssertEqual(result.map(\.order), [0, 1, 2])
    }

    func testAttributionByXThreshold() {
        let left = RecognizedLine(text: "left message", boundingBox: CGRect(x: 0.1, y: 0.5, width: 0.3, height: 0.05))
        let right = RecognizedLine(text: "right message", boundingBox: CGRect(x: 0.6, y: 0.4, width: 0.3, height: 0.05))
        let atThreshold = RecognizedLine(text: "at threshold", boundingBox: CGRect(x: 0.4, y: 0.3, width: 0.3, height: 0.05))

        let result = BubbleAttributor.attribute([left, right, atThreshold])

        let bySpeaker = Dictionary(uniqueKeysWithValues: result.map { ($0.text, $0.speaker) })
        XCTAssertEqual(bySpeaker["left message"], .match)
        XCTAssertEqual(bySpeaker["right message"], .user)
        // x == 0.4 is not < threshold, so it attributes to .user.
        XCTAssertEqual(bySpeaker["at threshold"], .user)
    }

    func testNoiseLinesAreDropped() {
        let real = RecognizedLine(text: "hey there", boundingBox: CGRect(x: 0.1, y: 0.8, width: 0.3, height: 0.05))
        let timestamp = RecognizedLine(text: "2:14 PM", boundingBox: CGRect(x: 0.4, y: 0.6, width: 0.2, height: 0.05))
        let delivered = RecognizedLine(text: "Delivered", boundingBox: CGRect(x: 0.4, y: 0.4, width: 0.2, height: 0.05))
        let empty = RecognizedLine(text: "   ", boundingBox: CGRect(x: 0.4, y: 0.3, width: 0.2, height: 0.05))
        let reply = RecognizedLine(text: "sounds good", boundingBox: CGRect(x: 0.6, y: 0.1, width: 0.3, height: 0.05))

        let result = BubbleAttributor.attribute([real, timestamp, delivered, empty, reply])

        XCTAssertEqual(result.map(\.text), ["hey there", "sounds good"])
    }

    /// WR-04 regression: noise-word match must be case-insensitive so a
    /// differently-cased status label (theme/font variance) is still
    /// filtered instead of leaking into the transcript as a fake message.
    func testNoiseWordMatchIsCaseInsensitive() {
        let real = RecognizedLine(text: "hey there", boundingBox: CGRect(x: 0.1, y: 0.8, width: 0.3, height: 0.05))
        let lowercaseRead = RecognizedLine(text: "read", boundingBox: CGRect(x: 0.4, y: 0.6, width: 0.2, height: 0.05))
        let uppercaseToday = RecognizedLine(text: "TODAY", boundingBox: CGRect(x: 0.4, y: 0.4, width: 0.2, height: 0.05))
        let reply = RecognizedLine(text: "sounds good", boundingBox: CGRect(x: 0.6, y: 0.1, width: 0.3, height: 0.05))

        let result = BubbleAttributor.attribute([real, lowercaseRead, uppercaseToday, reply])

        XCTAssertEqual(result.map(\.text), ["hey there", "sounds good"])
    }

    /// IN-01 regression: non-finite bounding-box origins must not reach the
    /// sort comparator (undefined behavior for sorted(by:) otherwise) — they
    /// are dropped rather than crashing or corrupting output order.
    func testNonFiniteBoundingBoxIsFilteredOut() {
        let real = RecognizedLine(text: "hey there", boundingBox: CGRect(x: 0.1, y: 0.8, width: 0.3, height: 0.05))
        let nanLine = RecognizedLine(text: "corrupt", boundingBox: CGRect(x: 0.1, y: .nan, width: 0.3, height: 0.05))
        let reply = RecognizedLine(text: "sounds good", boundingBox: CGRect(x: 0.6, y: 0.1, width: 0.3, height: 0.05))

        let result = BubbleAttributor.attribute([real, nanLine, reply])

        XCTAssertEqual(result.map(\.text), ["hey there", "sounds good"])
    }
}
