import Foundation

extension Account {
    static func balance(for account: Account, in transactions: [Transaction]) -> Decimal {
        var balance = account.initialBalance
        for tx in transactions {
            let isSource = tx.account?.id == account.id
            let isDest = tx.toAccount?.id == account.id
            guard isSource || isDest else { continue }
            switch tx.type {
            case .transfer:
                if isSource { balance -= tx.amount }
                if isDest { balance += tx.amount }
            case .income:
                if isSource { balance += tx.amount }
            case .expense:
                if isSource { balance -= tx.amount }
            }
        }
        return balance
    }
}
