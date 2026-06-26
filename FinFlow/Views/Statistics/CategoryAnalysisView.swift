import SwiftUI
import SwiftData
import Charts

struct CategoryAnalysisView: View {
    let transactions: [Transaction]
    let type: TransactionType

    @Query(sort: [SortDescriptor(\Category.sortOrder)]) private var allCategories: [Category]
    @State private var drillPath: [Category] = []

    private static let uncategorizedID = UUID(uuidString: "00000000-0000-0000-0000-000000000000")!

    private var currentParent: Category? { drillPath.last }

    private var currentSiblings: [Category] {
        let parentID = currentParent?.id
        return allCategories
            .filter { $0.typeRaw == type.rawValue && $0.parentID == parentID }
            .sorted { $0.sortOrder < $1.sortOrder }
    }

    private func collectDescendantIDs(of id: UUID) -> Set<UUID> {
        var result: Set<UUID> = []
        for child in allCategories where child.parentID == id {
            result.insert(child.id)
            result.formUnion(collectDescendantIDs(of: child.id))
        }
        return result
    }

    private func hasChildren(_ cat: Category) -> Bool {
        allCategories.contains { $0.parentID == cat.id }
    }

    private func amount(for cat: Category) -> Decimal {
        var ids = collectDescendantIDs(of: cat.id)
        ids.insert(cat.id)
        return transactions
            .filter { $0.type == type }
            .filter { $0.category.map { ids.contains($0.id) } ?? false }
            .reduce(0) { $0 + $1.amount }
    }

    private func count(for cat: Category) -> Int {
        var ids = collectDescendantIDs(of: cat.id)
        ids.insert(cat.id)
        return transactions
            .filter { $0.type == type }
            .filter { $0.category.map { ids.contains($0.id) } ?? false }
            .count
    }

    private var directParentAmount: Decimal {
        guard let parent = currentParent else { return 0 }
        return transactions
            .filter { $0.type == type }
            .filter { $0.category?.id == parent.id }
            .reduce(0) { $0 + $1.amount }
    }

    private var directParentCount: Int {
        guard let parent = currentParent else { return 0 }
        return transactions
            .filter { $0.type == type }
            .filter { $0.category?.id == parent.id }
            .count
    }

    private var total: Decimal {
        currentSiblings.reduce(0) { $0 + amount(for: $1) } + directParentAmount
    }

