import SwiftUI
import RevenueCat
import BanterShared

/// Screen 4.5 (04-UI-SPEC.md). Dismissible RevenueCat paywall — the price is
/// ALWAYS read at runtime from the fetched StoreProduct, never a hardcoded
/// dollar literal (Open Question 1, MONE-02 hard constraint).
struct PaywallView: View {
    let entitlementManager: EntitlementManager
    let onDismiss: () -> Void

    @State private var packageToPurchase: Package?
    @State private var isPurchaseInFlight = false
    @State private var errorMessage: String?
    @State private var showWelcomeToast = false
    @State private var isTrialEligible = true

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: Banter.Spacing.lg) {
                    dismissRow

                    Text("Unlock unlimited coaching")
                        .font(Banter.TextStyle.display)
                        .multilineTextAlignment(.center)
                        .padding(.top, Banter.Spacing.xl)

                    Text(subheadingText)
                        .font(Banter.TextStyle.body)
                        .foregroundStyle(Banter.Colors.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Banter.Spacing.md)

                    featureList

                    if let errorMessage {
                        Text(errorMessage)
                            .font(Banter.TextStyle.label)
                            .foregroundStyle(Banter.Colors.destructive)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Banter.Spacing.md)
                    }
                }
                .padding(.horizontal, Banter.Spacing.md)
            }
            .background(Banter.Colors.background.ignoresSafeArea())
        }
        .background(Banter.Colors.background.ignoresSafeArea())
        .safeAreaInset(edge: .bottom, spacing: 0) {
            bottomBar
        }
        .overlay(alignment: .bottom) {
            if showWelcomeToast {
                welcomeToast
            }
        }
        .task {
            await loadOffering()
        }
    }

    private var dismissRow: some View {
        HStack {
            Spacer()
            Button {
                onDismiss()
            } label: {
                Image(systemName: "xmark")
                    .foregroundStyle(Banter.Colors.textSecondary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Dismiss")
        }
    }

    private var subheadingText: String {
        guard let price = packageToPurchase?.storeProduct.localizedPriceString else {
            return isTrialEligible
                ? "14 days full access, then continue at the price shown at purchase. Cancel anytime."
                : "Subscribe to continue. Cancel anytime."
        }
        return isTrialEligible
            ? "14 days full access, then \(price)/wk. Cancel anytime."
            : "\(price)/wk. Cancel anytime."
    }

    private var featureList: some View {
        VStack(alignment: .leading, spacing: Banter.Spacing.sm) {
            featureRow("Unlimited daily analyses")
            featureRow("Full conversation health timeline")
            featureRow("Priority reply generation")
        }
        .padding(Banter.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Banter.Colors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))
    }

    private func featureRow(_ label: String) -> some View {
        HStack(spacing: Banter.Spacing.sm) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Banter.Colors.accent)
            Text(label)
                .font(Banter.TextStyle.body)
                .foregroundStyle(Banter.Colors.textPrimary)
        }
    }

    private var bottomBar: some View {
        VStack(spacing: Banter.Spacing.sm) {
            Divider()

            Button {
                Task { await purchase() }
            } label: {
                Group {
                    if isPurchaseInFlight {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text(isTrialEligible ? "Start Free Trial" : "Subscribe")
                            .foregroundStyle(.white)
                    }
                }
                .font(Banter.TextStyle.body)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 52)
            }
            .buttonStyle(.borderedProminent)
            .tint(Banter.Colors.accent)
            .disabled(isPurchaseInFlight || packageToPurchase == nil)
            .opacity(isPurchaseInFlight ? 0.7 : 1.0)
            .padding(.horizontal, Banter.Spacing.md)

            Text("You won't be charged until your trial ends. Manage or cancel anytime in Settings.")
                .font(Banter.TextStyle.label)
                .foregroundStyle(Banter.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Banter.Spacing.md)

            Button {
                onDismiss()
            } label: {
                Text("Not Now")
                    .font(Banter.TextStyle.body)
                    .foregroundStyle(Banter.Colors.accent)
                    .frame(minHeight: 44)
            }
            .disabled(isPurchaseInFlight)
            .opacity(isPurchaseInFlight ? 0.5 : 1.0)
        }
        .padding(.bottom, Banter.Spacing.sm)
        .background(Banter.Colors.background)
    }

    private var welcomeToast: some View {
        Text("Welcome to Premium")
            .font(Banter.TextStyle.label)
            .padding(.horizontal, Banter.Spacing.md)
            .padding(.vertical, Banter.Spacing.sm)
            .background(Banter.Colors.surface)
            .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.md))
            .padding(.bottom, Banter.Spacing.sm)
    }

    // MARK: - RevenueCat

    private func loadOffering() async {
        guard let offerings = try? await Purchases.shared.offerings() else { return }
        guard let package = offerings.current?.availablePackages.first else { return }
        packageToPurchase = package
        isTrialEligible = await Purchases.shared.checkTrialOrIntroDiscountEligibility(product: package.storeProduct).trialOrIntroEligibility == .eligible
    }

    private func purchase() async {
        guard let packageToPurchase, !isPurchaseInFlight else { return }
        isPurchaseInFlight = true
        errorMessage = nil
        defer { isPurchaseInFlight = false }

        do {
            let result = try await Purchases.shared.purchase(package: packageToPurchase)
            guard !result.userCancelled else { return }
            await entitlementManager.refresh()
            showWelcomeToast = true
            Task {
                try? await Task.sleep(for: .seconds(2))
                showWelcomeToast = false
                onDismiss()
            }
        } catch {
            errorMessage = "Something went wrong. Try again or contact support."
        }
    }
}
