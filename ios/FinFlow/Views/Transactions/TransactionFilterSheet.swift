import SwiftUI
import SwiftData

struct TransactionFilterSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Query(sort: [SortDescriptor(\Category.typeRaw), SortDescriptor(\Category.sortOrder)]) private var allCategories: [Category]
    @Query(sort: [SortDescriptor(\Account.sortOrder)]) private var allAccounts: [Account]

    @Binding var criteria: TransactionFilterCriteria

    @State private var useDateRange: Bool
    @State private var useAmountRange: Bool
    @State private var useType: Bool
    @State private var useNote: Bool

    @State private var startDate: Date
    @State private var endDate: Date
    @State private var minAmountText: String
    @State private var maxAmountText: String
    @State private var typeRaw: String
    @State private var noteText: String
    @State private var categoryIDs: Set<UUID>
    @State private var accountIDs: Set<UUID>

    init(criteria: Binding<TransactionFilterCriteria>) {
        self._criteria = criteria
        let c = criteria.wrappedValue
        _useDateRange = State(initialValue: c.startDate != nil || c.endDate != nil)
        _useAmountRange = State(initialValue: c.minAmount != nil || c.maxAmount != nil)
        _useType = State(initialValue: c.type != nil)
        _useNote = State(initialValue: c.noteContains != nil)
        _startDate = State(initialValue: c.startDate ?? Date().startOfMonth)
        _endDate = State(initialValue: c.endDate ?? Date())
        _minAmountText = State(initialValue: c.minAmount.map { "\($0)" } ?? "")
        _maxAmountText = State(initialValue: c.maxAmount.map { "\($0)" } ?? "")
        _typeRaw = State(initialValue: c.type?.rawValue ?? TransactionType.expense.rawValue)
        _noteText = State(initialValue: c.noteContains ?? "")
        _categoryIDs = State(initialValue: c.categoryIDs)
        _accountIDs = State(initialValue: c.accountIDs)
    }

    var body: some View {
        NavigationStack {
            Form {
                dateSection
                amountSection
                typeSection
                categorySection
                accountSection
                noteSection
            }
            .background(Color.bgPrimary.ignoresSafeArea())
            .scrollContentBackground(.hidden)
            .navigationTitle("筛选")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("重置") { reset() }
                        .foregroundStyle(.textSecondary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") { apply() }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.accentBlue)
                }
            }
        }
    }

    private var dateSection: some View {
        Section {
            Toggle("按日期范围", isOn: $useDateRange)
                .foregroundStyle(.textPrimary)
            if useDateRange {
                DatePicker("开始", selection: $startDate, displayedComponents: .date)
                    .foregroundStyle(.textPrimary)
                DatePicker("结束", selection: $endDate, in: startDate..., displayedComponents: .date)
                    .foregroundStyle(.textPrimary)
            }
        }
    }

    private var amountSection: some View {
        Section {
            Toggle("按金额范围", isOn: $useAmountRange)
                .foregroundStyle(.textPrimary)
            if useAmountRange {
                HStack {
                    Text("最小")
                        .foregroundStyle(.textSecondary)
                    TextField("0", text: $minAmountText)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .foregroundStyle(.textPrimary)
                }
                HStack {
                    Text("最大")
                        .foregroundStyle(.textSecondary)
                    TextField("0", text: $maxAmountText)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .foregroundStyle(.textPrimary)
                }
            }
        }
    }

    private var typeSection: some View {
        Section {
            Toggle("按类型", isOn: $useType)
                .foregroundStyle(.textPrimary)
            if useType {
                Picker("类型", selection: $typeRaw) {
                    ForEach(TransactionType.allCases, id: \.self) { t in
                        Text(t.displayName).tag(t.rawValue)
                    }
                }
                .pickerStyle(.segmented)
            }
        }
    }

    private var categorySection: some View {
        Section {
            if allCategories.isEmpty {
                Text("暂无分类")
                    .font(.system(size: 14))
                    .foregroundStyle(.textTertiary)
            } else {
                ForEach(allCategories) { cat in
                    Button {
                        toggle(cat.id, in: &categoryIDs)
                    } label: {
                        HStack(spacing: 12) {
                            CategoryIcon(systemName: cat.icon, color: cat.color, size: 28)
                            Text(cat.name)
                                .foregroundStyle(.textPrimary)
                            Spacer()
                            if categoryIDs.contains(cat.id) {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(.accentBlue)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        } header: {
            Text("分类")
                .font(.system(size: 12, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1)
                .foregroundStyle(.textTertiary)
        }
    }

    private var accountSection: some View {
        Section {
            if allAccounts.isEmpty {
                Text("暂无账户")
                    .font(.system(size: 14))
                    .foregroundStyle(.textTertiary)
            } else {
                ForEach(allAccounts) { acc in
                    Button {
                        toggle(acc.id, in: &accountIDs)
                    } label: {
                        HStack(spacing: 12) {
                            CategoryIcon(systemName: acc.icon, color: acc.color, size: 28)
                            Text(acc.name)
                                .foregroundStyle(.textPrimary)
                            Spacer()
                            if accountIDs.contains(acc.id) {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(.accentBlue)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        } header: {
            Text("账户")
                .font(.system(size: 12, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1)
                .foregroundStyle(.textTertiary)
        }
    }

    private var noteSection: some View {
        Section {
            Toggle("按备注", isOn: $useNote)
                .foregroundStyle(.textPrimary)
            if useNote {
                TextField("包含文字", text: $noteText)
                    .foregroundStyle(.textPrimary)
            }
        }
    }

    private func toggle(_ id: UUID, in set: inout Set<UUID>) {
        if set.contains(id) { set.remove(id) } else { set.insert(id) }
    }

    private func reset() {
        useDateRange = false
        useAmountRange = false
        useType = false
        useNote = false
        minAmountText = ""
        maxAmountText = ""
        noteText = ""
        categoryIDs.removeAll()
        accountIDs.removeAll()
    }

    private func apply() {
        var c = TransactionFilterCriteria()
        if useDateRange {
            c.startDate = startDate
            c.endDate = Calendar.current.date(bySettingHour: 23, minute: 59, second: 59, of: endDate) ?? endDate
        }
        if useAmountRange {
            c.minAmount = Decimal(string: minAmountText.replacingOccurrences(of: ",", with: "."))
            c.maxAmount = Decimal(string: maxAmountText.replacingOccurrences(of: ",", with: "."))
        }
        if useType {
            c.type = TransactionType(rawValue: typeRaw)
        }
        if useNote {
            c.noteContains = noteText
        }
        c.categoryIDs = categoryIDs
        c.accountIDs = accountIDs
        criteria = c
        dismiss()
    }
}

#Preview {
    TransactionFilterSheet(criteria: .constant(TransactionFilterCriteria()))
        .modelContainer(for: [Transaction.self, Category.self, Account.self], inMemory: true)
        .preferredColorScheme(.dark)
}
