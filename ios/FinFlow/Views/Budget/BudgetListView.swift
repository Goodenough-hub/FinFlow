import SwiftUI
import SwiftData

struct BudgetListView: View {
    @Environment(\.modelContext) private var context
    @Query private var allBudgets: [Budget]
    @Query(sort: [SortDescriptor(\Category.typeRaw), SortDescriptor(\Category.sortOrder)]) private var allCategories: [Category]
    @Query(sort: [SortDescriptor(\Transaction.date, order: .reverse)]) private var allTransactions: [Transaction]

    @State private var selectedMonth = Date()
    @State private var showingForm = false
    @State private var editingBudget: Budget?

    private var monthBudgets: [Budget] {
        allBudgets.filter { $0.month == selectedMonth.monthValue && $0.year == selectedMonth.yearValue }
    }

    private func spent(for budget: Budget) -> Decimal {
        guard let cat = budget.category else { return 0 }
        return allTransactions
            .filter { $0.category?.id == cat.id && $0.type == .expense && $0.date.isSameMonth(as: selectedMonth) }
            .reduce(0) { $0 + $1.amount }
    }

    private var totalBudget: Decimal {
        monthBudgets.reduce(0) { $0 + $1.amount }
    }

    private var totalSpent: Decimal {
        monthBudgets.reduce(0) { $0 + spent(for: $1) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if monthBudgets.isEmpty {
                    EmptyStateView(
                        systemName: "chart.pie",
                        title: "本月还没有预算",
                        subtitle: "点击右上角 + 为分类设置预算"
                    )
                    .background(Color.bgPrimary.ignoresSafeArea())
                } else {
                    List {
                        Section {
                            BudgetProgressRow(total: totalBudget, spent: totalSpent)
                                .padding(.vertical, 4)
                                .listRowBackground(Color.clear)
                                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        }
                        Section {
                            ForEach(monthBudgets) { budget in
                                Button {
                                    editingBudget = budget
                                    showingForm = true
                                } label: {
                                    BudgetProgressRow(
                                        categoryName: budget.category?.name ?? "未分类",
                                        categoryIcon: budget.category?.icon ?? "tag.fill",
                                        categoryColor: budget.category?.color ?? .gray,
                                        total: budget.amount,
                                        spent: spent(for: budget)
                                    )
                                }
                                .buttonStyle(.plain)
                                .listRowBackground(Color.bgCardElevated)
                                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                                .swipeActions(edge: .trailing) {
                                    Button(role: .destructive) {
                                        context.delete(budget)
                                    } label: {
                                        Label("删除", systemImage: "trash")
                                    }
                                }
                            }
                        } header: {
                            Text("分类预算")
                                .font(.system(size: 12, weight: .semibold))
                                .textCase(.uppercase)
                                .tracking(1)
                                .foregroundStyle(.textTertiary)
                        }
                    }
                    .listStyle(.insetGrouped)
                    .background(Color.bgPrimary.ignoresSafeArea())
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("预算")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    MonthYearPicker(date: $selectedMonth)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        editingBudget = nil
                        showingForm = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.accentBlue)
                    }
                }
            }
            .sheet(isPresented: $showingForm) {
                BudgetFormView(budget: editingBudget, month: selectedMonth)
            }
        }
    }
}

#Preview {
    BudgetListView()
        .modelContainer(for: [Transaction.self, Category.self, Budget.self, RecurringTransaction.self, Account.self], inMemory: true)
        .preferredColorScheme(.dark)
}
