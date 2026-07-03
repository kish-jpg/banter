import UIKit
import BanterShared

/// Code-only keyboard extension placeholder. Reads back the sample the app
/// wrote into the App Group and displays it, proving the read side of the
/// app <-> keyboard round-trip. No Storyboard, no real keyboard UI yet —
/// Phase 1 slice.
class KeyboardViewController: UIInputViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let message = AppGroupStore.read(ConversationMessage.self, forKey: "sample_message")

        let label = UILabel()
        label.numberOfLines = 0
        label.text = message.map { "Read from App Group: \($0.text)" }
            ?? "No sample written yet"

        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            label.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
            label.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
        ])
    }
}
