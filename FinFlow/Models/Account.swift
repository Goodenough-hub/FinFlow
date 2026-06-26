import Foundation
import SwiftData
import SwiftUI

enum AccountType: String, Codable, CaseIterable, Hashable {
    case alipay
    case wechat
    case unionpay
    case fixed
    case transit
    case other

    var displayName: String {
        switch self {
        case .alipay: return "支付宝"
        case .wechat: return "微信"
        case .unionpay: return "云闪付"
        case .fixed: return "定期"
        case .transit: return "交通卡"
        case .other: return "其他"
        }
    }

    var defaultIcon: String {
        switch self {
        case .alipay: return "a.circle.fill"
        case .wechat: return "message.fill"
        case .unionpay: return "c.circle.fill"
        case .fixed: return "safe.fill"
        case .transit: return "tram.fill"
        case .other: return "creditcard.fill"
        }
    }

    var defaultColorHex: String {
        switch self {
        case .alipay: return "#1677FF"
        case .wechat: return "#07C160"
        case .unionpay: return "#E60012"
        case .fixed: return "#F59E0B"
        case .transit: return "#8B5CF6"
        case .other: return "#6B7280"
        }
    }
}

@Model
final class Account {
    var id: UUID
    var name: String
    var typeRaw: String
    var icon: String
    var colorHex: String
    var initialBalance: Decimal
    var sortOrder: Int
    var isSystem: Bool
    var createdAt: Date

    var transactions: [Transaction]?
    var transfersIn: [Transaction]?

    init(
        name: String,
        type: AccountType,
        initialBalance: Decimal = 0,
        icon: String? = nil,
        colorHex: String? = nil,
        sortOrder: Int = 0,
        isSystem: Bool = false
    ) {
        self.id = UUID()
        self.name = name
        self.typeRaw = type.rawValue
        self.icon = icon ?? type.defaultIcon
        self.colorHex = colorHex ?? type.defaultColorHex
        self.initialBalance = initialBalance
        self.sortOrder = sortOrder
        self.isSystem = isSystem
        self.createdAt = .now
    }

    var type: AccountType {
        AccountType(rawValue: typeRaw) ?? .other
    }

    var color: Color {
        Color(hex: colorHex) ?? .blue
    }
}
