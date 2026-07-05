import Foundation

/// A single psychology-framework entry from the allowed taxonomy, mirroring
/// Backend/functions/coaching/taxonomy.ts's TaxonomyEntry interface exactly
/// (field names + order). Bundled offline via BanterApp/Resources/taxonomy.json,
/// kept byte-identical to the backend-authoritative copy by
/// Backend/scripts/sync-taxonomy.sh.
public struct TaxonomyEntry: Codable, Equatable, Sendable {
    public let framework: String
    public let technique: String
    public let tagName: String
    public let explanation: String
    public let citation: String

    public init(framework: String, technique: String, tagName: String, explanation: String, citation: String) {
        self.framework = framework
        self.technique = technique
        self.tagName = tagName
        self.explanation = explanation
        self.citation = citation
    }
}
