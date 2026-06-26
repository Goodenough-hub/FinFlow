import SwiftUI
import SwiftData

struct AccountRechargeView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    let destination: Account

    @Query(sort: [SortDescriptor(\Account.sortOrder)]) private var allAccounts: [Account]
    @State private var amountText = ""
    @State private var note = ""
    @State private var date: Date = .now
    @State private var selectedSourceID: UUID?

    private var sources: [Account] {
        allAccounts.filter { $0.id != destination.id && $0.type != .fixed }
    }

    private var selectedSource: Account? {
        sources.first { $0.id == selectedSourceID }
    }

    private var isSavable: Bool {
        guard let value = Decimal(string: amountText.replacingOccurrences(of: ",", with: ".")), value > 0 else { return false }
        return selectedSource != nil
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    if sources.isEmpty {
                        Text("暂无可选账户")
                            .font(.system(size: 14))
                            .foregroundStyle(.textTertiary)
                    } else {
                        Picker("来源", selection: $selectedSourceID) {
                            ForEach(sources) { acc in
                                HStack {
                                    Image(systemName: acc.icon)
                                    Text(acc.name)
                                }
                                .tag(acc.id as UUID?)
                            }
                        }
                        .foregroundStyle(.textPrimary)
                    }
                } header: {
                    Text("来源账户")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
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
                    Text("充值金额")
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

                if let src = selectedSource {
                    Section {
                        HStack(spacing: 12) {
                            CategoryIcon(systemName: src.icon, color: src.color, size: 36)
                            Image(systemName: "arrow.right")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.textTertiary)
                            CategoryIcon(systemName: destination.icon, color: destination.color, size: 36)
                            Text(destination.name)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(.textPrimary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            .background(Color.bgPrimary.ignoresSafeArea())
            .scrollContentBackground(.hidden)
            .navigationTitle("充值")
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
            .onAppear {
                if selectedSourceID == nil {
                    selectedSourceID = sources.first(where: { $0.type == .alipay })?.id ?? sources.first?.id
                }
            }
        }
    }

    private func save() {
        guard let src = selectedSource,
              let value = Decimal(string: amountText.replacingOccurrences(of: ",", with: ".")),
              value > 0 else { return }
        let tx = Transaction(
            amount: value,
            type: .transfer,
            note: note.isEmpty ? "\(src.name) → \(destination.name)" : note,
            date: date,
            account: src,
            toAccount: destination
        )
        context.insert(tx)
        try? context.save()
        dismiss()
    }
}

#Preview {
    AccountRechargeView(destination: Account(name: "交通卡", type: .transit))
        .modelContainer(for: [Transaction.self, Account.self, Category.self], inMemory: true)
        .preferredColorScheme(.dark)
}
