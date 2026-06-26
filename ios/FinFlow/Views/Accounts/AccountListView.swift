import SwiftUI
import SwiftData

struct AccountListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: [SortDescriptor(\Account.sortOrder)]) private var accounts: [Account]
    @Query(sort: [SortDescriptor(\Transaction.date, order: .reverse)]) private var allTransactions: [Transaction]

    @State private var showingForm = false
    @State private var editingAccount: Account?

    private func balance(for account: Account) -> Decimal {
        Account.balance(for: account, in: allTransactions)
    }

    private var totalBalance: Decimal {
        accounts.reduce(0) { $0 + balance(for: $1) }
    }

    private var groupedAccounts: [(type: AccountType, items: [Account])] {
        let groups = Dictionary(grouping: accounts) { $0.type }
        return AccountType.allCases
            .compactMap { type in
                let items = (groups[type] ?? []).sorted { $0.sortOrder < $1.sortOrder }
                return items.isEmpty ? nil : (type, items)
            }
    }

    var body: some View {
        NavigationStack {
            Group {
                if accounts.isEmpty {
                    EmptyStateView(
                        systemName: "creditcard",
                        title: "还没有账户",
                        subtitle: "点击右上角 + 创建账户"
                    )
                    .background(Color.bgPrimary.ignoresSafeArea())
                } else {
                    List {
                        Section {
                            HStack(spacing: 8) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("总资产")
                                        .font(.system(size: 11, weight: .semibold))
                                        .textCase(.uppercase)
                                        .tracking(1)
                                        .foregroundStyle(.textTertiary)
                                    Text(totalBalance.asCurrency)
                                        .font(.system(size: 28, weight: .bold, design: .rounded))
                                        .monospacedDigit()
                                        .foregroundStyle(.textPrimary)
                                }
                                Spacer()
                            }
                            .padding(.vertical, 8)
                            .listRowBackground(Color.clear)
                            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                        }
                        ForEach(groupedAccounts, id: \.type) { group in
                            Section {
                                ForEach(group.items) { account in
                                    NavigationLink {
                                        AccountDetailView(account: account)
                                    } label: {
                                        AccountRowView(account: account, balance: balance(for: account))
                                    }
                                    .listRowBackground(Color.bgCardElevated)
                                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                                    .swipeActions(edge: .trailing) {
                                        if !account.isSystem {
                                            Button(role: .destructive) {
                                                context.delete(account)
                                                try? context.save()
                                            } label: {
                                                Label("删除", systemImage: "trash")
                                            }
                                        }
                                        Button {
                                            editingAccount = account
                                            showingForm = true
                                        } label: {
                                            Label("编辑", systemImage: "pencil")
                                        }
                                        .tint(.accentBlue)
                                    }
                                }
                            } header: {
                                Text(group.type.displayName)
                                    .font(.system(size: 12, weight: .semibold))
                                    .textCase(.uppercase)
                                    .tracking(1)
                                    .foregroundStyle(.textTertiary)
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                    .background(Color.bgPrimary.ignoresSafeArea())
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("资产")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        editingAccount = nil
                        showingForm = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.accentBlue)
                    }
                }
            }
            .sheet(isPresented: $showingForm) {
                AccountFormView(account: editingAccount)
            }
        }
    }
}

struct AccountRowView: View {
    let account: Account
    let balance: Decimal

    var body: some View {
        HStack(spacing: 12) {
            CategoryIcon(systemName: account.icon, color: account.color, size: 40)
            VStack(alignment: .leading, spacing: 3) {
                Text(account.name)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.textPrimary)
                Text(account.type.displayName)
                    .font(.system(size: 11))
                    .foregroundStyle(.textTertiary)
            }
            Spacer()
            Text(balance.asCurrency)
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(balance >= 0 ? .textPrimary : .overspendRed)
        }
        .padding(.vertical, 6)
    }
}

#Preview {
    AccountListView()
        .modelContainer(for: [Account.self, Transaction.self, Category.self], inMemory: true)
        .preferredColorScheme(.dark)
}
