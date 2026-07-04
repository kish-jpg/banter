import XCTest
@testable import BanterShared

/// COAC-02: selecting a ReplyStyle on the tone picker must produce an
/// AnalyzeConversationRequest.tone equal to that style - a plain round-trip
/// of the 4 ReplyStyle cases through the picker's request-building helper.
///
/// Wave-0 red state: `TonePicker` does not exist yet (it's built in a later
/// Phase 4 plan). This file intentionally references the not-yet-built
/// production symbol so it fails-red on "cannot find 'TonePicker' in scope",
/// not on an unrelated compile error.
final class TonePickerTests: XCTestCase {
    func testPlayfulSelectionProducesPlayfulTone() {
        let picker = TonePicker(selected: .playful)
        let request = picker.makeRequest(messages: [])
        XCTAssertEqual(request.tone, .playful)
    }

    func testSincereSelectionProducesSincereTone() {
        let picker = TonePicker(selected: .sincere)
        let request = picker.makeRequest(messages: [])
        XCTAssertEqual(request.tone, .sincere)
    }

    func testWittySelectionProducesWittyTone() {
        let picker = TonePicker(selected: .witty)
        let request = picker.makeRequest(messages: [])
        XCTAssertEqual(request.tone, .witty)
    }

    func testDirectSelectionProducesDirectTone() {
        let picker = TonePicker(selected: .direct)
        let request = picker.makeRequest(messages: [])
        XCTAssertEqual(request.tone, .direct)
    }
}
