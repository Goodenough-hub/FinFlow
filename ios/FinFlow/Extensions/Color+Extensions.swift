import SwiftUI
import UIKit

extension Color {
    init?(hex: String) {
        var hexStr = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexStr.hasPrefix("#") { hexStr.removeFirst() }
        guard hexStr.count == 6, let value = UInt32(hexStr, radix: 16) else { return nil }
        let r = Double((value >> 16) & 0xFF) / 255.0
        let g = Double((value >> 8) & 0xFF) / 255.0
        let b = Double(value & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }

    var hexString: String {
        guard let components = UIColor(self).cgColor.components else { return "#000000" }
        let r = Int((components[0] * 255).rounded())
        let g = Int((components[1] * 255).rounded())
        let b = Int((components[2] * 255).rounded())
        return String(format: "#%02X%02X%02X", r, g, b)
    }
}

// MARK: - 外观偏好

enum AppearanceMode: String, CaseIterable, Hashable {
    case system
    case dark
    case light

    var displayName: String {
        switch self {
        case .system: return "跟随系统"
        case .dark: return "深色"
        case .light: return "浅色"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .dark: return .dark
        case .light: return .light
        }
    }
}

// MARK: - Design Tokens (精致财务仪表盘 — 自适应明暗)

extension Color {
    private static func dynamic(_ dark: String, _ light: String) -> Color {
        let darkUIColor = UIColor(Color(hex: dark) ?? .black)
        let lightUIColor = UIColor(Color(hex: light) ?? .white)
        return Color(UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark ? darkUIColor : lightUIColor
        })
    }

    static let bgPrimary = dynamic("#0F0F11", "#F5F5F7")
    static let bgCard = dynamic("#1A1A1E", "#FFFFFF")
    static let bgCardElevated = dynamic("#222228", "#F2F2F5")
    static let cardBorder = dynamic("#2C2C2E", "#E5E5EA")

    static let incomeGreen = dynamic("#34D399", "#10B981")
    static let expenseGold = dynamic("#F59E0B", "#D97706")
    static let overspendRed = dynamic("#EF4444", "#DC2626")
    static let transferBlue = dynamic("#5B8DEF", "#3B6FD8")
    static let accentBlue = dynamic("#5B8DEF", "#3B6FD8")

    static let textPrimary = dynamic("#FFFFFF", "#111111")
    static let textSecondary = dynamic("#8E8E93", "#6C6C70")
    static let textTertiary = dynamic("#636366", "#9A9AA0")
}

// MARK: - ShapeStyle Tokens

extension ShapeStyle where Self == Color {
    static var bgPrimary: Color { .bgPrimary }
    static var bgCard: Color { .bgCard }
    static var bgCardElevated: Color { .bgCardElevated }
    static var cardBorder: Color { .cardBorder }
    static var incomeGreen: Color { .incomeGreen }
    static var expenseGold: Color { .expenseGold }
    static var overspendRed: Color { .overspendRed }
    static var transferBlue: Color { .transferBlue }
    static var accentBlue: Color { .accentBlue }
    static var textPrimary: Color { .textPrimary }
    static var textSecondary: Color { .textSecondary }
    static var textTertiary: Color { .textTertiary }
}

// MARK: - Card Background Modifier

struct DashboardCard: ViewModifier {
    var padding: CGFloat = 16
    var cornerRadius: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.bgCard, in: RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(Color.cardBorder, lineWidth: 0.5)
            )
    }
}

extension View {
    func dashboardCard(padding: CGFloat = 16, cornerRadius: CGFloat = 16) -> some View {
        modifier(DashboardCard(padding: padding, cornerRadius: cornerRadius))
    }
}
