import SwiftUI

struct OverspendAlertBanner: View {
    let alerts: [(categoryName: String, spent: Decimal, budget: Decimal)]

    var body: some View {
        if alerts.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.expenseGold)
                    Text("超支预警")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.textPrimary)
                    Spacer()
                    Text("\(alerts.count) 项")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.overspendRed)
                }

                VStack(spacing: 6) {
                    ForEach(alerts.prefix(3), id: \.categoryName) { alert in
                        HStack {
                            Text(alert.categoryName)
                                .font(.system(size: 13))
                                .foregroundStyle(.textSecondary)
                            Spacer()
                            Text("\(alert.spent.asCurrency) / \(alert.budget.asCurrency)")
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.overspendRed)
                        }
                    }
                }

                if alerts.count > 3 {
                    Text("还有 \(alerts.count - 3) 项…")
                        .font(.system(size: 11))
                        .foregroundStyle(.textTertiary)
                }
            }
            .dashboardCard(padding: 14)
            .overlay(
                Rectangle()
                    .fill(Color.overspendRed)
                    .frame(width: 3)
                    .clipShape(RoundedCorner(radius: 2, corners: [.topLeft, .bottomLeft])),
                alignment: .leading
            )
        }
    }
}

private struct RoundedCorner: Shape {
    var radius: CGFloat
    var corners: UIRectCorner

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}
