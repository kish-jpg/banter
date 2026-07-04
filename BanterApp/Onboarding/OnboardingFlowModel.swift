import Foundation
import Observation

/// State machine driving the fresh-install onboarding flow: Welcome ->
/// Photos permission priming -> real import/confirm/coaching loop
/// (ValueDemoCoordinatorView wraps ImportFlowModel for that last part).
/// Mirrors ImportFlowModel's @Observable/private(set)-state/named-methods
/// shape (04-PATTERNS.md).
@Observable
final class OnboardingFlowModel {
    enum PermissionType {
        case photos
    }

    enum State: Equatable {
        case welcome
        case permissionPriming(type: PermissionType)
        case importFlow
        case suggestionsShown
    }

    private(set) var state: State = .welcome

    /// Key for the "seen priming" flag, plain UserDefaults.standard (not the
    /// shared App Group store - this is a device-local UI flag, not data
    /// that crosses the app/keyboard boundary). A simple boolean, not a new
    /// BanterShared model (04-UI-SPEC.md Screen 4.2 Assumption).
    private static let hasSeenPhotosPrimingKey = "onboarding.hasSeenPhotosPriming"

    private var hasSeenPhotosPriming: Bool {
        get { UserDefaults.standard.bool(forKey: Self.hasSeenPhotosPrimingKey) }
        set { UserDefaults.standard.set(newValue, forKey: Self.hasSeenPhotosPrimingKey) }
    }

    /// CI/XCUITest fresh-install seed arguments. Force `.welcome` and clear
    /// the "seen priming" flag so XCUITest gets a deterministic fresh-install
    /// state, matching ImportFlowModel's `#if DEBUG` + CommandLine.arguments
    /// seed pattern. `--seed-fresh-install` matches the Wave-0
    /// OnboardingFlowTests/PermissionPrimingTests scaffolds (04-01);
    /// `--reset-onboarding-state` is kept as an alias per this plan's spec.
    static let seedFreshInstallArgument = "--seed-fresh-install"
    static let resetOnboardingStateArgument = "--reset-onboarding-state"

    init(arguments: [String] = CommandLine.arguments) {
        #if DEBUG
        if arguments.contains(Self.seedFreshInstallArgument) || arguments.contains(Self.resetOnboardingStateArgument) {
            hasSeenPhotosPriming = false
            state = .welcome
        }
        #endif
    }

    func start() {
        state = hasSeenPhotosPriming ? .importFlow : .permissionPriming(type: .photos)
    }

    func advanceToPermissionPriming() {
        state = .permissionPriming(type: .photos)
    }

    func continueToImport() {
        hasSeenPhotosPriming = true
        state = .importFlow
    }

    func skipPriming() {
        hasSeenPhotosPriming = true
        state = .importFlow
    }

    func showSuggestions() {
        state = .suggestionsShown
    }
}
