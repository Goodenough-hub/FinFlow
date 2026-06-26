import Foundation

extension Decimal {
    var asCurrency: String {
        let fmt = NumberFormatter()
        fmt.numberStyle = .currency
        fmt.locale = Locale(identifier: "zh_CN")
        fmt.currencySymbol = "¥"
        fmt.maximumFractionDigits = 2
        fmt.minimumFractionDigits = 0
        return fmt.string(from: self as NSDecimalNumber) ?? "\(self)"
    }

    var plainString: String {
        let fmt = NumberFormatter()
        fmt.numberStyle = .decimal
        fmt.groupingSeparator = ""
        fmt.maximumFractionDigits = 2
        return fmt.string(from: self as NSDecimalNumber) ?? "\(self)"
    }
}
