import Foundation

struct TransactionFilterCriteria: Equatable {
    var startDate: Date?
    var endDate: Date?
    var minAmount: Decimal?
    var maxAmount: Decimal?
    var type: TransactionType?
    var categoryIDs: Set<UUID> = []
    var accountIDs: Set<UUID> = []
    var noteContains: String?

    init(
        startDate: Date? = nil,
        endDate: Date? = nil,
        minAmount: Decimal? = nil,
        maxAmount: Decimal? = nil,
        type: TransactionType? = nil,
        categoryIDs: Set<UUID> = [],
        accountIDs: Set<UUID> = [],
        noteContains: String? = nil
    ) {
        self.startDate = startDate
        self.endDate = endDate
        self.minAmount = minAmount
        self.maxAmount = maxAmount
        self.type = type
        self.categoryIDs = categoryIDs
        self.accountIDs = accountIDs
        self.noteContains = noteContains?.isEmpty == true ? nil : noteContains
    }

    var isEmpty: Bool {
        startDate == nil
            && endDate == nil
            && minAmount == nil
            && maxAmount == nil
            && type == nil
            && categoryIDs.isEmpty
            && accountIDs.isEmpty
            && noteContains == nil
    }

    var activeCount: Int {
        var n = 0
        if startDate != nil || endDate != nil { n += 1 }
        if minAmount != nil || maxAmount != nil { n += 1 }
        if type != nil { n += 1 }
        if !categoryIDs.isEmpty { n += 1 }
        if !accountIDs.isEmpty { n += 1 }
        if noteContains != nil { n += 1 }
        return n
    }

    func apply(to transactions: [Transaction]) -> [Transaction] {
        guard !isEmpty else { return transactions }
        let noteLower = noteContains?.lowercased()
        return transactions.filter { tx in
            if let startDate, tx.date < startDate { return false }
            if let endDate, tx.date > endDate { return false }
            if let minAmount, tx.amount < minAmount { return false }
            if let maxAmount, tx.amount > maxAmount { return false }
            if let type, tx.type != type { return false }
            if !categoryIDs.isEmpty {
                guard let cat = tx.category, categoryIDs.contains(cat.id) else { return false }
            }
            if !accountIDs.isEmpty {
                guard let acc = tx.account, accountIDs.contains(acc.id) else { return false }
            }
            if let noteLower, !tx.note.lowercased().contains(noteLower) { return false }
            return true
        }
    }
}
