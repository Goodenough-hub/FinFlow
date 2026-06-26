import Foundation
import SwiftData
import SwiftUI

enum CategoryType: String, Codable, CaseIterable, Hashable {
    case income
    case expense

    var displayName: String {
        switch self {
        case .income: return "收入"
        case .expense: return "支出"
        }
    }
}

@Model
final class Category {
    var id: UUID
    var name: String
    var typeRaw: String
    var icon: String
    var colorHex: String
    var sortOrder: Int
    var isSystem: Bool
    var parentID: UUID?

    @Relationship(deleteRule: .nullify, inverse: \Transaction.category)
    var transactions: [Transaction]?

    @Relationship(deleteRule: .cascade, inverse: \Budget.category)
    var budgets: [Budget]?

    @Relationship(deleteRule: .nullify, inverse: \RecurringTransaction.category)
    var recurringTransactions: [RecurringTransaction]?

    init(
        name: String,
        type: CategoryType,
        icon: String,
        colorHex: String,
        sortOrder: Int = 0,
        isSystem: Bool = false,
        parentID: UUID? = nil
    ) {
        self.id = UUID()
        self.name = name
        self.typeRaw = type.rawValue
        self.icon = icon
        self.colorHex = colorHex
        self.sortOrder = sortOrder
        self.isSystem = isSystem
        self.parentID = parentID
    }

    var type: CategoryType {
        CategoryType(rawValue: typeRaw) ?? .expense
    }

    var color: Color {
        Color(hex: colorHex) ?? .blue
    }
}
