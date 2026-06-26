import SwiftUI

struct CalendarView: View {
    let transactions: [Transaction]
    @Binding var month: Date
    @State private var selectedDay: Date?

    private let columns = Array(repeating: GridItem(.flexible()), count: 7)
    private let weekdays = ["日", "一", "二", "三", "四", "五", "六"]

    private var calendar: Calendar { Calendar.current }

    private var firstDayOfMonth: Date {
        calendar.date(from: calendar.dateComponents([.year, .month], from: month)) ?? month
    }

    private var firstWeekday: Int {
        calendar.component(.weekday, from: firstDayOfMonth)
    }

    private var daysInMonth: Int {
        calendar.range(of: .day, in: .month, for: month)?.count ?? 30
    }

    private func transactions(forDay day: Int) -> [Transaction] {
        let date = dateForDay(day)
        return transactions(forDate: date)
    }

    private func transactions(forDate date: Date) -> [Transaction] {
        transactions.filter { calendar.isDate($0.date, inSameDayAs: date) }
    }

    private func sum(_ txs: [Transaction], type: TransactionType) -> Decimal {
        txs.filter { $0.type == type }.reduce(0) { $0 + $1.amount }
    }

    private func dateForDay(_ day: Int) -> Date {
        calendar.date(byAdding: .day, value: day - 1, to: firstDayOfMonth) ?? firstDayOfMonth
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                Button {
                    step(months: -1)
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.textSecondary)
                        .frame(width: 28, height: 28)
                        .background(Color.bgCardElevated, in: Circle())
                }
                Text(month.monthYearString)
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.textPrimary)
                    .frame(minWidth: 120)
                Button {
                    step(months: 1)
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(month.isSameMonth(as: .now) ? .textTertiary : .textSecondary)
                        .frame(width: 28, height: 28)
                        .background(Color.bgCardElevated, in: Circle())
                }
                .disabled(month.isSameMonth(as: .now))
            }
            .padding(.bottom, 4)

            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(weekdays, id: \.self) { w in
                    Text(w)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.textTertiary)
                        .frame(maxWidth: .infinity)
                }
            }

            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(0..<firstWeekday, id: \.self) { _ in
                    Color.clear.frame(height: 60)
                }
                ForEach(1...daysInMonth, id: \.self) { day in
                    dayCell(day)
                }
            }
        }
        .dashboardCard(padding: 16)
        .sheet(item: Binding(
            get: { selectedDay.map { IdentifiableDate(date: $0) } },
            set: { selectedDay = $0?.date }
        )) { item in
            NavigationStack {
                DailyTransactionListView(date: item.date, transactions: transactions(forDate: item.date))
            }
        }
    }

    @ViewBuilder
    private func dayCell(_ day: Int) -> some View {
        let txs = transactions(forDay: day)
        let date = dateForDay(day)
        let isToday = calendar.isDateInToday(date)
        let income = sum(txs, type: .income)
        let expense = sum(txs, type: .expense)

        Button {
            selectedDay = date
        } label: {
            VStack(spacing: 3) {
                Text("\(day)")
                    .font(.system(size: 13, weight: isToday ? .bold : .medium, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(isToday ? Color.white : .textPrimary)
                if !txs.isEmpty {
                    if income > 0 {
                        Text("+\(compactString(income))")
                            .font(.system(size: 9, weight: .medium, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.incomeGreen)
                            .lineLimit(1)
                    }
                    if expense > 0 {
                        Text("-\(compactString(expense))")
                            .font(.system(size: 9, weight: .medium, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.expenseGold)
                            .lineLimit(1)
                    }
                } else {
                    Text(" ")
                        .font(.system(size: 9))
                }
            }
            .frame(maxWidth: .infinity, minHeight: 60)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(
                        isToday ? AnyShapeStyle(LinearGradient(colors: [Color.accentBlue, Color(hex: "#3B6FD8") ?? .blue], startPoint: .top, endPoint: .bottom)) :
                        (txs.isEmpty ? AnyShapeStyle(Color.clear) : AnyShapeStyle(Color.bgCardElevated))
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isToday ? Color.clear : (txs.isEmpty ? Color.clear : Color.cardBorder.opacity(0.5)), lineWidth: 0.5)
            )
        }
        .buttonStyle(.plain)
    }

    private func compactString(_ amount: Decimal) -> String {
        let d = NSDecimalNumber(decimal: amount).doubleValue
        if d >= 10000 {
            return String(format: "%.1fw", d / 10000)
        } else if d >= 1000 {
            return String(format: "%.1fk", d / 1000)
        } else {
            return NSDecimalNumber(decimal: amount).stringValue
        }
    }

    private func step(months: Int) {
        if let new = calendar.date(byAdding: .month, value: months, to: month) {
            month = new
        }
    }
}

private struct IdentifiableDate: Identifiable {
    let date: Date
    var id: Date { date }
}

#Preview {
    @Previewable @State var month = Date()
    return CalendarView(transactions: [], month: $month)
        .padding()
        .background(Color.bgPrimary)
}
