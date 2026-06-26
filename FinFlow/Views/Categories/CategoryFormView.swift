import SwiftUI
import SwiftData

struct CategoryFormView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    let category: Category?

    @State private var name = ""
    @State private var typeRaw: String = CategoryType.expense.rawValue
    @State private var icon: String = "tag.fill"
    @State private var colorHex: String = "#3B82F6"
    @State private var sortOrder: Int = 100

    private var type: CategoryType { CategoryType(rawValue: typeRaw) ?? .expense }

    private let iconChoices = [
        "fork.knife", "car.fill", "bag.fill", "house.fill", "gamecontroller.fill",
        "cross.case.fill", "book.fill", "airplane", "gift.fill", "creditcard.fill",
        "cart.fill", "cup.and.saucer.fill", "phone.fill", "wifi", "bolt.fill",
        "drop.fill", "flame.fill", "pawprint.fill", "heart.fill", "star.fill",
        "dollarsign.circle.fill", "chart.line.uptrend.xyaxis", "briefcase.fill",
        "banknote.fill", "piggybank.fill", "ellipsis.circle.fill"
    ]
    private let colorChoices = [
        "#FF6B35", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6",
        "#6366F1", "#3B82F6", "#06B6D4", "#10B981", "#84CC16",
        "#6B7280", "#0EA5E9"
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("分类名称", text: $name)
                        .foregroundStyle(.textPrimary)
                } header: {
                    Text("名称")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    Picker("类型", selection: $typeRaw) {
                        ForEach(CategoryType.allCases, id: \.self) { t in
                            Text(t.displayName).tag(t.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text("类型")
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
                                    icon == ic ? LinearGradient(colors: [Color(hex: colorHex) ?? .accentBlue, (Color(hex: colorHex) ?? .accentBlue).opacity(0.8)], startPoint: .top, endPoint: .bottom) : LinearGradient(colors: [Color.bgCardElevated], startPoint: .top, endPoint: .bottom),
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
            .navigationTitle(category == nil ? "新建分类" : "编辑分类")
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
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear { configure() }
        }
    }

    private func configure() {
        guard let cat = category else { return }
        name = cat.name
        typeRaw = cat.typeRaw
        icon = cat.icon
        colorHex = cat.colorHex
        sortOrder = cat.sortOrder
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        if let cat = category {
            if !cat.isSystem {
                cat.name = trimmed
            }
            cat.typeRaw = typeRaw
            cat.icon = icon
            cat.colorHex = colorHex
        } else {
            let newCat = Category(name: trimmed, type: type, icon: icon, colorHex: colorHex, sortOrder: sortOrder)
            context.insert(newCat)
        }
        try? context.save()
        dismiss()
    }
}

#Preview {
    CategoryFormView(category: nil)
        .modelContainer(for: [Category.self], inMemory: true)
        .preferredColorScheme(.dark)
}
