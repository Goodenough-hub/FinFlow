import Foundation

enum TransactionFilter {
    static func filter(_ transactions: [Transaction], query: String) -> [Transaction] {
        let tokens = parseTokens(query)
        guard !tokens.isEmpty else { return transactions }
        return transactions.filter { tx in
            tokens.allSatisfy { $0.matches(tx) }
        }
    }

    static func parseTokens(_ query: String) -> [Token] {
        query.split(separator: " ", omittingEmptySubsequences: true)
            .compactMap { Token(String($0)) }
    }

    enum Token: Equatable {
        case text(String)
        case exactAmount(Decimal)
        case amountRange(Decimal, Decimal)
        case amountComparison(Operator, Decimal)
        case type(TransactionType)
        case category(String)
        case note(String)
        case account(String)

        init?(_ raw: String) {
            let trimmed = raw.trimmingCharacters(in: .whitespaces)
            guard !trimmed.isEmpty else { return nil }

            if let colonIndex = trimmed.firstIndex(of: ":") {
                let key = String(trimmed[..<colonIndex]).lowercased()
                let value = String(trimmed[trimmed.index(after: colonIndex)...])
                guard !value.isEmpty else { return nil }
                switch key {
                case "type", "类型":
                    if let t = Self.parseType(value) { self = .type(t); return }
                    return nil
                case "cat", "category", "分类":
                    self = .category(value); return
                case "note", "备注":
                    self = .note(value); return
                case "acc", "account", "账户":
                    self = .account(value); return
                default:
                    return nil
                }
            }

            if let op = Operator(rawValue: String(trimmed.prefix(2))), let value = Decimal(string: String(trimmed.dropFirst(2))) {
                self = .amountComparison(op, value); return
            }
            if let op = Operator(rawValue: String(trimmed.prefix(1))), let value = Decimal(string: String(trimmed.dropFirst(1))) {
                self = .amountComparison(op, value); return
            }

            if let range = Self.parseRange(trimmed) {
                self = .amountRange(range.lower, range.upper); return
            }

            if let amount = Decimal(string: trimmed.replacingOccurrences(of: ",", with: ".")) {
                self = .exactAmount(amount); return
            }

            self = .text(trimmed)
        }

        static func parseType(_ value: String) -> TransactionType? {
            switch value.lowercased() {
            case "expense", "支出": return .expense
            case "income", "收入": return .income
            default: return nil
            }
        }

        static func parseRange(_ text: String) -> (lower: Decimal, upper: Decimal)? {
            let separators = ["-", "~", "至", "到"]
            for sep in separators {
                if text.contains(sep) {
                    let parts = text.components(separatedBy: sep)
                        .map { $0.trimmingCharacters(in: .whitespaces) }
                    if parts.count == 2,
                       let lower = Decimal(string: parts[0].replacingOccurrences(of: ",", with: ".")),
                       let upper = Decimal(string: parts[1].replacingOccurrences(of: ",", with: ".")),
                       lower <= upper {
                        return (lower, upper)
                    }
                }
            }
            return nil
        }

        func matches(_ tx: Transaction) -> Bool {
            switch self {
            case .text(let q):
                let lower = q.lowercased()
                if tx.note.lowercased().contains(lower) { return true }
                if let cat = tx.category, cat.name.lowercased().contains(lower) { return true }
                return false
            case .exactAmount(let amount):
                return tx.amount == amount
            case .amountRange(let lower, let upper):
                return tx.amount >= lower && tx.amount <= upper
            case .amountComparison(let op, let value):
                return op.evaluate(tx.amount, value)
            case .type(let t):
                return tx.type == t
            case .category(let q):
                guard let cat = tx.category else { return false }
                return cat.name.lowercased().contains(q.lowercased())
            case .note(let q):
                return tx.note.lowercased().contains(q.lowercased())
            case .account(let q):
                guard let acc = tx.account else { return false }
                return acc.name.lowercased().contains(q.lowercased())
            }
        }
    }

    enum Operator: String {
        case gt = ">"
        case gte = ">="
        case lt = "<"
        case lte = "<="

        func evaluate(_ amount: Decimal, _ value: Decimal) -> Bool {
            switch self {
            case .gt: return amount > value
            case .gte: return amount >= value
            case .lt: return amount < value
            case .lte: return amount <= value
            }
        }
    }
}
