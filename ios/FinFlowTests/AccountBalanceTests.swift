import Testing
import Foundation
@testable import FinFlow

@MainActor
struct AccountBalanceTests {
    private let alipay = Account(name: "支付宝", type: .alipay, initialBalance: 1000)
    private let transit = Account(name: "交通卡", type: .transit, initialBalance: 50)

    @Test func balance_noTransactions_returnsInitialBalance() {
        #expect(Account.balance(for: alipay, in: []) == 1000)
        #expect(Account.balance(for: transit, in: []) == 50)
    }

    @Test func balance_income_addsToSourceAccount() {
        let tx = Transaction(amount: 200, type: .income, account: alipay)
        #expect(Account.balance(for: alipay, in: [tx]) == 1200)
    }

    @Test func balance_expense_subtractsFromSourceAccount() {
        let tx = Transaction(amount: 300, type: .expense, account: alipay)
        #expect(Account.balance(for: alipay, in: [tx]) == 700)
    }

    @Test func balance_transfer_decreasesSource_increasesDestination() {
        let tx = Transaction(amount: 100, type: .transfer, account: alipay, toAccount: transit)
        #expect(Account.balance(for: alipay, in: [tx]) == 900)
        #expect(Account.balance(for: transit, in: [tx]) == 150)
    }

    @Test func balance_transfer_excludesUnrelatedAccounts() {
        let other = Account(name: "微信", type: .wechat, initialBalance: 500)
        let tx = Transaction(amount: 100, type: .transfer, account: alipay, toAccount: transit)
        #expect(Account.balance(for: other, in: [tx]) == 500)
    }

    @Test func balance_mixedTransactions_aggregatesCorrectly() {
        let txs = [
            Transaction(amount: 500, type: .income, account: alipay),
            Transaction(amount: 200, type: .expense, account: alipay),
            Transaction(amount: 80, type: .transfer, account: alipay, toAccount: transit),
            Transaction(amount: 10, type: .expense, account: transit),
        ]
        #expect(Account.balance(for: alipay, in: txs) == 1220)
        #expect(Account.balance(for: transit, in: txs) == 120)
    }

    @Test func balance_transferToSelf_noNetChange() {
        let tx = Transaction(amount: 100, type: .transfer, account: alipay, toAccount: alipay)
        #expect(Account.balance(for: alipay, in: [tx]) == 1000)
    }
}
