import SwiftUI

struct SummaryCard: View {
    let income: Decimal
    let expense: Decimal
    let balance: Decimal

    private var balanceColor: Color {
        balance >= 0 ? .incomeGreen : .overspendRed
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Text("本期结余")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1.2)
                        .foregroundStyle(.textTertiary)
                    Spacer()
                    Image(systemName: balance >= 0 ? "arrow.up.right" : "arrow.down.right")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(balanceColor)
                }

                Text(balance.asCurrency)
                    .font(.system(size: 38, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(balanceColor)
            }

            HStack(spacing: 0) {
                statItem(
                    title: "收入",
                    amount: income,
                    color: .incomeGreen,
                    icon: "arrow.up"
                )

                Rectangle()
                    .fill(Color.cardBorder)
                    .frame(width: 0.5, height: 40)

                statItem(
                    title: "支出",
                    amount: expense,
                    color: .expenseGold,
                    icon: "arrow.down"
                )
            }
        }
        .dashboardCard(padding: 20)
    }

    private func statItem(title: String, amount: Decimal, color: Color, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(color)
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(.textTertiary)
            }
            Text(amount.asCurrency)
                .font(.system(size: 17, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 4)
    }
}

#Preview {
    SummaryCard(income: 8000, expense: 3500, balance: 4500)
        .background(Color.bgPrimary)
}
