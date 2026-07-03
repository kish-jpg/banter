import SwiftUI
import BanterShared
import UIKit

/// Screen 3 — Transcript Confirmation (02-UI-SPEC.md). CAPT-02's core screen:
/// flip attribution, edit text inline, then confirm. Confirm & Continue is
/// the CAPT-04 gate — tapping it sets no network call, only local state.
struct ConfirmTranscriptView: View {
    let model: ImportFlowModel

    @State private var editingIndex: Int?
    @State private var editingText: String = ""
    @State private var showClearedToast = false

    var body: some View {
        VStack(spacing: 0) {
            header

            if model.transcript.isEmpty {
                emptyState
            } else {
                messageList
            }
        }
        .background(Banter.Colors.background.ignoresSafeArea())
        .safeAreaInset(edge: .bottom, spacing: 0) {
            bottomBar
        }
        .overlay(alignment: .bottom) {
            if showClearedToast {
                clearedToast
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Banter.Spacing.xs) {
            Text("Confirm your conversation")
                .font(Banter.TextStyle.heading)
            Text("Tap a name to fix who said what. Tap any message to edit it.")
                .font(Banter.TextStyle.label)
                .foregroundStyle(Banter.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Banter.Spacing.md)
    }

    private var messageList: some View {
        List {
            ForEach(Array(model.transcript.enumerated()), id: \.element.order) { index, message in
                messageRow(index: index, message: message)
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
            }
        }
        .listStyle(.plain)
        .environment(\.defaultMinListRowHeight, 44)
    }

    private func messageRow(index: Int, message: ConversationMessage) -> some View {
        let isUser = message.speaker == .user
        return HStack(alignment: .top, spacing: Banter.Spacing.sm) {
            if isUser { Spacer(minLength: Banter.Spacing.xl) }

            VStack(alignment: isUser ? .trailing : .leading, spacing: Banter.Spacing.xs) {
                attributionChip(index: index, message: message)
                messageBubble(index: index, message: message)
            }
            .frame(maxWidth: .infinity, alignment: isUser ? .trailing : .leading)

            if !isUser { Spacer(minLength: Banter.Spacing.xl) }
        }
        .frame(minHeight: 44)
    }

    private func attributionChip(index: Int, message: ConversationMessage) -> some View {
        let label = message.speaker == .user ? "You" : "Match"
        return Button {
            withAnimation(reduceMotionAwareAnimation) {
                model.flipSpeaker(at: index)
            }
        } label: {
            Text(label)
                .font(Banter.TextStyle.label)
                .padding(.horizontal, Banter.Spacing.xs)
                .padding(.vertical, Banter.Spacing.xs / 2)
                .background(Banter.Colors.accent.opacity(0.15))
                .foregroundStyle(Banter.Colors.accent)
                .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.sm))
        }
        .frame(minHeight: 44)
        .accessibilityLabel("Speaker: \(label)")
        .accessibilityHint("Double tap to switch speaker")
    }

    @ViewBuilder
    private func messageBubble(index: Int, message: ConversationMessage) -> some View {
        let label = message.speaker == .user ? "You" : "Match"
        if editingIndex == index {
            TextEditor(text: $editingText)
                .font(Banter.TextStyle.body)
                .foregroundStyle(Banter.Colors.textPrimary)
                .padding(Banter.Spacing.sm)
                .frame(minHeight: 44)
                .background(Banter.Colors.surface)
                .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))
                .overlay(alignment: .topTrailing) {
                    Button {
                        commitEdit(index: index)
                    } label: {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(Banter.Colors.accent)
                    }
                    .padding(Banter.Spacing.xs)
                }
                .onSubmit { commitEdit(index: index) }
        } else {
            Text(message.text)
                .font(Banter.TextStyle.body)
                .foregroundStyle(Banter.Colors.textPrimary)
                .padding(Banter.Spacing.sm)
                .frame(minHeight: 44)
                .background(Banter.Colors.surface)
                .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))
                .accessibilityLabel("\(label): \(message.text)")
                .onTapGesture {
                    editingText = message.text
                    editingIndex = index
                }
        }
    }

    private func commitEdit(index: Int) {
        model.editText(at: index, to: editingText)
        editingIndex = nil
        editingText = ""
    }

    private var emptyState: some View {
        VStack(spacing: Banter.Spacing.md) {
            Spacer()
            Text("Couldn't find any messages")
                .font(Banter.TextStyle.heading)
            Text("Try a clearer screenshot of the full conversation, or paste the text instead.")
                .font(Banter.TextStyle.body)
                .foregroundStyle(Banter.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Banter.Spacing.md)
            Button {
                model.startOver()
            } label: {
                Text("Try Another Screenshot")
                    .font(Banter.TextStyle.body)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            .tint(Banter.Colors.accent)
            .padding(.horizontal, Banter.Spacing.md)
            Spacer()
        }
    }

    private var bottomBar: some View {
        VStack(spacing: 0) {
            Divider()
            HStack {
                Button {
                    model.startOver()
                    showClearedToast = true
                    Task {
                        try? await Task.sleep(for: .seconds(3))
                        showClearedToast = false
                    }
                } label: {
                    Text("Start Over")
                        .font(Banter.TextStyle.body)
                        .foregroundStyle(Banter.Colors.destructive)
                        .frame(minHeight: 44)
                }

                Spacer()

                Button {
                    model.confirm()
                } label: {
                    Text("Confirm & Continue")
                        .font(Banter.TextStyle.body)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 44)
                }
                .buttonStyle(.borderedProminent)
                .tint(Banter.Colors.accent)
                .disabled(model.transcript.isEmpty)
                .opacity(model.transcript.isEmpty ? 0.5 : 1.0)
            }
            .padding(Banter.Spacing.md)
        }
        .background(Banter.Colors.background)
    }

    private var clearedToast: some View {
        Text("Cleared. Undo")
            .font(Banter.TextStyle.label)
            .padding(.horizontal, Banter.Spacing.md)
            .padding(.vertical, Banter.Spacing.sm)
            .background(Banter.Colors.surface)
            .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.md))
            .padding(.bottom, Banter.Spacing.sm)
    }

    private var reduceMotionAwareAnimation: Animation? {
        UIAccessibility.isReduceMotionEnabled ? nil : .spring(response: 0.3, dampingFraction: 0.8)
    }
}
