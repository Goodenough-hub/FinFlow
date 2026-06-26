import SwiftUI
import SwiftData

struct AccountDetailView: View {
    @Environment(\.modelContext) private var context
    let account: Account

    @Query(sort: [SortDescriptor(\Transaction.date, order: .reverse)]) private var allTransactions: [Transaction]
    @State private var showingEdit = false
    @State private var showingRecharge = false
    @State private var filterMonth = Date()

    private var accountTransactions: [Transaction] {
        allTransactions.filter { $0.account?.id == account.id || $0.toAccount?.id == account.id }
    }

    private var monthTransactions: [Transaction] {
        accountTransactions.filter { $0.date.isSameMonth(as: filterMonth) }
    }

    private var balance: Decimal {
        Account.balance(for: account, in: allTransactions)
    }

    private var monthInflow: Decimal {
        var total: Decimal = 0
        for tx in monthTransactions {
            if tx.type == .income && tx.account?.id == account.id { total += tx.amount }
            if tx.type == .transfer && tx.toAccount?.id == account.id { total += tx.amount }
        }
        return total
    }

    private var monthOutflow: Decimal {
        var total: Decimal = 0
        for tx in monthTransactions {
            if tx.type == .expense && tx.account?.id == account.id { total += tx.amount }
            if tx.type == .transfer && tx.account?.id == account.id { total += tx.amount }
        }
        return total
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                balanceCard
                monthlyCard
                transactionsSection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .background(Color.bgPrimary.ignoresSafeArea())
        .scrollContentBackground(.hidden)
        .navigationTitle(account.name)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingEdit = true
                } label: {
                    Image(systemName: "pencil")
                        .foregroundStyle(.textSecondary)
                }
            }
        }
        .sheet(isPresented: $showingEdit) {
            AccountFormView(account: account)
        }
        .sheet(isPresented: $showingRecharge) {
            AccountRechargeView(destination: account)
        }
    }

    private var balanceCard: some View {
        HStack(spacing: 16) {
            CategoryIcon(systemName: account.icon, color: account.color, size: 52)
            VStack(alignment: .leading, spacing: 4) {
                Text(account.type.displayName)
                    .font(.system(size: 11, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(.textTertiary)
                Text(balance.asCurrency)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.textPrimary)
                Text("当前余额")
                    .font(.system(size: 11))
                    .foregroundStyle(.textTertiary)
            }
            Spacer()
        }
        .dashboardCard(padding: 20)
    }

    private var monthlyCard: some View {
        VStack(spacing: 16) {
            HStack {
                MonthYearPicker(date: $filterMonth)
                Spacer()
                if account.type == .transit {
                    Button {
                        showingRecharge = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                                .font(.system(size: 11, weight: .bold))
                            Text("充值")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(
                            LinearGradient(colors: [Color.accentBlue, Color(hex: "#3B6FD8") ?? .blue], startPoint: .top, endPoint: .bottom),
                            in: Capsule()
                        )
                    }
                }
            }
            HStack(spacing: 0) {
                statItem(title: "流入", amount: monthInflow, color: .incomeGreen)
                Rectangle().fill(Color.cardBorder).frame(width: 0.5, height: 36)
                statItem(title: "流出", amount: monthOutflow, color: .expenseGold)
                Rectangle().fill(Color.cardBorder).frame(width: 0.5, height: 36)
                statItem(title: "净变动", amount: monthInflow - monthOutflow, color: .transferBlue)
            }
        }
        .dashboardCard(padding: 16)
    }

    private func statItem(title: String, amount: Decimal, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1)
                .foregroundStyle(.textTertiary)
            Text(amount.asCurrency)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 4)
    }

    private var transactionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("\(filterMonth.monthYearString) 流水")
                .font(.system(size: 13, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1)
                .foregroundStyle(.textTertiary)
            if monthTransactions.isEmpty {
                EmptyStateView(systemName: "tray", title: "本月无记录", subtitle: "")
                    .frame(height: 120)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(monthTransactions.enumerated()), id: \.element.id) { idx, tx in
                        TransactionRowView(transaction: tx)
                            .padding(.vertical, 6)
                        if idx < monthTransactions.count - 1 {
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
