import SwiftUI
import SwiftData

struct AccountFormView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    let account: Account?

    @State private var name = ""
    @State private var typeRaw: String = AccountType.alipay.rawValue
    @State private var initialBalanceText: String = "0"
    @State private var icon: String = AccountType.alipay.defaultIcon
    @State private var colorHex: String = AccountType.alipay.defaultColorHex

    private let colorChoices = [
        "#1677FF", "#07C160", "#E60012", "#F59E0B",
        "#FF6B35", "#8B5CF6", "#6366F1", "#10B981",
        "#EF4444", "#06B6D4", "#EC4899", "#6B7280",
    ]
    private let iconChoices = [
        "a.circle.fill", "message.fill", "c.circle.fill", "safe.fill",
        "creditcard.fill", "banknote.fill", "dollarsign.circle.fill",
        "wallet.pass.fill", "building.columns.fill", "piggybank.fill",
        "bag.fill", "gift.fill",
    ]

    private var type: AccountType { AccountType(rawValue: typeRaw) ?? .other }
    private var isEditing: Bool { account != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("类型", selection: $typeRaw) {
                        ForEach(AccountType.allCases, id: \.self) { t in
                            Text(t.displayName).tag(t.rawValue)
                        }
                    }
                    .foregroundStyle(.textPrimary)
                    .onChange(of: typeRaw) { _, newValue in
                        let t = AccountType(rawValue: newValue) ?? .other
                        icon = t.defaultIcon
                        colorHex = t.defaultColorHex
                        if name.isEmpty || AccountType.allCases.contains(where: { $0.displayName == name }) {
                            name = t.displayName
                        }
                    }
                } header: {
                    Text("账户类型")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    TextField("账户名称", text: $name)
                        .foregroundStyle(.textPrimary)
                } header: {
                    Text("名称")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    HStack(spacing: 6) {
                        Text("¥")
                            .font(.system(size: 20, weight: .semibold, design: .rounded))
                            .foregroundStyle(.textTertiary)
                        TextField("0.00", text: $initialBalanceText)
                            .keyboardType(.decimalPad)
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.textPrimary)
                    }
                    .padding(.vertical, 2)
                } header: {
                    Text("初始余额")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 12) {
                        ForEach(iconChoices, id: \.self) { ic in
                            Image(systemName: ic)
                                .font(.system(size: 18))
                                .foregroundStyle(icon == ic ? .white : .textSecondary)
                                .frame(width: 44, height: 44)
                                .background(
                                    icon == ic ? LinearGradient(colors: [Color.accentBlue, Color(hex: "#3B6FD8") ?? .blue], startPoint: .top, endPoint: .bottom) : LinearGradient(colors: [Color.bgCardElevated], startPoint: .top, endPoint: .bottom),
                                    in: RoundedRectangle(cornerRadius: 10)
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(icon == ic ? Color.clear : Color.cardBorder, lineWidth: 0.5)
                                )
                                .onTapGesture { icon = ic }
                        }
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("图标")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 12) {
                        ForEach(colorChoices, id: \.self) { hex in
                            Circle()
                                .fill(Color(hex: hex) ?? .blue)
                                .frame(width: 32, height: 32)
                                .overlay(
                                    Circle()
                                        .stroke(.white, lineWidth: colorHex == hex ? 3 : 0)
                                        .frame(width: 38, height: 38)
                                )
                                .shadow(color: Color(hex: hex)?.opacity(0.4) ?? .clear, radius: colorHex == hex ? 4 : 0)
                                .onTapGesture { colorHex = hex }
                        }
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("颜色")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }
            }
            .background(Color.bgPrimary.ignoresSafeArea())
            .scrollContentBackground(.hidden)
            .navigationTitle(isEditing ? "编辑账户" : "新建账户")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("取消") { dismiss() }
                        .foregroundStyle(.textSecondary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("保存") { save() }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.accentBlue)
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear { configure() }
        }
    }

    private func configure() {
        guard let acc = account else {
            name = type.displayName
            return
        }
        name = acc.name
        typeRaw = acc.typeRaw
        initialBalanceText = "\(acc.initialBalance)"
        icon = acc.icon
        colorHex = acc.colorHex
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        let balance = Decimal(string: initialBalanceText.replacingOccurrences(of: ",", with: ".")) ?? 0

        if let acc = account {
            if !acc.isSystem {
                acc.name = trimmed
            }
            acc.typeRaw = typeRaw
            acc.initialBalance = balance
            acc.icon = icon
            acc.colorHex = colorHex
        } else {
            let new = Account(
                name: trimmed,
                type: type,
                initialBalance: balance,
                icon: icon,
                colorHex: colorHex,
                sortOrder: 100
            )
            context.insert(new)
        }
        try? context.save()
        dismiss()
    }
}

#Preview {
    AccountFormView(account: nil)
        .modelContainer(for: [Account.self], inMemory: true)
        .preferredColorScheme(.dark)
}
