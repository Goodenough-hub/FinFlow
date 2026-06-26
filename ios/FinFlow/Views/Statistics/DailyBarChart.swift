import SwiftUI
import Charts

struct DailyBarChart: View {
    let transactions: [Transaction]
    let period: StatPeriod
    let date: Date

    private struct Bucket: Identifiable {
        let id: String
        let xValue: Int
        let income: Decimal
        let expense: Decimal
    }

    private var buckets: [Bucket] {
        switch period {
        case .month:
            let cal = Calendar.current
            let range = cal.range(of: .day, in: .month, for: date) ?? 1..<29
            let days = range.lowerBound...range.upperBound
            var dict: [Int: (Decimal, Decimal)] = [:]
            for d in days { dict[d] = (0, 0) }
            for tx in transactions {
                let day = cal.component(.day, from: tx.date)
                if var v = dict[day] {
                    if tx.type == .income { v.0 += tx.amount }
                    else if tx.type == .expense { v.1 += tx.amount }
                    dict[day] = v
                }
            }
            return days.map { d in
                let v = dict[d] ?? (0, 0)
                return Bucket(id: "d\(d)", xValue: d, income: v.0, expense: v.1)
            }
        case .year:
            var dict: [Int: (Decimal, Decimal)] = [:]
            for m in 1...12 { dict[m] = (0, 0) }
            let cal = Calendar.current
            for tx in transactions {
                let m = cal.component(.month, from: tx.date)
                if var v = dict[m] {
                    if tx.type == .income { v.0 += tx.amount }
                    else if tx.type == .expense { v.1 += tx.amount }
                    dict[m] = v
                }
            }
            return (1...12).map { m in
                let v = dict[m] ?? (0, 0)
                return Bucket(id: "m\(m)", xValue: m, income: v.0, expense: v.1)
            }
        }
    }

    private var xValues: [Int] {
        period == .month ? [1, 5, 10, 15, 20, 25, 30] : Array(1...12)
    }

    private var xLabel: String {
        period == .month ? "日" : "月"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(period == .month ? "月收支趋势" : "年收支趋势")
                        .font(.system(size: 13, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                    Text("横：\(xLabel)　纵：金额（¥）")
                        .font(.system(size: 10))
                        .foregroundStyle(.textTertiary)
                }
                Spacer()
            }

            Chart {
                ForEach(buckets) { bucket in
                    BarMark(
                        x: .value(xLabel, bucket.xValue),
                        y: .value("收入", NSDecimalNumber(decimal: bucket.income).doubleValue)
                    )
                    .foregroundStyle(Color.incomeGreen)
                    .cornerRadius(3)
                    .position(by: .value("类型", "收入"))

                    BarMark(
                        x: .value(xLabel, bucket.xValue),
                        y: .value("支出", NSDecimalNumber(decimal: bucket.expense).doubleValue)
                    )
                    .foregroundStyle(Color.expenseGold)
                    .cornerRadius(3)
                    .position(by: .value("类型", "支出"))
                }
            }
            .chartForegroundStyleScale([
                "收入": Color.incomeGreen,
                "支出": Color.expenseGold,
            ])
            .chartLegend(position: .top, alignment: .trailing) {
                HStack(spacing: 12) {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.incomeGreen)
                            .frame(width: 6, height: 6)
                        Text("收入")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.textSecondary)
                    }
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.expenseGold)
                            .frame(width: 6, height: 6)
                        Text("支出")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.textSecondary)
                    }
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine()
                        .foregroundStyle(Color.cardBorder.opacity(0.6))
                    AxisValueLabel {
                        if let v = value.as(Double.self) {
                            Text(formatCompact(v))
                        }
                    }
                    .foregroundStyle(.textTertiary)
                    .font(.system(size: 10))
                }
            }
            .chartXAxis {
                AxisMarks(values: xValues.map { Double($0) }) { value in
                    AxisGridLine()
                        .foregroundStyle(Color.cardBorder.opacity(0.3))
                    AxisValueLabel {
                        if let v = value.as(Double.self) {
                            Text("\(Int(v))")
                        }
                    }
                    .foregroundStyle(.textTertiary)
                    .font(.system(size: 10))
                }
            }
            .frame(height: 220)
        }
        .dashboardCard()
    }

    private func formatCompact(_ v: Double) -> String {
        if abs(v) >= 10000 {
            return String(format: "%.1fw", v / 10000)
        } else if abs(v) >= 1000 {
            return String(format: "%.1fk", v / 1000)
        } else {
            return String(format: "%.0f", v)
        }
    }
}
