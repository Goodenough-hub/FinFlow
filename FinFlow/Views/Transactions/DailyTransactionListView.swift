import SwiftUI

struct DailyTransactionListView: View {
    let date: Date
    let transactions: [Transaction]

    private var income: Decimal {
        transactions.filter { $0.type == .income }.reduce(0) { $0 + $1.amount }
    }

    private var expense: Decimal {
        transactions.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount }
    }

    var body: some View {
        List {
            Section {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(date.shortDateString)
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.textPrimary)
                        Text(weekdayName)
                            .font(.system(size: 12))
                            .foregroundStyle(.textTertiary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("结余 \((income - expense).asCurrency)")
                            .font(.system(size: 17, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(income - expense >= 0 ? Color.incomeGreen : Color.overspendRed)
                        Text("\(transactions.count) 笔")
                            .font(.system(size: 11))
                            .foregroundStyle(.textTertiary)
                    }
                }
                .padding(.vertical, 4)
                .listRowBackground(Color.clear)
            }
            Section {
                HStack(spacing: 16) {
                    Label("\(income.asCurrency)", systemImage: "arrow.up.circle.fill")
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.incomeGreen)
                    Spacer()
                    Label("\(expense.asCurrency)", systemImage: "arrow.down.circle.fill")
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.expenseGold)
                }
                .listRowBackground(Color.bgCardElevated)
            } header: {
                Text("收支")
                    .font(.system(size: 12, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(.textTertiary)
            }
            Section {
                ForEach(transactions.sorted { $0.date > $1.date }) { tx in
                    TransactionRowView(transaction: tx)
                        .listRowBackground(Color.bgCardElevated)
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                }
            } header: {
                Text("流水")
                    .font(.system(size: 12, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(.textTertiary)
            }
        }
        .listStyle(.insetGrouped)
        .background(Color.bgPrimary.ignoresSafeArea())
        .scrollContentBackground(.hidden)
        .navigationTitle("当日明细")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var weekdayName: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "EEEE"
        return formatter.string(from: date)
    }
}

#Preview {
    NavigationStack {
        DailyTransactionListView(date: .now, transactions: [])
    }
    .preferredColorScheme(.dark)
}
