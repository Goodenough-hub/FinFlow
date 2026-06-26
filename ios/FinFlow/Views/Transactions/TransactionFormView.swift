import SwiftUI
import SwiftData

struct TransactionFormView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    let transaction: Transaction?

    @State private var typeRaw: String = TransactionType.expense.rawValue
    @State private var amountText: String = ""
    @State private var note: String = ""
    @State private var date: Date = .now
    @State private var selectedCategoryID: UUID?
    @State private var selectedAccountID: UUID?
    @State private var vendor: String = ""
    @State private var expandedCategoryIDs: Set<UUID> = []

    @Query(sort: [SortDescriptor(\Category.typeRaw), SortDescriptor(\Category.sortOrder)]) private var allCategories: [Category]
    @Query(sort: [SortDescriptor(\Account.sortOrder)]) private var allAccounts: [Account]

    private let vendors = ["高德", "滴滴", "美团", "T3出行", "曹操出行", "其他"]

    private var type: TransactionType { TransactionType(rawValue: typeRaw) ?? .expense }

    private var availableAccounts: [Account] {
        allAccounts.filter { $0.type != .fixed }
    }

    private var parentIDSet: Set<UUID> {
        Set(allCategories.compactMap { $0.parentID })
    }

    private func hasChildren(_ cat: Category) -> Bool {
        parentIDSet.contains(cat.id)
    }

    private var visibleCategories: [(Category, Int)] {
        var result: [(Category, Int)] = []
        func visit(_ parentID: UUID?, depth: Int) {
            let cats = allCategories
                .filter { $0.typeRaw == typeRaw && $0.parentID == parentID }
                .sorted { $0.sortOrder < $1.sortOrder }
            for cat in cats {
                result.append((cat, depth))
                if expandedCategoryIDs.contains(cat.id) {
                    visit(cat.id, depth: depth + 1)
                }
            }
        }
        visit(nil, depth: 0)
        return result
    }

    private var selectedCategory: Category? {
        allCategories.first { $0.id == selectedCategoryID }
    }

    private var showVendorPicker: Bool {
        selectedCategory?.name == "打车"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("类型", selection: $typeRaw) {
                        ForEach([TransactionType.expense, .income], id: \.self) { t in
                            Text(t.displayName).tag(t.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: typeRaw) { _, _ in
                        selectedCategoryID = nil
                        expandedCategoryIDs.removeAll()
                    }
                }

                Section {
                    HStack(spacing: 6) {
                        Text("¥")
                            .font(.system(size: 24, weight: .semibold, design: .rounded))
                            .foregroundStyle(.textTertiary)
                        TextField("0.00", text: $amountText)
                            .keyboardType(.decimalPad)
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.textPrimary)
                            .multilineTextAlignment(.leading)
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("金额")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    if visibleCategories.isEmpty {
                        Text("暂无分类，请先在设置中创建")
                            .font(.system(size: 14))
                            .foregroundStyle(.textTertiary)
                    } else {
                        LazyVStack(alignment: .leading, spacing: 4) {
                            ForEach(visibleCategories, id: \.0.id) { (cat, depth) in
                                HStack(spacing: 10) {
                                    if depth > 0 {
                                        Spacer().frame(width: CGFloat(depth) * 20)
                                        Image(systemName: "ellipsis")
                                            .font(.system(size: 10))
                                            .foregroundStyle(.textTertiary)
                                    }
                                    CategoryIcon(systemName: cat.icon, color: cat.color, size: 32)
                                    Text(cat.name)
                                        .font(.system(size: 14, weight: selectedCategoryID == cat.id ? .semibold : .medium))
                                        .foregroundStyle(selectedCategoryID == cat.id ? .accentBlue : .textPrimary)
                                    Spacer()
                                    if hasChildren(cat) {
                                        Image(systemName: expandedCategoryIDs.contains(cat.id) ? "chevron.down" : "chevron.right")
                                            .font(.system(size: 11, weight: .bold))
                                            .foregroundStyle(.textTertiary)
                                    }
                                }
                                .padding(.vertical, 8)
                                .padding(.horizontal, 10)
                                .background(
                                    selectedCategoryID == cat.id ? Color.accentBlue.opacity(0.15) : Color.clear,
                                    in: RoundedRectangle(cornerRadius: 10)
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(selectedCategoryID == cat.id ? Color.accentBlue : .clear, lineWidth: 1.5)
                                )
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    if hasChildren(cat) {
                                        if expandedCategoryIDs.contains(cat.id) {
                                            expandedCategoryIDs.remove(cat.id)
                                        } else {
                                            expandedCategoryIDs.insert(cat.id)
                                        }
                                    } else {
                                        selectedCategoryID = cat.id
                                    }
                                }
                            }
                        }
                        if showVendorPicker {
                            Picker("打车 App", selection: $vendor) {
                                ForEach(vendors, id: \.self) { v in
                                    Text(v).tag(v)
                                }
                            }
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
                    DatePicker("日期", selection: $date, displayedComponents: [.date, .hourAndMinute])
                        .foregroundStyle(.textPrimary)
                } header: {
                    Text("日期")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    if availableAccounts.isEmpty {
                        Text("暂无账户，请先在资产页创建")
                            .font(.system(size: 14))
                            .foregroundStyle(.textTertiary)
                    } else {
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
                            ForEach(availableAccounts) { acc in
                                Button {
                                    selectedAccountID = acc.id
                                } label: {
                                    VStack(spacing: 6) {
                                        CategoryIcon(systemName: acc.icon, color: acc.color, size: 40)
                                        Text(acc.name)
                                            .font(.system(size: 11, weight: .medium))
                                            .foregroundStyle(.textPrimary)
                                            .lineLimit(1)
                                    }
                                    .padding(.vertical, 8)
                                    .padding(.horizontal, 4)
                                    .frame(maxWidth: .infinity)
                                    .background(
                                        selectedAccountID == acc.id ? Color.accentBlue.opacity(0.15) : Color.bgCardElevated,
                                        in: RoundedRectangle(cornerRadius: 12)
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(selectedAccountID == acc.id ? Color.accentBlue : Color.clear, lineWidth: 1.5)
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                } header: {
                    Text("账户")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    TextField("可选", text: $note, axis: .vertical)
                        .lineLimit(2...4)
                        .foregroundStyle(.textPrimary)
                } header: {
                    Text("备注")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                if transaction != nil {
                    Section {
                        Button(role: .destructive) {
                            delete()
                        } label: {
                            Text("删除此交易")
                                .frame(maxWidth: .infinity)
                                .font(.system(size: 15, weight: .medium))
                        }
                    }
                }
            }
            .background(Color.bgPrimary.ignoresSafeArea())
            .scrollContentBackground(.hidden)
            .navigationTitle(transaction == nil ? "记一笔" : "编辑")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("取消") { dismiss() }
                        .foregroundStyle(.textSecondary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("保存") {
                        save()
                    }
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.accentBlue)
                    .disabled(!isSavable)
                }
            }
            .onAppear { configure() }
        }
    }

    private var isSavable: Bool {
        let amount = Decimal(string: amountText.replacingOccurrences(of: ",", with: "."))
        guard let a = amount, a > 0 else { return false }
        return selectedCategoryID != nil
    }

    private func configure() {
        guard let tx = transaction else {
            selectedAccountID = availableAccounts.first?.id
            return
        }
        typeRaw = tx.typeRaw
        amountText = tx.plainAmount
        note = tx.note
        date = tx.date
        selectedCategoryID = tx.category?.id
        selectedAccountID = tx.account?.id ?? availableAccounts.first?.id
        vendor = tx.vendor ?? ""
    }

    private func save() {
        guard let raw = amountText.replacingOccurrences(of: ",", with: ".") as String?,
              let value = Decimal(string: raw), value > 0,
              let catID = selectedCategoryID,
              let category = allCategories.first(where: { $0.id == catID }) else { return }

        let account = selectedAccountID.flatMap { id in availableAccounts.first { $0.id == id } }
        let vendorValue = showVendorPicker && !vendor.isEmpty ? vendor : nil

        if let tx = transaction {
            tx.amount = value
            tx.typeRaw = typeRaw
            tx.note = note
            tx.date = date
            tx.category = category
            tx.account = account
            tx.vendor = vendorValue
        } else {
            let tx = Transaction(amount: value, type: type, note: note, date: date, category: category, account: account, vendor: vendorValue)
            context.insert(tx)
        }
        try? context.save()
        dismiss()
    }

    private func delete() {
        guard let tx = transaction else { return }
        context.delete(tx)
        try? context.save()
        dismiss()
    }
}

private extension Transaction {
    var plainAmount: String {
        "\(amount)"
    }
}

#Preview {
    TransactionFormView(transaction: nil)
        .modelContainer(for: [Transaction.self, Category.self], inMemory: true)
        .preferredColorScheme(.dark)
}
