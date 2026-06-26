import SwiftUI
import SwiftData
import UIKit

@main
struct FinFlowApp: App {
    @AppStorage("app.appearance") private var appearanceRaw: String = AppearanceMode.system.rawValue

    init() {
        configureAppearance()
    }

    private var appearance: AppearanceMode {
        AppearanceMode(rawValue: appearanceRaw) ?? .system
    }

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .preferredColorScheme(appearance.colorScheme)
                .tint(.accentBlue)
        }
        .modelContainer(for: [
            Transaction.self,
            Category.self,
            Budget.self,
            RecurringTransaction.self,
            Account.self,
        ])
    }

    private func configureAppearance() {
        // 导航栏
        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithOpaqueBackground()
        navAppearance.backgroundColor = UIColor(Color.bgPrimary)
        navAppearance.titleTextAttributes = [.foregroundColor: UIColor.label]
        navAppearance.largeTitleTextAttributes = [.foregroundColor: UIColor.label]
        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().compactAppearance = navAppearance

        // TabBar
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithOpaqueBackground()
        tabAppearance.backgroundColor = UIColor(Color.bgPrimary)
        tabAppearance.shadowColor = UIColor(Color.cardBorder)
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance

        // 表格背景
        let tableAppearance = UITableView.appearance()
        tableAppearance.backgroundColor = UIColor(Color.bgPrimary)
        tableAppearance.separatorColor = UIColor(Color.cardBorder).withAlphaComponent(0.6)

        // Form
        let cellAppearance = UITableViewCell.appearance()
        cellAppearance.backgroundColor = UIColor(Color.bgCardElevated)
    }
}
