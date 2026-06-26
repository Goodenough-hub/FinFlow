import SwiftUI
import SwiftData

struct HomeView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: [SortDescriptor(\Transaction.date, order: .reverse)]) private var allTransactions: [Transaction]
    @Query private var allBudgets: [Budget]

    @State private var period: StatPeriod = .month
    @State private var date: Date = .now
    @State private var categoryTab: TransactionType = .expense
    @State private var showingForm = false

    private var filtered: [Transaction] {
        switch period {
        case .month:
            return allTransactions.filter { $0.date.isSameMonth(as: date) }
        case .year:
            return allTransactions.filter { $0.date.yearValue == date.yearValue }
        }
    }

    private var totalIncome: Decimal {
        filtered.filter { $0.type == .income }.reduce(0) { $0 + $1.amount }
    }

    private var totalExpense: Decimal {
        filtered.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount }
    }

    private var balance: Decimal { totalIncome - totalExpense }

    private var recentTransactions: [Transaction] {
        Array(allTransactions.prefix(5))
    }

    private var overspendAlerts: [(String, Decimal, Decimal)] {
        guard period == .month && date.isSameMonth(as: .now) else { return [] }
        return allBudgets
            .filter { $0.month == date.monthValue && $0.year == date.yearValue }
            .compactMap { budget in
                guard let cat = budget.category else { return nil }
                let spent = filtered
                    .filter { $0.category?.id == cat.id && $0.type == .expense }
                    .reduce(0) { $0 + $1.amount }
                if spent > budget.amount {
                    return (cat.name, spent, budget.amount)
                }
                return nil
            }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PeriodPicker(period: $period, date: $date)
                        .padding(.top, 4)

                    SummaryCard(income: totalIncome, expense: totalExpense, balance: balance)

                    if !overspendAlerts.isEmpty {
                        OverspendAlertBanner(alerts: overspendAlerts)
                    }

                    if filtered.isEmpty {
                        EmptyStateView(
                            systemName: "chart.bar",
                            title: "本周期暂无数据",
                            subtitle: "记一笔后即可查看统计"
                        )
                        .frame(height: 200)
                    } else {
                        DailyBarChart(transactions: filtered, period: period, date: date)

                        categoryAnalysisSection

                        if period == .month {
                            DailyReportList(transactions: filtered)
                        }

                        recentSection
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .background(Color.bgPrimary.ignoresSafeArea())
            .scrollContentBackground(.hidden)
            .navigationTitle("FinFlow")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    AddTransactionButton { showingForm = true }
                }
            }
            .sheet(isPresented: $showingForm) {
                TransactionFormView(transaction: nil)
            }
        }
    }

    private var categoryAnalysisSection: some View {
        VStack(spacing: 12) {
            Picker("类型", selection: $categoryTab) {
                ForEach([TransactionType.expense, .income], id: \.self) { t in
                    Text(t.displayName).tag(t)
                }
            }
            .pickerStyle(.segmented)

            CategoryAnalysisView(transactions: filtered, type: categoryTab)
                .id(categoryTab.rawValue)
        }
    }

    private var recentSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("最近记录")
                    .font(.system(size: 13, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(.textTertiary)
                Spacer()
                Text("账单 Tab 查看全部")
                    .font(.system(size: 11))
                    .foregroundStyle(.textTertiary)
            }
            if recentTransactions.isEmpty {
                EmptyStateView(
                    systemName: "tray",
                    title: "还没有记录",
                    subtitle: "点击右上角 + 记一笔"
                )
                .frame(height: 140)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(recentTransactions.enumerated()), id: \.element.id) { idx, tx in
                        TransactionRowView(transaction: tx)
                            .padding(.vertical, 8)
                        if idx < recentTransactions.count - 1 {
                            Rectangle()
                                .fill(Color.cardBorder.opacity(0.4))
                                .frame(height: 0.5)
                        }
                    }
                }
                .dashboardCard(padding: 14)
            }
        }
    }
}

#Preview {
    HomeView()
        .modelContainer(for: [Transaction.self, Category.self, Budget.self, RecurringTransaction.self, Account.self], inMemory: true)
}
