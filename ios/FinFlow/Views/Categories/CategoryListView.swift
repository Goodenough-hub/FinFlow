import SwiftUI
import SwiftData

struct CategoryListView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: [SortDescriptor(\Category.typeRaw), SortDescriptor(\Category.sortOrder)]) private var categories: [Category]
    @State private var showingForm = false
    @State private var editingCategory: Category?
    @State private var expandedIDs: Set<UUID> = []
    @State private var editMode: EditMode = .inactive

    private var expenseParents: [Category] {
        categories.filter { $0.type == .expense && $0.parentID == nil }
    }
    private var incomeParents: [Category] {
        categories.filter { $0.type == .income && $0.parentID == nil }
    }

    private func children(of id: UUID) -> [Category] {
        categories.filter { $0.parentID == id }.sorted { $0.sortOrder < $1.sortOrder }
    }

    private func hasChildren(_ id: UUID) -> Bool {
        categories.contains { $0.parentID == id }
    }

    var body: some View {
        List {
            Section {
                ForEach(expenseParents) { cat in
                    nodeRow(cat, depth: 0)
                    if expandedIDs.contains(cat.id) {
                        CategorySubtree(
                            parentID: cat.id,
                            depth: 1,
                            categories: categories,
                            expandedIDs: $expandedIDs,
                            editMode: $editMode,
                            onTapLeaf: { cat in
                                editingCategory = cat
                                showingForm = true
                            },
                            onDelete: deleteCategory,
                            onMove: { parentID, source, dest in
                                moveSiblings(parentID: parentID, type: nil, from: source, to: dest)
                            }
                        )
                    }
                }
                .onMove { indices, dest in
                    moveSiblings(parentID: nil, type: .expense, from: indices, to: dest)
                }
            } header: {
                Text("支出")
                    .font(.system(size: 12, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(.textTertiary)
            }

            Section {
                ForEach(incomeParents) { cat in
                    nodeRow(cat, depth: 0)
                    if expandedIDs.contains(cat.id) {
                        CategorySubtree(
                            parentID: cat.id,
                            depth: 1,
                            categories: categories,
                            expandedIDs: $expandedIDs,
                            editMode: $editMode,
                            onTapLeaf: { cat in
                                editingCategory = cat
                                showingForm = true
                            },
                            onDelete: deleteCategory,
                            onMove: { parentID, source, dest in
                                moveSiblings(parentID: parentID, type: nil, from: source, to: dest)
                            }
                        )
                    }
                }
                .onMove { indices, dest in
                    moveSiblings(parentID: nil, type: .income, from: indices, to: dest)
                }
            } header: {
                Text("收入")
                    .font(.system(size: 12, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(.textTertiary)
            }
        }
        .listStyle(.insetGrouped)
        .background(Color.bgPrimary.ignoresSafeArea())
        .scrollContentBackground(.hidden)
        .environment(\.editMode, $editMode)
        .navigationTitle("分类管理")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    withAnimation { editMode = (editMode == .active ? .inactive : .active) }
                } label: {
                    Text(editMode == .active ? "完成" : "排序")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.accentBlue)
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    editingCategory = nil
                    showingForm = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.accentBlue)
                }
            }
        }
        .sheet(isPresented: $showingForm) {
            CategoryFormView(category: editingCategory)
        }
    }

    @ViewBuilder
    private func nodeRow(_ cat: Category, depth: Int) -> some View {
        Button {
            if hasChildren(cat.id) {
                withAnimation(.easeInOut(duration: 0.25)) {
                    if expandedIDs.contains(cat.id) {
                        expandedIDs.remove(cat.id)
                    } else {
                        expandedIDs.insert(cat.id)
                    }
                }
            } else {
                editingCategory = cat
                showingForm = true
            }
        } label: {
            HStack(spacing: 10) {
                if depth > 0 {
                    Spacer().frame(width: CGFloat(depth) * 20)
                    Image(systemName: "ellipsis")
                        .font(.system(size: 10))
                        .foregroundStyle(.textTertiary)
                }
                CategoryIcon(systemName: cat.icon, color: cat.color, size: 32)
                Text(cat.name)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.textPrimary)
                Spacer()
                if cat.isSystem {
                    systemBadge
                }
                if hasChildren(cat.id) {
                    Image(systemName: expandedIDs.contains(cat.id) ? "chevron.down" : "chevron.right")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.textTertiary)
                        .padding(.leading, 6)
                }
            }
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .listRowBackground(depth == 0 ? Color.bgCardElevated : Color.bgCardElevated.opacity(0.5))
        .swipeActions(edge: .trailing) {
            if !cat.isSystem {
                Button(role: .destructive) {
                    deleteCategory(cat)
                } label: {
                    Label("删除", systemImage: "trash")
                }
            }
        }
    }

    private var systemBadge: some View {
        Text("系统")
            .font(.system(size: 10, weight: .semibold))
            .textCase(.uppercase)
            .tracking(0.6)
            .foregroundStyle(.textTertiary)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Color.bgPrimary, in: Capsule())
    }

    private func deleteCategory(_ cat: Category) {
        let childrenIDs = categories.filter { $0.parentID == cat.id }.map(\.id)
        for cid in childrenIDs {
            if let child = categories.first(where: { $0.id == cid }) {
                deleteCategory(child)
            }
        }
        context.delete(cat)
        try? context.save()
    }

    private func moveSiblings(parentID: UUID?, type: CategoryType?, from source: IndexSet, to destination: Int) {
        let siblings: [Category]
        if let parentID {
            siblings = children(of: parentID)
        } else if type == .expense {
            siblings = expenseParents
        } else {
            siblings = incomeParents
        }
        var arr = siblings
        arr.move(fromOffsets: source, toOffset: destination)
        let base: Int = parentID == nil ? 0 : 100
        for (idx, cat) in arr.enumerated() {
            cat.sortOrder = base + idx
        }
        try? context.save()
    }
}

