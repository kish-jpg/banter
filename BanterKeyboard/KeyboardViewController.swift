import UIKit
import SwiftUI
import BanterShared

/// Phase 5 keyboard surface (KEYS-01/02/03). Hosts `KeyboardSuggestionsView`
/// as a child view controller, reads the cached suggestions the app wrote
/// into the App Group, inserts a tapped suggestion into the host text field,
/// and always exposes the globe/next-keyboard key when required. Local,
/// synchronous read only — no network, no RevenueCat, ever (KEYS-03).
class KeyboardViewController: UIInputViewController {
    private var hostingController: UIHostingController<KeyboardSuggestionsView>?

    override func viewDidLoad() {
        super.viewDidLoad()

        let rootView = makeRootView()
        let hosting = UIHostingController(rootView: rootView)
        hostingController = hosting

        addChild(hosting)
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hosting.view)
        NSLayoutConstraint.activate([
            hosting.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hosting.view.topAnchor.constraint(equalTo: view.topAnchor),
            hosting.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        hosting.didMove(toParent: self)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Re-read on every appearance (not just viewDidLoad) so a keyboard
        // switched-to after the app generated fresh suggestions shows the
        // latest cache — mutate rootView in place, never rebuild the hosting
        // controller (05-RESEARCH.md Anti-Patterns).
        hostingController?.rootView = makeRootView()
    }

    private func makeRootView() -> KeyboardSuggestionsView {
        KeyboardSuggestionsView(
            suggestions: AppGroupStore.read([ReplySuggestion].self, forKey: CachedSuggestionsStorageKey.suggestions) ?? [],
            onInsert: { [weak self] text in
                self?.textDocumentProxy.insertText(text)
            },
            needsInputModeSwitchKey: needsInputModeSwitchKey,
            onSwitchKeyboard: { [weak self] in
                self?.advanceToNextInputMode()
            },
            isDark: resolveIsDark()
        )
    }

    /// Consults the host text field's keyboardAppearance first, since it can
    /// differ from ambient device appearance (05-UI-SPEC.md Appearance
    /// Strategy); falls back to traitCollection only when the host declares
    /// no preference (.default).
    private func resolveIsDark() -> Bool {
        switch textDocumentProxy.keyboardAppearance {
        case .dark:
            return true
        case .light:
            return false
        default:
            return traitCollection.userInterfaceStyle == .dark
        }
    }
}
