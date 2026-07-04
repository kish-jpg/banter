import Foundation

/// Builds an `AnalyzeConversationRequest` for a selected tone (COAC-02).
/// Pure, network-free — `CoachingClient` (BanterApp) uses this to build the
/// request it POSTs; `TonePickerView` binds its selection here.
public struct TonePicker {
    public let selected: ReplyStyle

    public init(selected: ReplyStyle) {
        self.selected = selected
    }

    public func makeRequest(messages: [ConversationMessage]) -> AnalyzeConversationRequest {
        AnalyzeConversationRequest(messages: messages, tone: selected)
    }
}
