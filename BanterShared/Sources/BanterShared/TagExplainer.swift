import Foundation

/// COAC-04: offline lookup from a reply's psychologyTag string to its
/// TaxonomyEntry (framework, explanation, citation). Decodes the bundled
/// taxonomy.json once — no network call, no second LLM call.
public enum TagExplainer {
    private static let entriesByTag: [String: TaxonomyEntry] = {
        guard let url = Bundle.module.url(forResource: "taxonomy", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode(TaxonomyDocument.self, from: data)
        else {
            return [:]
        }
        return Dictionary(uniqueKeysWithValues: decoded.allowed.map { ($0.tagName, $0) })
    }()

    public static func entry(forTag tag: String) -> TaxonomyEntry? {
        entriesByTag[tag]
    }
}

/// Mirrors the bundled taxonomy.json's top-level shape: `{ "allowed": [...] }`.
private struct TaxonomyDocument: Codable {
    let allowed: [TaxonomyEntry]
}
