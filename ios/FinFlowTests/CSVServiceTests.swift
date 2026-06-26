import Testing
import Foundation
import SwiftData
@testable import FinFlow

@MainActor
struct CSVServiceTests {
    private func makeContainer() throws -> ModelContainer {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        return try ModelContainer(
            for: Transaction.self, Category.self, Budget.self, RecurringTransaction.self, Account.self,
            configurations: config
        )
    }

    @Test func export_emptyTransactions_returnsHeaderOnly() {
        let csv = CSVService.export(transactions: [])
        #expect(csv.hasPrefix("\u{FEFF}Date,Type,Category,Amount,Note"))
    }

    @Test func export_singleTransaction_correctFormat() {
        let cat = Category(name: "餐饮", type: .expense, icon: "fork.knife", colorHex: "#FF6B35")
        let date = makeDate(year: 2026, month: 6, day: 1)
        let tx = Transaction(amount: 38.5, type: .expense, note: "午餐", date: date, category: cat)

        let csv = CSVService.export(transactions: [tx])
        let lines = csv.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        #expect(lines.count == 2)
        #expect(lines[1].hasPrefix("2026-06-01,expense,"))
        #expect(lines[1].contains("38.5"))
    }

    @Test func export_noteWithComma_isQuoted() {
        let cat = Category(name: "其他", type: .expense, icon: "tag.fill", colorHex: "#6B7280")
        let tx = Transaction(amount: 100, type: .expense, note: "午餐, 面条, 汤", date: .now, category: cat)
        let csv = CSVService.export(transactions: [tx])
        #expect(csv.contains("\"午餐, 面条, 汤\""))
    }

    @Test func export_noteWithQuote_isEscaped() {
        let cat = Category(name: "其他", type: .expense, icon: "tag.fill", colorHex: "#6B7280")
        let tx = Transaction(amount: 100, type: .expense, note: "say \"hi\"", date: .now, category: cat)
        let csv = CSVService.export(transactions: [tx])
        #expect(csv.contains("\"say \"\"hi\"\"\""))
    }

    @Test func export_sortedByDateAscending() {
        let cat = Category(name: "其他", type: .expense, icon: "tag.fill", colorHex: "#6B7280")
        let date1 = makeDate(year: 2026, month: 6, day: 1)
        let date2 = makeDate(year: 2026, month: 5, day: 1)
        let tx1 = Transaction(amount: 10, type: .expense, date: date1, category: cat)
        let tx2 = Transaction(amount: 20, type: .expense, date: date2, category: cat)

        let csv = CSVService.export(transactions: [tx1, tx2])
        let lines = csv.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        #expect(lines[1].hasPrefix("2026-05-01"))
        #expect(lines[2].hasPrefix("2026-06-01"))
    }

    @Test func importCSV_validRows_createsTransactions() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = Category(name: "餐饮", type: .expense, icon: "fork.knife", colorHex: "#FF6B35")
        context.insert(cat)
        try context.save()

        let csv = "Date,Type,Category,Amount,Note\n2026-06-01,expense,餐饮,38.5,午餐\n2026-06-02,income,工资,5000,六月工资"
        let data = Data(csv.utf8)

        let count = try CSVService.importCSV(from: data, context: context)
        #expect(count == 2)

