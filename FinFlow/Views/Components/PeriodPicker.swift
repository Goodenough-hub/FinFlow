import SwiftUI

enum StatPeriod: String, CaseIterable, Hashable {
    case month
    case year

    var displayName: String {
        switch self {
        case .month: return "月"
        case .year: return "年"
        }
    }
}

struct PeriodPicker: View {
    @Binding var period: StatPeriod
    @Binding var date: Date

    var body: some View {
        HStack(spacing: 12) {
            Picker("周期", selection: $period) {
                ForEach(StatPeriod.allCases, id: \.self) { p in
                    Text(p.displayName).tag(p)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 100)

            HStack(spacing: 6) {
                Button {
                    step(by: -1)
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.textSecondary)
                        .frame(width: 28, height: 28)
                        .background(Color.bgCardElevated, in: Circle())
                }

                Text(title)
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.textPrimary)
                    .frame(minWidth: 100)

                Button {
                    step(by: 1)
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(isCurrent ? .textTertiary : .textSecondary)
                        .frame(width: 28, height: 28)
                        .background(Color.bgCardElevated, in: Circle())
                }
                .disabled(isCurrent)
            }
        }
    }

    private var title: String {
        switch period {
        case .month: return date.monthYearString
        case .year: return "\(date.yearValue)年"
        }
    }

    private var isCurrent: Bool {
        switch period {
        case .month: return date.isSameMonth(as: .now)
        case .year: return date.yearValue == Date().yearValue
        }
    }

    private func step(by value: Int) {
        let cal = Calendar.current
        let component: Calendar.Component = period == .month ? .month : .year
        if let new = cal.date(byAdding: component, value: value, to: date) {
            date = new
        }
    }
}

#Preview {
    @Previewable @State var period: StatPeriod = .month
    @Previewable @State var date: Date = .now
    return PeriodPicker(period: $period, date: $date)
        .padding()
        .background(Color.bgPrimary)
}
