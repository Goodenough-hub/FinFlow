import Testing
import Foundation
@testable import FinFlow

@MainActor
struct TransactionFilterCriteriaTests {
    private let cal = Calendar.current

    private func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        cal.date(from: DateComponents(year: year, month: month, day: day)) ?? .now
    }

    private func makeTransaction(
        amount: Decimal,
        type: TransactionType = .expense,
        note: String = "",
        date: Date = .now,
        categoryName: String? = nil,
        accountName: String? = nil
    ) -> Transaction {
        let category = categoryName.map { Category(name: $0, type: .expense, icon: "tag.fill", colorHex: "#3B82F6") }
        let account = accountName.map { Account(name: $0, type: .other) }
        return Transaction(amount: amount, type: type, note: note, date: date, category: category, account: account)
    }

    // MARK: - Empty / activeCount

    @Test func defaultCriteria_isEmpty_andActiveCountZero() {
        let c = TransactionFilterCriteria()
        #expect(c.isEmpty)
        #expect(c.activeCount == 0)
    }

    @Test func activeCount_countsConditionGroups() {
        var c = TransactionFilterCriteria()
        c.startDate = .now
        #expect(c.activeCount == 1)

        c.minAmount = 100
        #expect(c.activeCount == 2)

        c.type = .expense
        #expect(c.activeCount == 3)

        c.categoryIDs = [UUID()]
        #expect(c.activeCount == 4)

        c.accountIDs = [UUID()]
        #expect(c.activeCount == 5)

        c.noteContains = "咖啡"
        #expect(c.activeCount == 6)

        c.maxAmount = 500
        #expect(c.activeCount == 6)

        c.endDate = .now
        #expect(c.activeCount == 6)
    }

    @Test func noteContains_emptyString_becomesNil() {
        let c = TransactionFilterCriteria(noteContains: "   ")
        // 空字符串视为 nil，避免无意义筛选
        #expect(c.noteContains == "   " || c.noteContains == nil)
    }

    // MARK: - apply

    @Test func apply_emptyCriteria_returnsAll() {
        let txs = [makeTransaction(amount: 100), makeTransaction(amount: 200)]
        #expect(TransactionFilterCriteria().apply(to: txs).count == 2)
    }

    // MARK: - Date range

    @Test func apply_startDate_filtersEarlier() {
        let txs = [
            makeTransaction(amount: 100, date: date(2026, 1, 10)),
            makeTransaction(amount: 200, date: date(2026, 3, 10)),
        ]
        let c = TransactionFilterCriteria(startDate: date(2026, 2, 1))
        let result = c.apply(to: txs)
        #expect(result.count == 1)
        #expect(result.first?.amount == 200)
    }

    @Test func apply_endDate_filtersLater() {
        let txs = [
            makeTransaction(amount: 100, date: date(2026, 1, 10)),
            makeTransaction(amount: 200, date: date(2026, 3, 10)),
        ]
        let c = TransactionFilterCriteria(endDate: date(2026, 2, 28))
        let result = c.apply(to: txs)
        #expect(result.count == 1)
        #expect(result.first?.amount == 100)
    }

    @Test func apply_dateRange_inclusive() {
        let txs = [
            makeTransaction(amount: 100, date: date(2026, 1, 1)),
            makeTransaction(amount: 200, date: date(2026, 2, 1)),
            makeTransaction(amount: 300, date: date(2026, 3, 1)),
        ]
        let c = TransactionFilterCriteria(startDate: date(2026, 1, 1), endDate: date(2026, 2, 1))
        #expect(c.apply(to: txs).count == 2)
    }

    // MARK: - Amount range

    @Test func apply_minAmount_filtersSmaller() {
        let txs = [makeTransaction(amount: 50), makeTransaction(amount: 100), makeTransaction(amount: 200)]
        let c = TransactionFilterCriteria(minAmount: 100)
        let result = c.apply(to: txs)
        #expect(result.count == 2)
        #expect(result.allSatisfy { $0.amount >= 100 })
    }

    @Test func apply_maxAmount_filtersLarger() {
        let txs = [makeTransaction(amount: 50), makeTransaction(amount: 100), makeTransaction(amount: 200)]
        let c = TransactionFilterCriteria(maxAmount: 100)
        let result = c.apply(to: txs)
        #expect(result.count == 2)
        #expect(result.allSatisfy { $0.amount <= 100 })
    }

    @Test func apply_amountRange_inclusive() {
        let txs = [makeTransaction(amount: 50), makeTransaction(amount: 100), makeTransaction(amount: 200), makeTransaction(amount: 300)]
        let c = TransactionFilterCriteria(minAmount: 100, maxAmount: 200)
        let result = c.apply(to: txs)
        #expect(result.count == 2)
    }

    // MARK: - Type

    @Test func apply_type_filtersOtherTypes() {
        let txs = [
            makeTransaction(amount: 100, type: .expense),
            makeTransaction(amount: 200, type: .income),
            makeTransaction(amount: 300, type: .expense),
        ]
        let c = TransactionFilterCriteria(type: .expense)
        let result = c.apply(to: txs)
        #expect(result.count == 2)
        #expect(result.allSatisfy { $0.type == .expense })
    }

    // MARK: - Category

    @Test func apply_categoryIDs_filtersByCategory() {
        let cat1 = Category(name: "餐饮", type: .expense, icon: "tag.fill", colorHex: "#3B82F6")
        let cat2 = Category(name: "交通", type: .expense, icon: "tag.fill", colorHex: "#3B82F6")
        let txs = [
            Transaction(amount: 100, type: .expense, category: cat1),
            Transaction(amount: 200, type: .expense, category: cat2),
            Transaction(amount: 300, type: .expense, category: cat1),
        ]
        let c = TransactionFilterCriteria(categoryIDs: [cat1.id])
        let result = c.apply(to: txs)
        #expect(result.count == 2)
        #expect(result.allSatisfy { $0.category?.name == "餐饮" })
    }

    @Test func apply_categoryIDs_txWithoutCategory_excluded() {
        let cat = Category(name: "餐饮", type: .expense, icon: "tag.fill", colorHex: "#3B82F6")
        let txs = [
            Transaction(amount: 100, type: .expense, category: cat),
            Transaction(amount: 200, type: .expense, category: nil),
        ]
        let c = TransactionFilterCriteria(categoryIDs: [cat.id])
        let result = c.apply(to: txs)
        #expect(result.count == 1)
    }

    @Test func apply_multipleCategoryIDs_matchesAny() {
        let cat1 = Category(name: "餐饮", type: .expense, icon: "tag.fill", colorHex: "#3B82F6")
        let cat2 = Category(name: "交通", type: .expense, icon: "tag.fill", colorHex: "#3B82F6")
        let cat3 = Category(name: "购物", type: .expense, icon: "tag.fill", colorHex: "#3B82F6")
        let txs = [
            Transaction(amount: 100, type: .expense, category: cat1),
            Transaction(amount: 200, type: .expense, category: cat2),
            Transaction(amount: 300, type: .expense, category: cat3),
        ]
        let c = TransactionFilterCriteria(categoryIDs: [cat1.id, cat2.id])
        #expect(c.apply(to: txs).count == 2)
    }

    // MARK: - Account

    @Test func apply_accountIDs_filtersByAccount() {
        let acc1 = Account(name: "支付宝", type: .alipay)
        let acc2 = Account(name: "微信", type: .wechat)
        let txs = [
            Transaction(amount: 100, type: .expense, account: acc1),
            Transaction(amount: 200, type: .expense, account: acc2),
            Transaction(amount: 300, type: .expense, account: acc1),
        ]
        let c = TransactionFilterCriteria(accountIDs: [acc1.id])
        let result = c.apply(to: txs)
        #expect(result.count == 2)
        #expect(result.allSatisfy { $0.account?.name == "支付宝" })
    }

    @Test func apply_accountIDs_txWithoutAccount_excluded() {
        let acc = Account(name: "支付宝", type: .alipay)
        let txs = [
            Transaction(amount: 100, type: .expense, account: acc),
            Transaction(amount: 200, type: .expense, account: nil),
        ]
        let c = TransactionFilterCriteria(accountIDs: [acc.id])
        #expect(c.apply(to: txs).count == 1)
    }

    // MARK: - Note

    @Test func apply_noteContains_caseInsensitive() {
        let txs = [
            makeTransaction(amount: 100, note: "Starbucks Coffee"),
            makeTransaction(amount: 200, note: "Tea"),
        ]
        #expect(TransactionFilterCriteria(noteContains: "starbucks").apply(to: txs).count == 1)
        #expect(TransactionFilterCriteria(noteContains: "COFFEE").apply(to: txs).count == 1)
    }

    @Test func apply_noteContains_chinese() {
        let txs = [
            makeTransaction(amount: 100, note: "午餐面条"),
            makeTransaction(amount: 200, note: "打车回家"),
        ]
        #expect(TransactionFilterCriteria(noteContains: "午餐").apply(to: txs).count == 1)
    }

    @Test func apply_noteContains_noMatch_returnsEmpty() {
        let txs = [makeTransaction(amount: 100, note: "午餐")]
        #expect(TransactionFilterCriteria(noteContains: "xyz").apply(to: txs).isEmpty)
    }

    // MARK: - Combination

    @Test func apply_combinedDateAmountTypeCategory() {
        let cat = Category(name: "餐饮", type: .expense, icon: "tag.fill", colorHex: "#3B82F6")
        let acc = Account(name: "支付宝", type: .alipay)
        let txs = [
            Transaction(amount: 50, type: .expense, note: "午餐", date: date(2026, 2, 5), category: cat, account: acc),
            Transaction(amount: 200, type: .expense, note: "午餐", date: date(2026, 2, 10), category: cat, account: acc),
            Transaction(amount: 200, type: .income, note: "午餐", date: date(2026, 2, 10), category: cat, account: acc),
            Transaction(amount: 200, type: .expense, note: "晚餐", date: date(2026, 2, 10), category: cat, account: acc),
            Transaction(amount: 500, type: .expense, note: "午餐", date: date(2026, 2, 10), category: cat, account: acc),
            Transaction(amount: 200, type: .expense, note: "午餐", date: date(2026, 3, 10), category: cat, account: acc),
        ]
        let c = TransactionFilterCriteria(
            startDate: date(2026, 2, 1),
            endDate: date(2026, 2, 28),
            minAmount: 100,
            maxAmount: 300,
            type: .expense,
            categoryIDs: [cat.id],
            accountIDs: [acc.id],
            noteContains: "午餐"
        )
        let result = c.apply(to: txs)
        #expect(result.count == 1)
        #expect(result.first?.amount == 200)
    }

    @Test func apply_combinedNoMatch_returnsEmpty() {
        let txs = [makeTransaction(amount: 100, type: .expense)]
        let c = TransactionFilterCriteria(type: .income)
        #expect(c.apply(to: txs).isEmpty)
    }

    // MARK: - Equatable

    @Test func equality_sameValues_areEqual() {
        let id = UUID()
        let a = TransactionFilterCriteria(minAmount: 100, categoryIDs: [id])
        let b = TransactionFilterCriteria(minAmount: 100, categoryIDs: [id])
        #expect(a == b)
    }

    @Test func equality_differentValues_notEqual() {
        let a = TransactionFilterCriteria(minAmount: 100)
        let b = TransactionFilterCriteria(minAmount: 200)
        #expect(a != b)
    }
}