        let txs = try context.fetch(FetchDescriptor<Transaction>())
        #expect(txs.count == 2)
    }

    @Test func importCSV_unknownCategory_fallsBackToCategoryOfType() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = Category(name: "其他", type: .expense, icon: "tag.fill", colorHex: "#6B7280")
        context.insert(cat)
        try context.save()

        let csv = "Date,Type,Category,Amount,Note\n2026-06-01,expense,不存在,100,test"
        let data = Data(csv.utf8)

        let count = try CSVService.importCSV(from: data, context: context)
        #expect(count == 1)

        let txs = try context.fetch(FetchDescriptor<Transaction>())
        #expect(txs.first?.category?.name == "其他")
    }

    @Test func importCSV_invalidAmount_rowSkipped() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = Category(name: "餐饮", type: .expense, icon: "fork.knife", colorHex: "#FF6B35")
        context.insert(cat)
        try context.save()

        let csv = "Date,Type,Category,Amount,Note\n2026-06-01,expense,餐饮,abc,无效\n2026-06-02,expense,餐饮,50,有效"
        let data = Data(csv.utf8)

        let count = try CSVService.importCSV(from: data, context: context)
        #expect(count == 1)
    }

    @Test func importCSV_invalidType_rowSkipped() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = Category(name: "餐饮", type: .expense, icon: "fork.knife", colorHex: "#FF6B35")
        context.insert(cat)
        try context.save()

        let csv = "Date,Type,Category,Amount,Note\n2026-06-01,invalid,餐饮,50,test"
        let data = Data(csv.utf8)

        let count = try CSVService.importCSV(from: data, context: context)
        #expect(count == 0)
    }

    @Test func importCSV_invalidDate_rowSkipped() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = Category(name: "餐饮", type: .expense, icon: "fork.knife", colorHex: "#FF6B35")
        context.insert(cat)
        try context.save()

        let csv = "Date,Type,Category,Amount,Note\nnot-a-date,expense,餐饮,50,test"
        let data = Data(csv.utf8)

        let count = try CSVService.importCSV(from: data, context: context)
        #expect(count == 0)
    }

    @Test func importCSV_emptyFile_throwsError() throws {
        let container = try makeContainer()
        let context = ModelContext(container)

        #expect(throws: CSVError.self) {
            try CSVService.importCSV(from: Data(), context: context)
        }
    }

    @Test func importCSV_withBOM_isHandled() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = Category(name: "餐饮", type: .expense, icon: "fork.knife", colorHex: "#FF6B35")
        context.insert(cat)
        try context.save()

        let csv = "\u{FEFF}Date,Type,Category,Amount,Note\n2026-06-01,expense,餐饮,38.5,午餐"
        let data = Data(csv.utf8)

        let count = try CSVService.importCSV(from: data, context: context)
        #expect(count == 1)
    }

    @Test func makeExportFileURL_returnsValidURL() throws {
        let url = try CSVService.makeExportFileURL(transactions: [])
        #expect(url.pathExtension == "csv")
        #expect(url.lastPathComponent.hasPrefix("FinFlow_Export_"))
        #expect(FileManager.default.fileExists(atPath: url.path))
    }

    @Test func roundTrip_exportThenImport_preservesData() throws {
        let container = try makeContainer()
        let context = ModelContext(container)
        let cat = Category(name: "餐饮", type: .expense, icon: "fork.knife", colorHex: "#FF6B35")
        context.insert(cat)
        try context.save()

        let original = Transaction(amount: 38.5, type: .expense, note: "午餐", date: makeDate(year: 2026, month: 6, day: 1), category: cat)
        context.insert(original)
        try context.save()

        let csv = CSVService.export(transactions: [original])

        let container2 = try makeContainer()
        let context2 = ModelContext(container2)
        let cat2 = Category(name: "餐饮", type: .expense, icon: "fork.knife", colorHex: "#FF6B35")
        context2.insert(cat2)
        try context2.save()

        let count = try CSVService.importCSV(from: Data(csv.utf8), context: context2)
        #expect(count == 1)

        let txs = try context2.fetch(FetchDescriptor<Transaction>())
        #expect(txs.first?.amount == 38.5)
        #expect(txs.first?.type == .expense)
        #expect(txs.first?.note == "午餐")
    }

    private func makeDate(year: Int, month: Int, day: Int) -> Date {
        var comps = DateComponents()
        comps.year = year
        comps.month = month
        comps.day = day
        return Calendar(identifier: .gregorian).date(from: comps)!
    }
}
