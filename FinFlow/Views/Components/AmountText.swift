import SwiftUI

struct AmountText: View {
    let amount: Decimal
    var type: TransactionType

    var body: some View {
        Text(displayString)
            .font(.body.weight(.medium).monospacedDigit())
            .foregroundStyle(color)
    }

    private var color: Color {
        switch type {
        case .income: return .incomeGreen
        case .expense: return .expenseGold
        case .transfer: return .transferBlue
        }
    }

    private var displayString: String {
        switch type {
        case .income: return "+\(amount.asCurrency)"
        case .expense: return "-\(amount.asCurrency)"
        case .transfer: return amount.asCurrency
        }
    }
}

#Preview {
    VStack(alignment: .leading, spacing: 8) {
        AmountText(amount: 88.5, type: .expense)
        AmountText(amount: 5000, type: .income)
        AmountText(amount: 200, type: .transfer)
    }
    .padding()
    .background(Color.bgPrimary)
}
