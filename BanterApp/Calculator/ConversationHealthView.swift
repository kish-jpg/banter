import SwiftUI
import Charts
import BanterShared

/// Screen 4.4 — Conversation Health (CALC-02, CALC-03). Health score, sentiment
/// timeline chart, and 4 emotional-factor mini-cards, scoped strictly to one
/// conversationId — read exclusively via `SentimentTimelineStore.events(forConversationId:)`.
/// No view element here displays or requests a match name (CALC-03).
struct ConversationHealthView: View {
    let conversationId: UUID
    let store: SentimentTimelineStore

    init(conversationId: UUID, store: SentimentTimelineStore = SentimentTimelineStore()) {
        self.conversationId = conversationId
        self.store = store
    }

    private var events: [SentimentEvent] {
        store.events(forConversationId: conversationId)
    }

    var body: some View {
        VStack(spacing: 0) {
            header

            ScrollView {
                VStack(spacing: Banter.Spacing.lg) {
                    healthScoreCard

                    if events.isEmpty {
                        emptyState
                    } else {
                        timelineChart
                        factorGrid
                    }
                }
                .padding(Banter.Spacing.md)
            }
        }
        .background(Banter.Colors.background.ignoresSafeArea())
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Banter.Spacing.xs) {
            Text("Conversation Health")
                .font(Banter.TextStyle.heading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Banter.Spacing.md)
    }

    private var healthScoreCard: some View {
        VStack(spacing: Banter.Spacing.sm) {
            Text("\(Int(healthScore))")
                .font(Banter.TextStyle.display)
                .foregroundStyle(Banter.Colors.textPrimary)
            Text("Health Score")
                .font(Banter.TextStyle.label)
                .foregroundStyle(Banter.Colors.textSecondary)
            Text("Scoped to this conversation only — never shared across matches.")
                .font(Banter.TextStyle.label)
                .foregroundStyle(Banter.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(Banter.Spacing.lg)
        .background(Banter.Colors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))
    }

    /// Normalized cumulative score, 0-100. Bounded sum of scoreDelta clamped
    /// to a simple 0-100 range so an empty/single-event conversation never
    /// shows a nonsensical value.
    private var healthScore: Double {
        guard !events.isEmpty else { return 50 }
        let cumulative = events.reduce(0) { $0 + $1.scoreDelta }
        return min(100, max(0, 50 + cumulative * 10))
    }

    private var emptyState: some View {
        VStack(spacing: Banter.Spacing.md) {
            Spacer(minLength: Banter.Spacing.xxl)
            Text("Nothing to score yet")
                .font(Banter.TextStyle.heading)
            Text("Your first analyzed exchange will show up here.")
                .font(Banter.TextStyle.body)
                .foregroundStyle(Banter.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Banter.Spacing.md)
            Spacer(minLength: Banter.Spacing.xxl)
        }
    }

    private var timelineChart: some View {
        VStack(alignment: .leading, spacing: Banter.Spacing.xs) {
            Chart {
                if events.count == 1, let onlyEvent = events.first {
                    PointMark(
                        x: .value("Message", onlyEvent.messageIndex),
                        y: .value("Score", onlyEvent.scoreDelta)
                    )
                    .foregroundStyle(chartColor(for: onlyEvent.scoreDelta))
                } else {
                    // messageIndex is NOT unique (user + match events can
                    // share one, re-analysis duplicates too) — key by array
                    // position instead, matching the suggestions-list pattern.
                    ForEach(Array(events.enumerated()), id: \.offset) { _, event in
                        LineMark(
                            x: .value("Message", event.messageIndex),
                            y: .value("Score", event.scoreDelta)
                        )
                        AreaMark(
                            x: .value("Message", event.messageIndex),
                            y: .value("Score", event.scoreDelta)
                        )
                        .opacity(0.15)
                    }
                    .foregroundStyle(chartColor(for: trendScoreDelta))
                }
            }
            .frame(height: 200)
            .padding(Banter.Spacing.md)
            .background(Banter.Colors.surface)
            .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))
            .accessibilityLabel(chartAccessibilitySummary)
        }
    }

    /// Last event's scoreDelta, used to color the whole line/area by overall trend.
    private var trendScoreDelta: Double {
        events.last?.scoreDelta ?? 0
    }

    private func chartColor(for scoreDelta: Double) -> Color {
        scoreDelta >= 0 ? Banter.Colors.textPrimary : Banter.Colors.destructive
    }

    /// VoiceOver text-equivalent summary of the current score and trend —
    /// the chart must never be a silent black box to VoiceOver users.
    private var chartAccessibilitySummary: String {
        let trend = trendScoreDelta >= 0 ? "trending positive" : "trending negative"
        return "Conversation health timeline, \(events.count) exchanges, currently \(trend)."
    }

    private var factorGrid: some View {
        let factors = latestFactors
        let columns = [GridItem(.flexible()), GridItem(.flexible())]
        return LazyVGrid(columns: columns, spacing: Banter.Spacing.sm) {
            factorCard(title: "Interest", value: factors?.interest ?? 0)
            factorCard(title: "Reciprocity", value: factors?.reciprocity ?? 0)
            factorCard(title: "Warmth", value: factors?.warmth ?? 0)
            factorCard(title: "Responsiveness", value: factors?.responsiveness ?? 0)
        }
    }

    private var latestFactors: SentimentFactors? {
        events.last?.factors
    }

    private func factorCard(title: String, value: Double) -> some View {
        VStack(alignment: .leading, spacing: Banter.Spacing.xs) {
            Text(title)
                .font(Banter.TextStyle.label)
                .foregroundStyle(Banter.Colors.textSecondary)
            Capsule()
                .fill(Banter.Colors.accent.opacity(0.3))
                .frame(height: 8)
                .overlay(alignment: .leading) {
                    GeometryReader { geometry in
                        Capsule()
                            .fill(Banter.Colors.accent)
                            .frame(width: geometry.size.width * min(1, max(0, value)))
                    }
                }
        }
        .padding(Banter.Spacing.sm)
        .background(Banter.Colors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.md))
    }
}
