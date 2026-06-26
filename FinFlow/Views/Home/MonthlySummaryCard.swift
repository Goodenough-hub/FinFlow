import SwiftUI

struct MonthlySummaryCard: View {
    let month: Date
    let income: Decimal
    let expense: Decimal

    private var balance: Decimal { income - expense }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Text(month.monthYearString)
                    .font(.system(size: 12, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(.textTertiary)
                Spacer()
                Text("结余")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.textTertiary)
                Text(balance.asCurrency)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(balance >= 0 ? .incomeGreen : .overspendRed)
            }

            HStack(spacing: 0) {
                summaryItem(title: "收入", amount: income, color: .incomeGreen, icon: "arrow.up")
                Rectangle().fill(Color.cardBorder).frame(width: 0.5, height: 36)
                summaryItem(title: "支出", amount: expense, color: .expenseGold, icon: "arrow.down")
            }
        }
        .dashboardCard()
    }

    private func summaryItem(title: String, amount: Decimal, color: Color, icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(color)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(.textTertiary)
                Text(amount.asCurrency)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(color)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 4)
    }
}

#Preview {
    MonthlySummaryCard(month: .now, income: 8000, expense: 3500)
        .background(Color.bgPrimary)
}