// 递归子树（独立 struct 避免递归 opaque type 编译错误）
private struct CategorySubtree: View {
    let parentID: UUID
    let depth: Int
    let categories: [Category]
    @Binding var expandedIDs: Set<UUID>
    @Binding var editMode: EditMode
    let onTapLeaf: (Category) -> Void
    let onDelete: (Category) -> Void
    let onMove: (UUID?, IndexSet, Int) -> Void

    private var nodes: [Category] {
        categories.filter { $0.parentID == parentID }.sorted { $0.sortOrder < $1.sortOrder }
    }

    private func hasChildren(_ id: UUID) -> Bool {
        categories.contains { $0.parentID == id }
    }

    var body: some View {
        ForEach(nodes) { cat in
            Button {
                if hasChildren(cat.id) {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        if expandedIDs.contains(cat.id) {
                            expandedIDs.remove(cat.id)
                        } else {
                            expandedIDs.insert(cat.id)
                        }
                    }
                } else {
                    onTapLeaf(cat)
                }
            } label: {
                HStack(spacing: 10) {
                    Spacer().frame(width: CGFloat(depth) * 20)
                    Image(systemName: "ellipsis")
                        .font(.system(size: 10))
                        .foregroundStyle(.textTertiary)
                    CategoryIcon(systemName: cat.icon, color: cat.color, size: 32)
                    Text(cat.name)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.textPrimary)
                    Spacer()
                    if cat.isSystem {
                        Text("系统")
                            .font(.system(size: 10, weight: .semibold))
                            .textCase(.uppercase)
                            .tracking(0.6)
                            .foregroundStyle(.textTertiary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.bgPrimary, in: Capsule())
                    }
                    if hasChildren(cat.id) {
                        Image(systemName: expandedIDs.contains(cat.id) ? "chevron.down" : "chevron.right")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.textTertiary)
                            .padding(.leading, 6)
                    }
                }
                .padding(.vertical, 6)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .listRowBackground(Color.bgCardElevated.opacity(0.5))
            .swipeActions(edge: .trailing) {
                if !cat.isSystem {
                    Button(role: .destructive) {
                        onDelete(cat)
                    } label: {
                        Label("删除", systemImage: "trash")
                    }
                }
            }

            if expandedIDs.contains(cat.id) {
                CategorySubtree(
                    parentID: cat.id,
                    depth: depth + 1,
                    categories: categories,
                    expandedIDs: $expandedIDs,
                    editMode: $editMode,
                    onTapLeaf: onTapLeaf,
                    onDelete: onDelete,
                    onMove: onMove
                )
            }
        }
        .onMove { indices, dest in
            onMove(parentID, indices, dest)
        }
    }
}

#Preview {
    NavigationStack { CategoryListView() }
        .modelContainer(for: [Transaction.self, Category.self, Budget.self, RecurringTransaction.self], inMemory: true)
        .preferredColorScheme(.dark)
}
