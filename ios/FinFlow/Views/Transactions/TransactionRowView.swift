import SwiftUI

struct TransactionRowView: View {
    let transaction: Transaction

    var body: some View {
        HStack(spacing: 12) {
            if transaction.type == .transfer {
                CategoryIcon(systemName: "arrow.left.arrow.right", color: .transferBlue, size: 40)
            } else {
                CategoryIcon(
                    systemName: transaction.category?.icon ?? "questionmark.circle.fill",
                    color: transaction.category?.color ?? .gray,
                    size: 40
                )
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.textPrimary)
                    .lineLimit(1)
                if !transaction.note.isEmpty {
                    Text(transaction.note)
                        .font(.system(size: 12))
                        .foregroundStyle(.textTertiary)
                        .lineLimit(1)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                AmountText(amount: transaction.amount, type: transaction.type)
                Text(transaction.date, format: .dateTime.month().day().hour().minute())
                    .font(.system(size: 11))
                    .foregroundStyle(.textTertiary)
                    .monospacedDigit()
            }
        }
    }

    private var title: String {
        if transaction.type == .transfer {
            let from = transaction.account?.name ?? "?"
            let to = transaction.toAccount?.name ?? "?"
            return "\(from) → \(to)"
        }
        let name = transaction.category?.name ?? "未分类"
        if let vendor = transaction.vendor, !vendor.isEmpty {
            return "\(name) · \(vendor)"
        }
        return name
    }
}
