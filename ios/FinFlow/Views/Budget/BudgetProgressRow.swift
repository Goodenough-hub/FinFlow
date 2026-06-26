import SwiftUI
import Charts

struct BudgetProgressRow: View {
    var categoryName: String? = nil
    var categoryIcon: String? = nil
    var categoryColor: Color = .accentBlue
    let total: Decimal
    let spent: Decimal

    private var progress: Double {
        guard total > 0 else { return 0 }
        let spentD = NSDecimalNumber(decimal: spent).doubleValue
        let totalD = NSDecimalNumber(decimal: total).doubleValue
        guard totalD > 0 else { return 0 }
        return min(spentD / totalD, 1.0)
    }

    private var isOver: Bool { spent > total }
    private var remaining: Decimal { max(total - spent, 0) }
    private var progressColor: Color { isOver ? .overspendRed : categoryColor }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let name = categoryName, let icon = categoryIcon {
                HStack(spacing: 10) {
                    CategoryIcon(systemName: icon, color: categoryColor, size: 32)
                    Text(name)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.textPrimary)
                    Spacer()
                    if isOver {
                        Text("超支 \((spent - total).asCurrency)")
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.overspendRed)
                    } else {
                        Text("剩 \(remaining.asCurrency)")
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.textTertiary)
                    }
                }
            } else {
                HStack {
                    Text("本月总预算")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.textPrimary)
                    Spacer()
                    Text("\(spent.asCurrency) / \(total.asCurrency)")
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(isOver ? .overspendRed : .textSecondary)
                }
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.cardBorder.opacity(0.6))
                        .frame(height: 8)
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [progressColor, progressColor.opacity(0.75)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * progress, height: 8)
                        .shadow(color: progressColor.opacity(0.4), radius: 3, x: 0, y: 0)
                }
            }
            .frame(height: 8)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    VStack(spacing: 16) {
        BudgetProgressRow(categoryName: "餐饮", categoryIcon: "fork.knife", categoryColor: .expenseGold, total: 2000, spent: 1500)
        BudgetProgressRow(total: 5000, spent: 6000)
    }
    .padding()
    .background(Color.bgPrimary)
}
