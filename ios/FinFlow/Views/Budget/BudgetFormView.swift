import SwiftUI
import SwiftData

struct BudgetFormView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    let budget: Budget?
    let month: Date

    @State private var amountText: String = ""
    @State private var selectedCategoryID: UUID?

    @Query(sort: [SortDescriptor(\Category.sortOrder)]) private var allCategories: [Category]

    private var expenseCategories: [Category] {
        allCategories.filter { $0.type == .expense }
    }

    private var isEditing: Bool { budget != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    if expenseCategories.isEmpty {
                        Text("暂无支出分类")
                            .font(.system(size: 14))
                            .foregroundStyle(.textTertiary)
                    } else {
                        ForEach(expenseCategories) { cat in
                            HStack(spacing: 12) {
                                CategoryIcon(systemName: cat.icon, color: cat.color, size: 32)
                                Text(cat.name)
                                    .font(.system(size: 14, weight: selectedCategoryID == cat.id ? .semibold : .medium))
                                    .foregroundStyle(selectedCategoryID == cat.id ? .accentBlue : .textPrimary)
                                Spacer()
                                if selectedCategoryID == cat.id {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundStyle(.accentBlue)
                                }
                            }
                            .padding(.vertical, 6)
                            .contentShape(Rectangle())
                            .onTapGesture { selectedCategoryID = cat.id }
                        }
                    }
                } header: {
                    Text("分类")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    HStack(spacing: 6) {
                        Text("¥")
                            .font(.system(size: 22, weight: .semibold, design: .rounded))
                            .foregroundStyle(.textTertiary)
                        TextField("0.00", text: $amountText)
                            .keyboardType(.decimalPad)
                            .font(.system(size: 26, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.textPrimary)
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("预算金额")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    Text("适用于：\(month.monthYearString)")
                        .font(.system(size: 13))
                        .foregroundStyle(.textTertiary)
                }
            }
            .background(Color.bgPrimary.ignoresSafeArea())
            .scrollContentBackground(.hidden)
            .navigationTitle(isEditing ? "编辑预算" : "新建预算")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("取消") { dismiss() }
                        .foregroundStyle(.textSecondary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("保存") { save() }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.accentBlue)
                        .disabled(!isSavable)
                }
            }
            .onAppear { configure() }
        }
    }

    private var isSavable: Bool {
        guard let value = Decimal(string: amountText.replacingOccurrences(of: ",", with: ".")), value > 0 else { return false }
        return selectedCategoryID != nil
    }

    private func configure() {
        if let budget = budget {
            amountText = "\(budget.amount)"
            selectedCategoryID = budget.category?.id
        } else {
            selectedCategoryID = expenseCategories.first?.id
        }
    }

    private func save() {
        guard let raw = amountText.replacingOccurrences(of: ",", with: ".") as String?,
              let value = Decimal(string: raw), value > 0,
              let catID = selectedCategoryID,
              let category = expenseCategories.first(where: { $0.id == catID }) else { return }

        if let budget = budget {
            budget.amount = value
            budget.category = category
        } else {
            let newBudget = Budget(amount: value, month: month.monthValue, year: month.yearValue, category: category)
            context.insert(newBudget)
        }
        try? context.save()
        dismiss()
    }
}

#Preview {
    BudgetFormView(budget: nil, month: .now)
        .modelContainer(for: [Category.self, Budget.self], inMemory: true)
        .preferredColorScheme(.dark)
}
