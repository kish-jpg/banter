import XCTest
@testable import BanterShared

/// COAC-04: a lookup helper must return the correct TaxonomyEntry (framework,
/// explanation, citation) for a given psychologyTag string matching
/// TaxonomyEntry.tagName, loaded from the bundled taxonomy.json - and nil
/// for an unknown tag.
///
/// Wave-0 red state: `TagExplainer` does not exist yet (built in a later
/// Phase 4 plan). References the not-yet-built production symbol so this
/// fails-red on "cannot find 'TagExplainer' in scope".
final class TagExplainerTests: XCTestCase {
    func testKnownTagReturnsMatchingEntry() throws {
        let entry = try XCTUnwrap(TagExplainer.entry(forTag: "Turning toward a bid"))
        XCTAssertEqual(entry.tagName, "Turning toward a bid")
        XCTAssertEqual(entry.framework, "Gottman Method")
        XCTAssertFalse(entry.explanation.isEmpty)
        XCTAssertFalse(entry.citation.isEmpty)
    }

    func testUnknownTagReturnsNil() {
        XCTAssertNil(TagExplainer.entry(forTag: "Not a real psychology tag"))
    }
}
