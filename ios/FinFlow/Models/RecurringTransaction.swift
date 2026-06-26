import Foundation
import SwiftData

enum RecurrenceFrequency: String, Codable, CaseIterable {
    case daily
    case weekly
    case monthly
    case yearly

    var displayName: String {
        switch self {
        case .daily: return "每天"
        case .weekly: return "每周"
        case .monthly: return "每月"
        case .yearly: return "每年"
        }
    }
}

struct RecurrenceRule: Codable, Hashable {
    var frequency: RecurrenceFrequency
    var interval: Int
    var dayOfMonth: Int?
    var dayOfWeek: Int?
}

@Model
final class RecurringTransaction {
    var id: UUID
    var amount: Decimal
    var typeRaw: String
    var note: String
    var recurrenceRuleJSON: String
    var startDate: Date
    var endDate: Date?
    var lastGeneratedDate: Date?
    var isActive: Bool

    var category: Category?
    var account: Account?

    init(
        amount: Decimal,
        type: TransactionType,
        note: String = "",
        rule: RecurrenceRule,
        startDate: Date = .now,
        endDate: Date? = nil,
        category: Category? = nil,
        account: Account? = nil
    ) {
        self.id = UUID()
        self.amount = abs(amount)
        self.typeRaw = type.rawValue
        self.note = note
        self.recurrenceRuleJSON = (try? JSONEncoder().encode(rule)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        self.startDate = startDate
        self.endDate = endDate
        self.lastGeneratedDate = nil
        self.isActive = true
        self.category = category
        self.account = account
    }

    var type: TransactionType {
        TransactionType(rawValue: typeRaw) ?? .expense
    }

    var recurrenceRule: RecurrenceRule? {
        guard let data = recurrenceRuleJSON.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(RecurrenceRule.self, from: data)
    }

    func updateRule(_ rule: RecurrenceRule) {
        if let data = try? JSONEncoder().encode(rule) {
            recurrenceRuleJSON = String(data: data, encoding: .utf8) ?? "{}"
        }
    }
}
