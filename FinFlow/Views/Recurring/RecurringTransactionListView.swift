import SwiftUI
import SwiftData

struct RecurringTransactionListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: [SortDescriptor(\RecurringTransaction.startDate)]) private var items: [RecurringTransaction]

    @State private var showingForm = false
    @State private var editing: RecurringTransaction?

    var body: some View {
        Group {
            if items.isEmpty {
                EmptyStateView(
                    systemName: "arrow.triangle.2.circlepath",
                    title: "还没有周期账单",
                    subtitle: "添加房租、订阅等定期支出，自动记账"
                )
                .background(Color.bgPrimary.ignoresSafeArea())
            } else {
                List {
                    ForEach(items) { item in
                        Button {
                            editing = item
                            showingForm = true
                        } label: {
                            row(item)
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(Color.bgCardElevated)
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                RecurringTransactionService.removeFutureInstances(for: item.id, context: context)
                                context.delete(item)
                                try? context.save()
                            } label: {
                                Label("删除", systemImage: "trash")
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .background(Color.bgPrimary.ignoresSafeArea())
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("周期账单")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    editing = nil
                    showingForm = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.accentBlue)
                }
            }
        }
        .sheet(isPresented: $showingForm) {
            RecurringTransactionFormView(recurring: editing)
        }
    }

    @ViewBuilder
    private func row(_ item: RecurringTransaction) -> some View {
        HStack(spacing: 12) {
            CategoryIcon(
                systemName: item.category?.icon ?? "arrow.triangle.2.circlepath",
                color: item.category?.color ?? .gray,
                size: 40
            )
            VStack(alignment: .leading, spacing: 3) {
                Text(item.category?.name ?? "未分类")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.textPrimary)
                HStack(spacing: 6) {
                    if let rule = item.recurrenceRule {
                        Text(ruleDescription(rule))
                    }
                    if !item.note.isEmpty {
                        Text("·")
                        Text(item.note)
                    }
                }
                .font(.system(size: 12))
                .foregroundStyle(.textTertiary)
                if let next = RecurringTransactionService.nextDueDate(for: item) {
                    Text("下次：\(next.shortDateString)")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.textTertiary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                AmountText(amount: item.amount, type: item.type)
                if !item.isActive {
                    Text("已停用")
                        .font(.system(size: 10, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(0.6)
                        .foregroundStyle(.textTertiary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.bgPrimary, in: Capsule())
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func ruleDescription(_ rule: RecurrenceRule) -> String {
        let interval = rule.interval
        switch rule.frequency {
        case .daily: return interval == 1 ? "每天" : "每 \(interval) 天"
        case .weekly: return interval == 1 ? "每周" : "每 \(interval) 周"
        case .monthly: return interval == 1 ? "每月" : "每 \(interval) 月"
        case .yearly: return interval == 1 ? "每年" : "每 \(interval) 年"
        }
    }
}

#Preview {
    NavigationStack { RecurringTransactionListView() }
        .modelContainer(for: [RecurringTransaction.self, Category.self, Transaction.self, Account.self], inMemory: true)
        .preferredColorScheme(.dark)
}
