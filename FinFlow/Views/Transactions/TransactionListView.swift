import SwiftUI
import SwiftData

enum BillViewMode: String, CaseIterable, Hashable {
    case list
    case calendar

    var displayName: String {
        switch self {
        case .list: return "列表"
        case .calendar: return "日历"
        }
    }
}

struct TransactionListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: [SortDescriptor(\Transaction.date, order: .reverse)]) private var transactions: [Transaction]

    @State private var showingForm = false
    @State private var editingTransaction: Transaction?
    @State private var filterMonth = Date()
    @State private var viewMode: BillViewMode = .list
    @State private var searchText = ""
    @State private var criteria = TransactionFilterCriteria()
    @State private var showingFilter = false

    private var monthFiltered: [Transaction] {
        guard criteria.startDate == nil && criteria.endDate == nil else { return transactions }
        return transactions.filter { $0.date.isSameMonth(as: filterMonth) }
    }

    private var filtered: [Transaction] {
        let afterText = TransactionFilter.filter(monthFiltered, query: searchText)
        return criteria.apply(to: afterText)
    }

    private var grouped: [(key: String, items: [Transaction])] {
        let cal = Calendar.current
        let grouped = Dictionary(grouping: filtered) { tx -> String in
            let day = cal.dateComponents([.year, .month, .day], from: tx.date)
            let date = cal.date(from: day) ?? tx.date
            return date.shortDateString
        }
        return grouped
            .map { (key: $0.key, items: $0.value) }
            .sorted { $0.key > $1.key }
    }

    private var monthTotal: Decimal {
        filtered.reduce(0) { $0 + $1.signedAmount }
    }

    var body: some View {
        NavigationStack {
            Group {
                if viewMode == .calendar {
                    ScrollView {
                        CalendarView(transactions: filtered, month: $filterMonth)
                            .padding(.horizontal, 16)
                            .padding(.top, 8)
                    }
                    .background(Color.bgPrimary.ignoresSafeArea())
                    .scrollContentBackground(.hidden)
                } else if filtered.isEmpty {
                    EmptyStateView(
                        systemName: searchText.isEmpty && criteria.isEmpty ? "tray" : "magnifyingglass",
                        title: searchText.isEmpty && criteria.isEmpty ? "本月还没有记录" : "未找到匹配记录",
                        subtitle: searchText.isEmpty && criteria.isEmpty ? "点击右上角 + 记一笔" : "试试调整搜索或筛选条件"
                    )
                    .background(Color.bgPrimary.ignoresSafeArea())
                } else {
                    List {
                        ForEach(grouped, id: \.key) { section in
                            Section {
                                ForEach(section.items) { tx in
                                    Button {
                                        editingTransaction = tx
                                        showingForm = true
                                    } label: {
                                        TransactionRowView(transaction: tx)
                                    }
                                    .buttonStyle(.plain)
                                    .listRowBackground(Color.clear)
                                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                                    .swipeActions(edge: .trailing) {
                                        Button(role: .destructive) {
                                            context.delete(tx)
                                        } label: {
                                            Label("删除", systemImage: "trash")
                                        }
                                    }
                                }
                            } header: {
                                HStack {
                                    Text(section.key)
                                        .font(.system(size: 12, weight: .semibold))
                                        .monospacedDigit()
                                        .foregroundStyle(.textSecondary)
                                    Spacer()
                                    Text(section.items.reduce(0) { $0 + $1.signedAmount }.asCurrency)
                                        .font(.system(size: 12, weight: .medium, design: .rounded))
                                        .monospacedDigit()
                                        .foregroundStyle(.textTertiary)
                                }
                                .textCase(nil)
                            }
                        }
                    }
                    .listStyle(.plain)
                    .background(Color.bgPrimary.ignoresSafeArea())
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("账单")
            .searchable(text: $searchText, prompt: "搜索备注、分类、金额")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: 8) {
                        filterButton
                        addButton
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: 12) {
                        if viewMode == .list && criteria.startDate == nil && criteria.endDate == nil {
                            MonthYearPicker(date: $filterMonth)
                        }
                        Picker("视图", selection: $viewMode) {
                            ForEach(BillViewMode.allCases, id: \.self) { m in
                                Image(systemName: m == .list ? "list.bullet" : "calendar")
                                    .tag(m)
                            }
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 80)
                    }
                }
            }
            .toolbarBackground(Color.bgPrimary, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .safeAreaInset(edge: .bottom) {
                if !filtered.isEmpty && viewMode == .list {
                    HStack {
                        Text("\(periodLabel) 结余")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.textSecondary)
                        Spacer()
                        Text(monthTotal.asCurrency)
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(monthTotal >= 0 ? Color.incomeGreen : Color.overspendRed)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 14)
                    .background(Color.bgCard)
                    .overlay(
                        Rectangle()
                            .fill(Color.cardBorder)
                            .frame(height: 0.5),
                        alignment: .top
                    )
                }
            }
            .sheet(isPresented: $showingForm) {
                TransactionFormView(transaction: editingTransaction)
            }
            .sheet(isPresented: $showingFilter) {
                TransactionFilterSheet(criteria: $criteria)
            }
        }
    }

    private var filterButton: some View {
        Button {
            showingFilter = true
        } label: {
            ZStack(alignment: .topTrailing) {
                Image(systemName: criteria.isEmpty ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(criteria.isEmpty ? .textSecondary : .accentBlue)
                if criteria.activeCount > 0 {
                    Text("\(criteria.activeCount)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 16, height: 16)
                        .background(Color.overspendRed, in: Circle())
                        .overlay(Circle().stroke(Color.bgPrimary, lineWidth: 1.5))
                        .offset(x: 6, y: -6)
                }
            }
        }
    }

    private var addButton: some View {
        AddTransactionButton {
            editingTransaction = nil
            showingForm = true
        }
    }

    private var periodLabel: String {
        if let start = criteria.startDate, let end = criteria.endDate {
            return "\(start.shortDateString) ~ \(end.shortDateString)"
        }
        if let start = criteria.startDate { return "\(start.shortDateString) 起" }
        if let end = criteria.endDate { return "至 \(end.shortDateString)" }
        return filterMonth.monthYearString
    }
}

#Preview {
    TransactionListView()
        .modelContainer(for: [Transaction.self, Category.self, Budget.self, RecurringTransaction.self, Account.self], inMemory: true)
}
