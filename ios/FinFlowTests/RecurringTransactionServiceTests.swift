import Testing
import Foundation
import SwiftData
@testable import FinFlow

@MainActor
struct RecurringTransactionServiceTests {
    private func makeContainer() throws -> ModelContainer {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        return try ModelContainer(
            for: Transaction.self, Category.self, Budget.self, RecurringTransaction.self, Account.self,
            configurations: config
        )
    }

    private func makeCategory(context: ModelContext, name: String = "测试", type: CategoryType = .expense) -> Category {
        let cat = Category(name: name, type: type, icon: "tag.fill", colorHex: "#3B82F6")
        context.insert(cat)
        try? context.save()
        return cat
    }

    @Test func generateUpcoming_dailyFrequency_createsInstances() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = makeCategory(context: context)

        let rule = RecurrenceRule(frequency: .daily, interval: 1, dayOfMonth: nil, dayOfWeek: nil)
        let start = Calendar.current.date(byAdding: .day, value: -10, to: .now)!
        let recurring = RecurringTransaction(amount: 10, type: .expense, rule: rule, startDate: start, category: cat)
        context.insert(recurring)
        try context.save()

        RecurringTransactionService.generateUpcoming(context: context)

        let txs = try context.fetch(FetchDescriptor<Transaction>())
        #expect(txs.count > 0)
        #expect(txs.allSatisfy { $0.sourceID == recurring.id })
    }

    @Test func generateUpcoming_calledTwice_isIdempotent() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = makeCategory(context: context)

        let rule = RecurrenceRule(frequency: .daily, interval: 1, dayOfMonth: nil, dayOfWeek: nil)
        let start = Calendar.current.date(byAdding: .day, value: -5, to: .now)!
        let recurring = RecurringTransaction(amount: 10, type: .expense, rule: rule, startDate: start, category: cat)
        context.insert(recurring)
        try context.save()

        RecurringTransactionService.generateUpcoming(context: context)
        let countAfterFirst = try context.fetch(FetchDescriptor<Transaction>()).count

        RecurringTransactionService.generateUpcoming(context: context)
        let countAfterSecond = try context.fetch(FetchDescriptor<Transaction>()).count

        #expect(countAfterFirst == countAfterSecond)
    }

    @Test func generateUpcoming_inactiveRecurring_doesNotGenerate() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = makeCategory(context: context)

        let rule = RecurrenceRule(frequency: .daily, interval: 1, dayOfMonth: nil, dayOfWeek: nil)
        let start = Calendar.current.date(byAdding: .day, value: -5, to: .now)!
        let recurring = RecurringTransaction(amount: 10, type: .expense, rule: rule, startDate: start, category: cat)
        recurring.isActive = false
        context.insert(recurring)
        try context.save()

        RecurringTransactionService.generateUpcoming(context: context)

        let txs = try context.fetch(FetchDescriptor<Transaction>())
        #expect(txs.isEmpty)
    }

    @Test func generateUpcoming_endDateInPast_doesNotGenerate() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = makeCategory(context: context)

        let rule = RecurrenceRule(frequency: .daily, interval: 1, dayOfMonth: nil, dayOfWeek: nil)
        let start = Calendar.current.date(byAdding: .day, value: -30, to: .now)!
        let end = Calendar.current.date(byAdding: .day, value: -10, to: .now)!
        let recurring = RecurringTransaction(amount: 10, type: .expense, rule: rule, startDate: start, endDate: end, category: cat)
        context.insert(recurring)
        try context.save()

        RecurringTransactionService.generateUpcoming(context: context)

        let txs = try context.fetch(FetchDescriptor<Transaction>())
        #expect(txs.isEmpty)
    }

    @Test func generateUpcoming_monthlyFrequency_generatesOnePerMonth() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = makeCategory(context: context)

        let rule = RecurrenceRule(frequency: .monthly, interval: 1, dayOfMonth: 1, dayOfWeek: nil)
        let start = Calendar.current.date(byAdding: .month, value: -2, to: .now)!
        let recurring = RecurringTransaction(amount: 1000, type: .expense, rule: rule, startDate: start, category: cat)
        context.insert(recurring)
        try context.save()

        RecurringTransactionService.generateUpcoming(context: context)

        let txs = try context.fetch(FetchDescriptor<Transaction>())
        #expect(txs.count >= 2)
        #expect(txs.allSatisfy { $0.amount == 1000 })
    }

    @Test func generateUpcoming_passesAccountToGeneratedTransaction() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = makeCategory(context: context)
        let account = Account(name: "支付宝", type: .alipay)
        context.insert(account)

        let rule = RecurrenceRule(frequency: .daily, interval: 1, dayOfMonth: nil, dayOfWeek: nil)
        let start = Calendar.current.date(byAdding: .day, value: -3, to: .now)!
        let recurring = RecurringTransaction(amount: 10, type: .expense, rule: rule, startDate: start, category: cat, account: account)
        context.insert(recurring)
        try context.save()

        RecurringTransactionService.generateUpcoming(context: context)

        let txs = try context.fetch(FetchDescriptor<Transaction>())
        #expect(txs.allSatisfy { $0.account?.id == account.id })
    }

    @Test func removeFutureInstances_deletesOnlyFutureTransactions() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = makeCategory(context: context)

        let recurringID = UUID()
        let past = Transaction(amount: 10, type: .expense, category: cat, sourceID: recurringID, sourceType: "recurring")
        past.date = Calendar.current.date(byAdding: .day, value: -10, to: .now)!
        let future = Transaction(amount: 10, type: .expense, category: cat, sourceID: recurringID, sourceType: "recurring")
        future.date = Calendar.current.date(byAdding: .day, value: 10, to: .now)!
        context.insert(past)
        context.insert(future)
        try context.save()

        RecurringTransactionService.removeFutureInstances(for: recurringID, context: context)

        let txs = try context.fetch(FetchDescriptor<Transaction>())
        #expect(txs.count == 1)
        #expect(txs.first?.date == past.date)
    }

    @Test func removeFutureInstances_unrelatedTransactionsUntouched() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = makeCategory(context: context)

        let otherID = UUID()
        let tx = Transaction(amount: 10, type: .expense, category: cat, sourceID: otherID, sourceType: "recurring")
        tx.date = Calendar.current.date(byAdding: .day, value: 10, to: .now)!
        context.insert(tx)
        try context.save()

        RecurringTransactionService.removeFutureInstances(for: UUID(), context: context)

        let txs = try context.fetch(FetchDescriptor<Transaction>())
        #expect(txs.count == 1)
    }

    @Test func nextDueDate_returnsDateAfterReference() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = makeCategory(context: context)

        let rule = RecurrenceRule(frequency: .monthly, interval: 1, dayOfMonth: 15, dayOfWeek: nil)
        let start = Calendar.current.date(byAdding: .month, value: -3, to: .now)!
        let recurring = RecurringTransaction(amount: 100, type: .expense, rule: rule, startDate: start, category: cat)
        context.insert(recurring)
        try context.save()

        let next = RecurringTransactionService.nextDueDate(for: recurring)
        #expect(next != nil)
    }
}
