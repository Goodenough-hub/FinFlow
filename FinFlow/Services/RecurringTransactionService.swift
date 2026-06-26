import Foundation
import SwiftData

enum RecurringTransactionService {
    private static let horizon: TimeInterval = 90 * 24 * 3600

    static func generateUpcoming(context: ModelContext, asOf reference: Date = .now) {
        let descriptor = FetchDescriptor<RecurringTransaction>(
            predicate: #Predicate { $0.isActive }
        )
        guard let items = try? context.fetch(descriptor) else { return }

        let horizonDate = reference.addingTimeInterval(horizon)
        let cal = Calendar.current

        for recurring in items {
            guard let rule = recurring.recurrenceRule else { continue }
            if let end = recurring.endDate, end < reference { continue }

            var cursor = recurring.lastGeneratedDate ?? cal.startOfDay(for: recurring.startDate)
            if cursor < cal.startOfDay(for: recurring.startDate) {
                cursor = cal.startOfDay(for: recurring.startDate)
            }

            while cursor <= horizonDate {
                if let end = recurring.endDate, cursor > end { break }
                if cursor >= cal.startOfDay(for: reference) {
                    let existing = fetchTransaction(context: context, sourceID: recurring.id, date: cursor)
                    if existing == nil {
                        let tx = Transaction(
                            amount: recurring.amount,
                            type: recurring.type,
                            note: recurring.note,
                            date: cursor,
                            category: recurring.category,
                            account: recurring.account,
                            sourceID: recurring.id,
                            sourceType: "recurring"
                        )
                        context.insert(tx)
                    }
                }
                guard let next = nextDate(after: cursor, rule: rule, calendar: cal) else { break }
                cursor = next
            }
            recurring.lastGeneratedDate = cursor
        }

        try? context.save()
    }

    static func removeFutureInstances(for recurringID: UUID, context: ModelContext, asOf reference: Date = .now) {
        let descriptor = FetchDescriptor<Transaction>(
            predicate: #Predicate { $0.sourceID == recurringID }
        )
        guard let txs = try? context.fetch(descriptor) else { return }
        let cutoff = Calendar.current.startOfDay(for: reference)
        for tx in txs where tx.date >= cutoff {
            context.delete(tx)
        }
        try? context.save()
    }

    private static func fetchTransaction(context: ModelContext, sourceID: UUID, date: Date) -> Transaction? {
        let cal = Calendar.current
        let dayStart = cal.startOfDay(for: date)
        let dayEnd = cal.date(byAdding: .day, value: 1, to: dayStart) ?? date.addingTimeInterval(86400)
        let descriptor = FetchDescriptor<Transaction>(
            predicate: #Predicate { $0.sourceID == sourceID && $0.date >= dayStart && $0.date < dayEnd }
        )
        return try? context.fetch(descriptor).first
    }

    private static func nextDate(after date: Date, rule: RecurrenceRule, calendar: Calendar) -> Date? {
        let step = max(rule.interval, 1)
        switch rule.frequency {
        case .daily:
            return calendar.date(byAdding: .day, value: step, to: date)
        case .weekly:
            return calendar.date(byAdding: .weekOfYear, value: step, to: date)
        case .monthly:
            return calendar.date(byAdding: .month, value: step, to: date)
        case .yearly:
            return calendar.date(byAdding: .year, value: step, to: date)
        }
    }

    static func nextDueDate(for recurring: RecurringTransaction, after reference: Date = .now) -> Date? {
        guard let rule = recurring.recurrenceRule else { return nil }
        let cal = Calendar.current
        var cursor = recurring.lastGeneratedDate ?? cal.startOfDay(for: recurring.startDate)
        if cursor < cal.startOfDay(for: reference) {
            cursor = cal.startOfDay(for: reference)
        }
        while cursor <= reference.addingTimeInterval(horizon) {
            if cursor >= cal.startOfDay(for: reference) {
                return cursor
            }
            guard let next = nextDate(after: cursor, rule: rule, calendar: cal) else { return nil }
            cursor = next
        }
        return cursor
    }
}
