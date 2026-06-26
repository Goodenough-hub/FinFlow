import SwiftUI

struct DailyReportList: View {
    let transactions: [Transaction]
    @State private var isExpanded = false

    private struct DayGroup: Identifiable {
        let id: String
        let date: Date
        let income: Decimal
        let expense: Decimal
        let count: Int
        let items: [Transaction]
    }

    private var groups: [DayGroup] {
        let cal = Calendar.current
        let grouped = Dictionary(grouping: transactions) { tx -> Date in
            cal.startOfDay(for: tx.date)
        }
        return grouped.map { (day, txs) in
            DayGroup(
                id: day.shortDateString,
                date: day,
                income: txs.filter { $0.type == .income }.reduce(0) { $0 + $1.amount },
                expense: txs.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount },
                count: txs.count,
                items: txs.sorted { $0.date > $1.date }
            )
        }
        .sorted { $0.date > $1.date }
    }

    var body: some View {
        if groups.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 12) {
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) { isExpanded.toggle() }
                } label: {
                    HStack {
                        Text("日报表")
                            .font(.system(size: 13, weight: .semibold))
                            .textCase(.uppercase)
                            .tracking(1)
                            .foregroundStyle(.textTertiary)
                        Spacer()
                        Text("\(groups.count) 天")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.textTertiary)
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.textTertiary)
                    }
                }
                .buttonStyle(.plain)

                if isExpanded {
                    VStack(spacing: 8) {
                        ForEach(groups) { group in
                            VStack(spacing: 6) {
                                HStack {
                                    Text(group.date.shortDateString)
                                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                                        .monospacedDigit()
                                        .foregroundStyle(.textPrimary)
                                    Spacer()
                                    Text("\(group.count) 笔")
                                        .font(.system(size: 11))
                                        .foregroundStyle(.textTertiary)
                                }
                                HStack(spacing: 12) {
                                    Label(group.income.asCurrency, systemImage: "arrow.up")
                                        .labelStyle(.titleAndIcon)
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundStyle(.incomeGreen)
                                    Label(group.expense.asCurrency, systemImage: "arrow.down")
                                        .labelStyle(.titleAndIcon)
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundStyle(.expenseGold)
                                    Spacer()
                                    Label((group.income - group.expense).asCurrency, systemImage: "equal")
                                        .labelStyle(.titleAndIcon)
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(.textSecondary)
                                }
                            }
                            .padding(.vertical, 8)
                            .padding(.horizontal, 12)
                            .background(Color.bgCardElevated, in: RoundedRectangle(cornerRadius: 10))
                        }
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .dashboardCard()
        }
    }
}
