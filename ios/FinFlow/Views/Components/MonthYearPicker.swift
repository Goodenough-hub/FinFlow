import SwiftUI

struct MonthYearPicker: View {
    @Binding var date: Date

    var body: some View {
        HStack(spacing: 6) {
            Button {
                step(months: -1)
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.textSecondary)
                    .frame(width: 28, height: 28)
                    .background(Color.bgCardElevated, in: Circle())
            }
            Text(date.monthYearString)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.textPrimary)
                .frame(minWidth: 90)
            Button {
                step(months: 1)
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(date.isSameMonth(as: .now) ? .textTertiary : .textSecondary)
                    .frame(width: 28, height: 28)
                    .background(Color.bgCardElevated, in: Circle())
            }
            .disabled(date.isSameMonth(as: .now))
        }
    }

    private func step(months: Int) {
        let cal = Calendar.current
        if let new = cal.date(byAdding: .month, value: months, to: date) {
            date = new
        }
    }
}