    var body: some View {
        if currentSiblings.isEmpty && drillPath.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 16) {
                header
                if total == 0 {
                    emptyState
                } else {
                    pieChart
                    breakdownList
                    totalRow
                }
            }
            .dashboardCard()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "chart.pie")
                .font(.system(size: 36, weight: .light))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(.textTertiary)
            Text("本层级暂无交易")
                .font(.system(size: 13))
                .foregroundStyle(.textTertiary)
            if !drillPath.isEmpty {
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        if !drillPath.isEmpty { drillPath.removeLast() }
                    }
                } label: {
                    Text("返回上一层")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.accentBlue)
                }
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("\(type.displayName)分类占比")
                    .font(.system(size: 13, weight: .semibold))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(.textTertiary)
                Spacer()
            }
            breadcrumb
        }
    }

    private var breadcrumb: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) { drillPath = [] }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chart.pie.fill")
                            .font(.system(size: 9))
                        Text("全部")
                            .font(.system(size: 11, weight: drillPath.isEmpty ? .semibold : .regular))
                    }
                    .foregroundStyle(drillPath.isEmpty ? .accentBlue : .textSecondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        drillPath.isEmpty ? Color.accentBlue.opacity(0.12) : Color.bgCardElevated,
                        in: Capsule()
                    )
                }
                .disabled(drillPath.isEmpty)

                ForEach(Array(drillPath.enumerated()), id: \.element.id) { idx, cat in
                    Image(systemName: "chevron.right")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.textTertiary)

                    let isLast = idx == drillPath.count - 1
                    Button {
                        withAnimation(.easeInOut(duration: 0.25)) {
                            drillPath = Array(drillPath.prefix(idx + 1))
                        }
                    } label: {
                        Text(cat.name)
                            .font(.system(size: 11, weight: isLast ? .semibold : .regular))
                            .foregroundStyle(isLast ? .accentBlue : .textSecondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                isLast ? Color.accentBlue.opacity(0.12) : Color.bgCardElevated,
                                in: Capsule()
                            )
                    }
                }

                Spacer(minLength: 0)
            }
        }
    }

    private var pieChart: some View {
        var slices = currentSiblings
            .map { Slice(cat: $0, amount: amount(for: $0)) }
            .filter { $0.amount > 0 }
        if directParentAmount > 0 {
            slices.append(Slice(cat: nil, amount: directParentAmount))
        }
        slices.sort { $0.amount > $1.amount }

        return Chart(slices) { slice in
            SectorMark(
                angle: .value("金额", NSDecimalNumber(decimal: slice.amount).doubleValue),
                innerRadius: .ratio(0.6),
                angularInset: 1.5
            )
            .foregroundStyle(sliceColor(slice.cat))
            .annotation(position: .overlay) {
                if percentage(slice.amount) >= 5 {
                    VStack(spacing: 2) {
                        Text(slice.cat?.name ?? "未分类")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.white)
                        Text("\(percentage(slice.amount), specifier: "%.0f")%")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
            }
        }
        .frame(height: 200)
    }

    private var breakdownList: some View {
        var items = currentSiblings
            .map { RowItem(cat: $0, amount: amount(for: $0), count: count(for: $0)) }
            .filter { $0.amount > 0 }
        if directParentAmount > 0 {
            items.append(RowItem(cat: nil, amount: directParentAmount, count: directParentCount))
        }
        items.sort { $0.amount > $1.amount }

        return VStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.element.id) { idx, item in
                Button {
                    if let cat = item.cat, hasChildren(cat) {
                        withAnimation(.easeInOut(duration: 0.25)) {
                            drillPath.append(cat)
                        }
                    }
                } label: {
                    rowView(item)
                }
                .buttonStyle(.plain)
                .disabled(item.cat == nil || !hasChildren(item.cat!))

                if idx < items.count - 1 {
                    Rectangle()
                        .fill(Color.cardBorder.opacity(0.4))
                        .frame(height: 0.5)
                }
            }
        }
    }

    private func rowView(_ item: RowItem) -> some View {
        HStack(spacing: 12) {
            if let cat = item.cat {
                CategoryIcon(systemName: cat.icon, color: cat.color, size: 32)
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.textTertiary.opacity(0.3))
                    .frame(width: 32, height: 32)
                    .overlay(
                        Image(systemName: "questionmark")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.textSecondary)
                    )
            }
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(item.cat?.name ?? "未分类")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.textPrimary)
                    Spacer()
                    Text(item.amount.asCurrency)
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(type == .income ? .incomeGreen : .expenseGold)
                }
                HStack {
                    Text("\(item.count) 笔 · \(String(format: "%.1f", percentage(item.amount)))%")
                        .font(.system(size: 11))
                        .foregroundStyle(.textTertiary)
                    Spacer()
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.cardBorder.opacity(0.5))
                            .frame(height: 4)
                        Capsule()
                            .fill(sliceColor(item.cat))
                            .frame(width: geo.size.width * (percentage(item.amount) / 100), height: 4)
                    }
                }
                .frame(height: 4)
            }
            if let cat = item.cat, hasChildren(cat) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.textTertiary)
            }
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }

    private var totalRow: some View {
        HStack {
            Text("合计")
                .font(.system(size: 11, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1)
                .foregroundStyle(.textTertiary)
            Spacer()
            Text(total.asCurrency)
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.textPrimary)
        }
        .padding(.top, 4)
    }

    private func sliceColor(_ cat: Category?) -> Color {
        cat?.color ?? .textTertiary
    }

    private func percentage(_ amount: Decimal) -> Double {
        guard total > 0 else { return 0 }
        return NSDecimalNumber(decimal: amount).doubleValue / NSDecimalNumber(decimal: total).doubleValue * 100
    }

    private struct Slice: Identifiable {
        let cat: Category?
        let amount: Decimal
        var id: UUID { cat?.id ?? CategoryAnalysisView.uncategorizedID }
    }

    private struct RowItem: Identifiable {
        let cat: Category?
        let amount: Decimal
        let count: Int
        var id: UUID { cat?.id ?? CategoryAnalysisView.uncategorizedID }
    }
}
