import XCTest
@testable import BanterShared

/// Contract proof for CachedSuggestionsStorageKey.suggestions (KEYS-01): an
/// array of ReplySuggestion written under this exact key reads back equal.
/// Mirrors AppGroupRoundTripTests.testReplySuggestionRoundTrips, but on the
/// array shape the keyboard will actually read.
final class CachedSuggestionsRoundTripTests: XCTestCase {
    func testCachedSuggestionsRoundTrip() {
        let suggestions = [ReplySuggestion(text: "hey!", psychologyTag: "reciprocity", style: .playful)]
        AppGroupStore.write(suggestions, forKey: CachedSuggestionsStorageKey.suggestions)
        let read = AppGroupStore.read([ReplySuggestion].self, forKey: CachedSuggestionsStorageKey.suggestions)
        XCTAssertEqual(read, suggestions)
    }
}
