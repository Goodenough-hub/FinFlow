import Foundation
import SwiftData

enum TransactionType: String, Codable, CaseIterable, Hashable {
    case income
    case expense
    case transfer

    var displayName: String {
        switch self {
        case .income: return "收入"
        case .expense: return "支出"
        case .transfer: return "转账"
        }
    }
}

@Model
final class Transaction {
    var id: UUID
    var amount: Decimal
    var typeRaw: String
    var note: String
    var date: Date
    var createdAt: Date
    var sourceID: UUID?
    var sourceTypeRaw: String?
    var vendor: String?

    var category: Category?
    var account: Account?
    var toAccount: Account?

    init(
        amount: Decimal,
        type: TransactionType,
        note: String = "",
        date: Date = .now,
        category: Category? = nil,
        account: Account? = nil,
        toAccount: Account? = nil,
        sourceID: UUID? = nil,
        sourceType: String? = nil,
        vendor: String? = nil
    ) {
        self.id = UUID()
        self.amount = abs(amount)
        self.typeRaw = type.rawValue
        self.note = note
        self.date = date
        self.createdAt = .now
        self.category = category
        self.account = account
        self.toAccount = toAccount
        self.sourceID = sourceID
        self.sourceTypeRaw = sourceType
        self.vendor = vendor
    }

    var type: TransactionType {
        TransactionType(rawValue: typeRaw) ?? .expense
    }

    var signedAmount: Decimal {
        switch type {
        case .income: return amount
        case .expense: return -amount
        case .transfer: return 0
        }
    }

    var isFromRecurring: Bool {
        sourceID != nil
    }
}

