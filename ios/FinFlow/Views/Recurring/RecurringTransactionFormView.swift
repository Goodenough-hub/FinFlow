import SwiftUI
import SwiftData

struct RecurringTransactionFormView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    let recurring: RecurringTransaction?

    @State private var typeRaw: String = TransactionType.expense.rawValue
    @State private var amountText: String = ""
    @State private var note: String = ""
    @State private var frequency: RecurrenceFrequency = .monthly
    @State private var interval: Int = 1
    @State private var dayOfMonth: Int = 1
    @State private var dayOfWeek: Int = 1
    @State private var startDate: Date = .now
    @State private var hasEndDate: Bool = false
    @State private var endDate: Date = Calendar.current.date(byAdding: .month, value: 12, to: .now) ?? .now
    @State private var selectedCategoryID: UUID?
    @State private var selectedAccountID: UUID?

    @Query(sort: [SortDescriptor(\Category.typeRaw), SortDescriptor(\Category.sortOrder)]) private var allCategories: [Category]
    @Query(sort: [SortDescriptor(\Account.sortOrder)]) private var allAccounts: [Account]

    private var type: TransactionType { TransactionType(rawValue: typeRaw) ?? .expense }
    private var availableCategories: [Category] { allCategories.filter { $0.typeRaw == typeRaw } }
    private var isEditing: Bool { recurring != nil }

    var body: some View {
        NavigationStack {
            Form {
                section("类型") {
                    Picker("类型", selection: $typeRaw) {
                        ForEach(TransactionType.allCases, id: \.self) { t in
                            Text(t.displayName).tag(t.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: typeRaw) { _, _ in
                        selectedCategoryID = availableCategories.first?.id
                    }
                }

                section("金额") {
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
                }

                section("分类") {
                    if availableCategories.isEmpty {
                        Text("暂无分类")
                            .font(.system(size: 14))
                            .foregroundStyle(.textTertiary)
                    } else {
                        Picker("分类", selection: $selectedCategoryID) {
                            ForEach(availableCategories) { cat in
                                Text(cat.name).tag(Optional(cat.id))
                            }
                        }
                        .foregroundStyle(.textPrimary)
                    }
                }

                section("账户") {
                    if allAccounts.isEmpty {
                        Text("暂无账户")
                            .font(.system(size: 14))
                            .foregroundStyle(.textTertiary)
                    } else {
                        Picker("账户", selection: $selectedAccountID) {
                            Text("不指定").tag(UUID?.none)
                            ForEach(allAccounts) { acc in
                                Text(acc.name).tag(Optional(acc.id))
                            }
                        }
                        .foregroundStyle(.textPrimary)
                    }
                }

                section("频率") {
                    Picker("频率", selection: $frequency) {
                        ForEach(RecurrenceFrequency.allCases, id: \.self) { f in
                            Text(f.displayName).tag(f)
                        }
                    }
                    Stepper("每 \(interval) \(frequency.unitName)", value: $interval, in: 1...365)
                        .foregroundStyle(.textPrimary)
                    if frequency == .monthly {
                        Stepper("每月 \(dayOfMonth) 号", value: $dayOfMonth, in: 1...28)
                            .foregroundStyle(.textPrimary)
                    } else if frequency == .weekly {
                        Picker("周几", selection: $dayOfWeek) {
                            ForEach(1...7, id: \.self) { d in
                                Text(weekdayName(d)).tag(d)
                            }
                        }
                        .foregroundStyle(.textPrimary)
                    }
                }

                section("起止时间") {
                    DatePicker("开始日期", selection: $startDate, displayedComponents: .date)
                        .foregroundStyle(.textPrimary)
                    Toggle("有结束日期", isOn: $hasEndDate)
                        .foregroundStyle(.textPrimary)
                    if hasEndDate {
                        DatePicker("结束日期", selection: $endDate, in: startDate..., displayedComponents: .date)
                            .foregroundStyle(.textPrimary)
                    }
                }

                section("备注") {
                    TextField("可选", text: $note, axis: .vertical)
                        .lineLimit(2...4)
                        .foregroundStyle(.textPrimary)
                }
            }
            .background(Color.bgPrimary.ignoresSafeArea())
            .scrollContentBackground(.hidden)
            .navigationTitle(isEditing ? "编辑周期账单" : "新建周期账单")
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

    @ViewBuilder
    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        Section {
            content()
        } header: {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1)
                .foregroundStyle(.textTertiary)
        }
    }

    private var isSavable: Bool {
        guard let value = Decimal(string: amountText.replacingOccurrences(of: ",", with: ".")), value > 0 else { return false }
        return selectedCategoryID != nil
    }

    private func configure() {
        guard let r = recurring else {
            selectedCategoryID = availableCategories.first?.id
            selectedAccountID = nil
            return
        }
        typeRaw = r.typeRaw
        amountText = "\(r.amount)"
        note = r.note
        startDate = r.startDate
        hasEndDate = r.endDate != nil
        if let end = r.endDate { endDate = end }
        selectedCategoryID = r.category?.id
        selectedAccountID = r.account?.id
        if let rule = r.recurrenceRule {
            frequency = rule.frequency
            interval = rule.interval
            dayOfMonth = rule.dayOfMonth ?? 1
            dayOfWeek = rule.dayOfWeek ?? 1
        }
    }

    private func save() {
        guard let raw = amountText.replacingOccurrences(of: ",", with: ".") as String?,
              let value = Decimal(string: raw), value > 0,
              let catID = selectedCategoryID,
              let category = availableCategories.first(where: { $0.id == catID }) else { return }

        let rule = RecurrenceRule(
            frequency: frequency,
            interval: interval,
            dayOfMonth: frequency == .monthly ? dayOfMonth : nil,
            dayOfWeek: frequency == .weekly ? dayOfWeek : nil
        )

        if let r = recurring {
            r.amount = value
            r.typeRaw = typeRaw
            r.note = note
            r.startDate = startDate
            r.endDate = hasEndDate ? endDate : nil
            r.category = category
            r.account = selectedAccountID.flatMap { id in allAccounts.first { $0.id == id } }
            r.updateRule(rule)
            r.lastGeneratedDate = nil
            RecurringTransactionService.removeFutureInstances(for: r.id, context: context)
        } else {
            let account = selectedAccountID.flatMap { id in allAccounts.first { $0.id == id } }
            let new = RecurringTransaction(
                amount: value,
                type: type,
                note: note,
                rule: rule,
                startDate: startDate,
                endDate: hasEndDate ? endDate : nil,
                category: category,
                account: account
            )
            context.insert(new)
        }
        try? context.save()
        RecurringTransactionService.generateUpcoming(context: context)
        dismiss()
    }

    private func weekdayName(_ d: Int) -> String {
        let symbols = Calendar.current.shortWeekdaySymbols
        let idx = (d - 1 + Calendar.current.firstWeekday - 1) % 7
        return symbols[(idx + 7) % 7]
    }
}

private extension RecurrenceFrequency {
    var unitName: String {
        switch self {
        case .daily: return "天"
        case .weekly: return "周"
        case .monthly: return "月"
        case .yearly: return "年"
        }
    }
}

#Preview {
    RecurringTransactionFormView(recurring: nil)
        .modelContainer(for: [Category.self, RecurringTransaction.self, Transaction.self, Account.self], inMemory: true)
        .preferredColorScheme(.dark)
}
