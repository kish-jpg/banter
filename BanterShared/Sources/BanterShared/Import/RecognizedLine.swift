import Foundation

/// A single line of text recognized by Vision from a screenshot image, with
/// its bounding box in Vision's normalized coordinate space (origin
/// bottom-left, values 0...1). Ordering and left/right speaker attribution
/// are BubbleAttributor's job (plan 02), not this type's.
public struct RecognizedLine: Equatable {
    public let text: String
    public let boundingBox: CGRect

    public init(text: String, boundingBox: CGRect) {
        self.text = text
        self.boundingBox = boundingBox
    }
}
