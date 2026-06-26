import Testing
import Foundation
import SwiftData
@testable import FinFlow

@MainActor
struct CategoryDrillDownTests {
    private func makeContainer() throws -> ModelContainer {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        return try ModelContainer(
            for: Transaction.self, Category.self, Budget.self, RecurringTransaction.self, Account.self,
            configurations: config
        )
    }

    private func resetSeedState() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "finflow.categories.seeded.v1")
        defaults.removeObject(forKey: "finflow.categories.seeded.v2")
        defaults.removeObject(forKey: "finflow.categories.seeded.v3")
        defaults.removeObject(forKey: "finflow.accounts.seeded.v1")
    }

    @Test func sampleData_attachesTransactionsToLeafCategories() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)
        try SampleDataService.populate(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        let parentIDs = Set(categories.compactMap { $0.parentID })
        let transactions = try context.fetch(FetchDescriptor<Transaction>())

        #expect(!transactions.isEmpty)

        let nonLeafTransactions = transactions.filter { tx in
            guard let cat = tx.category else { return true }
            return parentIDs.contains(cat.id)
        }

        #expect(nonLeafTransactions.isEmpty, "存在交易挂在非叶子分类上: \(nonLeafTransactions.count) 条")
    }

    @Test func drillDown_entertainment_showsAllChildSlices() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)
        try SampleDataService.populate(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        let transactions = try context.fetch(FetchDescriptor<Transaction>())

        let entertainment = try #require(categories.first { $0.name == "娱乐" && $0.parentID == nil })

        let entertainmentSubs = categories.filter { $0.parentID == entertainment.id }
        let subIDs = Set(entertainmentSubs.map(\.id))

        let allDescendantIDs = collectDescendantIDs(of: entertainment.id, in: categories)
        let entertainmentTransactions = transactions.filter { tx in
            guard let cat = tx.category else { return false }
            return allDescendantIDs.contains(cat.id) || cat.id == entertainment.id
        }

        #expect(!entertainmentTransactions.isEmpty, "娱乐下无交易")

        let directOnParent = entertainmentTransactions.filter { $0.category?.id == entertainment.id }
        #expect(directOnParent.isEmpty, "存在直接挂在娱乐上的交易: \(directOnParent.count) 条")

        let onSubs = entertainmentTransactions.filter { tx in
            guard let cat = tx.category else { return false }
            return subIDs.contains(cat.id)
        }
        let onGrandchildren = entertainmentTransactions.filter { tx in
            guard let cat = tx.category else { return false }
            return !subIDs.contains(cat.id) && cat.id != entertainment.id
        }

        #expect(onSubs.isEmpty, "存在挂在娱乐直接子分类上的交易: \(onSubs.count) 条")
        #expect(!onGrandchildren.isEmpty, "无孙子分类交易")
    }

    @Test func drillDown_entertainment_rendersNonNilSlicesForCurrentMonth() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)
        try SampleDataService.populate(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        let transactions = try context.fetch(FetchDescriptor<Transaction>())

        let entertainment = try #require(categories.first { $0.name == "娱乐" && $0.parentID == nil })

        let currentMonthTxs = transactions.filter { Calendar.current.isDate($0.date, equalTo: Date(), toGranularity: .month) }

        let siblings = categories
            .filter { $0.typeRaw == "expense" && $0.parentID == entertainment.id }
            .sorted { $0.sortOrder < $1.sortOrder }

        func collectDescendants(_ id: UUID) -> Set<UUID> {
            var result: Set<UUID> = []
            for child in categories where child.parentID == id {
                result.insert(child.id)
                result.formUnion(collectDescendants(child.id))
            }
            return result
        }

        func amount(for cat: Category) -> Decimal {
            var ids = collectDescendants(cat.id)
            ids.insert(cat.id)
            return currentMonthTxs
                .filter { $0.type == .expense }
                .filter { $0.category.map { ids.contains($0.id) } ?? false }
                .reduce(0) { $0 + $1.amount }
        }

        let directParentAmount = currentMonthTxs
            .filter { $0.type == .expense }
            .filter { $0.category?.id == entertainment.id }
            .reduce(0) { $0 + $1.amount }

        let nonNilSlices = siblings
            .map { (cat: $0, amount: amount(for: $0)) }
            .filter { $0.amount > 0 }

        #expect(directParentAmount == 0, "当月有直接挂在娱乐上的交易: \(directParentAmount)")
        #expect(!nonNilSlices.isEmpty, "当月娱乐下没有子分类交易 — siblings=\(siblings.map(\.name))")
        #expect(nonNilSlices.allSatisfy { $0.cat.name != "未分类" }, "切片错误地包含未分类")
    }

    private func collectDescendantIDs(of id: UUID, in categories: [Category]) -> Set<UUID> {
        var result: Set<UUID> = []
        for child in categories where child.parentID == id {
            result.insert(child.id)
            result.formUnion(collectDescendantIDs(of: child.id, in: categories))
        }
        return result
    }
}
