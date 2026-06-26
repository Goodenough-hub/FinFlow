import Foundation

extension Date {
    var startOfDay: Date {
        Calendar.current.startOfDay(for: self)
    }

    var startOfMonth: Date {
        let cal = Calendar.current
        let comps = cal.dateComponents([.year, .month], from: self)
        return cal.date(from: comps) ?? self
    }

    var endOfMonth: Date {
        let cal = Calendar.current
        var comps = DateComponents()
        comps.month = 1
        comps.second = -1
        return cal.date(byAdding: comps, to: startOfMonth) ?? self
    }

    var monthValue: Int {
        Calendar.current.component(.month, from: self)
    }

    var yearValue: Int {
        Calendar.current.component(.year, from: self)
    }

    func isSameMonth(as other: Date) -> Bool {
        monthValue == other.monthValue && yearValue == other.yearValue
    }

    var monthYearString: String {
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "zh_CN")
        fmt.dateFormat = "yyyy年M月"
        return fmt.string(from: self)
    }

    var shortDateString: String {
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "zh_CN")
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: self)
    }
}

extension Int {
    var monthName: String {
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "zh_CN")
        return fmt.standaloneMonthSymbols[self - 1]
    }
}
