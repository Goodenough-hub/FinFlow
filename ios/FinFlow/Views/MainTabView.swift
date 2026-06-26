import SwiftUI
import SwiftData

struct MainTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        TabView {
            Tab("首页", systemImage: "house.fill") {
                HomeView()
            }
            Tab("账单", systemImage: "list.bullet.rectangle.portrait.fill") {
                TransactionListView()
            }
            Tab("资产", systemImage: "creditcard.fill") {
                AccountListView()
            }
            Tab("设置", systemImage: "gearshape.fill") {
                SettingsView()
            }
        }
        .onAppear {
            SeedDataService.seedIfNeeded(context: modelContext)
            RecurringTransactionService.generateUpcoming(context: modelContext)
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                RecurringTransactionService.generateUpcoming(context: modelContext)
            }
        }
    }
}

#Preview {
    MainTabView()
        .modelContainer(for: [Transaction.self, Category.self, Budget.self, RecurringTransaction.self, Account.self], inMemory: true)
}
