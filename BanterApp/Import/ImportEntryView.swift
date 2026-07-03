import PhotosUI
import SwiftUI
import UIKit

/// Screen 1 — Import Entry (02-UI-SPEC.md). Screenshot path via PhotosPicker,
/// paste-text fallback revealed inline on the same screen.
struct ImportEntryView: View {
    let model: ImportFlowModel

    @State private var selectedItem: PhotosPickerItem?
    @State private var isPasteModeActive = false
    @State private var pastedText = ""

    var body: some View {
        ScrollView {
            VStack(spacing: Banter.Spacing.md) {
                Text("Import a conversation")
                    .font(Banter.Type.display)
                    .padding(.top, Banter.Spacing.xl)

                if !isPasteModeActive {
                    Image(systemName: "text.bubble.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(Banter.Colors.textSecondary)
                        .padding(.top, Banter.Spacing.xl)
                        .accessibilityHidden(true)

                    Text("Add a chat screenshot or paste the conversation — nothing sends anywhere until you confirm it.")
                        .font(Banter.Type.body)
                        .foregroundStyle(Banter.Colors.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Banter.Spacing.md)

                    PhotosPicker(selection: $selectedItem, matching: .images) {
                        Text("Choose Screenshot")
                            .font(Banter.Type.body)
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: 52)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Banter.Colors.accent)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.md))
                    .padding(.horizontal, Banter.Spacing.md)
                    .padding(.top, Banter.Spacing.md)

                    Button {
                        withAnimation(reduceMotionAwareAnimation) {
                            isPasteModeActive = true
                        }
                    } label: {
                        Text("Paste Text Instead")
                            .font(Banter.Type.body)
                            .foregroundStyle(Banter.Colors.accent)
                            .frame(minHeight: 44)
                    }
                    .padding(.top, Banter.Spacing.md)
                } else {
                    pasteEntrySection
                }
            }
        }
        .background(Banter.Colors.background)
        .onChange(of: selectedItem) { _, newItem in
            Task { await loadSelectedItem(newItem) }
        }
    }

    private var pasteEntrySection: some View {
        VStack(alignment: .leading, spacing: Banter.Spacing.sm) {
            if pastedText.isEmpty {
                Text("Paste your conversation")
                    .font(Banter.Type.heading)
                Text("Copy the chat from your messaging app, then paste it here. We'll split it into a message list you can check.")
                    .font(Banter.Type.body)
                    .foregroundStyle(Banter.Colors.textSecondary)
            }

            TextEditor(text: $pastedText)
                .font(Banter.Type.body)
                .frame(minHeight: 200)
                .padding(Banter.Spacing.xs)
                .overlay(
                    RoundedRectangle(cornerRadius: Banter.Radius.md)
                        .stroke(Banter.Colors.accent, lineWidth: 1)
                )
                .accessibilityLabel("Paste your conversation here")

            Button {
                Task { await model.parsePastedText(pastedText) }
            } label: {
                Text("Parse Text")
                    .font(Banter.Type.body)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            .tint(Banter.Colors.accent)
            .disabled(pastedText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .opacity(pastedText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1.0)
        }
        .padding(.horizontal, Banter.Spacing.md)
    }

    private var reduceMotionAwareAnimation: Animation? {
        UIAccessibility.isReduceMotionEnabled ? .easeOut(duration: 0.01) : .easeOut(duration: 0.2)
    }

    @MainActor
    private func loadSelectedItem(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        // Pitfall 4: loadTransferable is async throws and returns Optional —
        // never force-unwrap. On any failure, route to the paste fallback
        // rather than leaving the user on a dead-end picker.
        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let uiImage = UIImage(data: data),
                  let cgImage = uiImage.cgImage else {
                withAnimation(reduceMotionAwareAnimation) { isPasteModeActive = true }
                return
            }
            await model.importScreenshot(cgImage)
        } catch {
            withAnimation(reduceMotionAwareAnimation) { isPasteModeActive = true }
        }
    }
}
