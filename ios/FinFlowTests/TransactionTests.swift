import Testing
import Foundation
@testable import FinFlow

@MainActor
struct TransactionTests {
    @Test func amount_negativeInput_storedAsAbsolute() {
        let tx = Transaction(amount: -100, type: .income)
        #expect(tx.amount == 100)
    }

    @Test func signedAmount_income_isPositive() {
        let tx = Transaction(amount: 100, type: .income)
        #expect(tx.signedAmount == 100)
    }

    @Test func signedAmount_expense_isNegative() {
        let tx = Transaction(amount: 100, type: .expense)
        #expect(tx.signedAmount == -100)
    }

    @Test func signedAmount_transfer_isZero() {
        let tx = Transaction(amount: 100, type: .transfer)
        #expect(tx.signedAmount == 0)
    }

    @Test func transferType_displayName() {
        #expect(TransactionType.transfer.displayName == "转账")
    }

    @Test func init_transferWithToAccount_preservesAccounts() {
        let src = Account(name: "支付宝", type: .alipay)
        let dst = Account(name: "交通卡", type: .transit)
        let tx = Transaction(amount: 100, type: .transfer, account: src, toAccount: dst)
        #expect(tx.type == .transfer)
        #expect(tx.account?.id == src.id)
        #expect(tx.toAccount?.id == dst.id)
    }

    @Test func type_fromRawValue_returnsCorrectEnum() {
        let tx = Transaction(amount: 10, type: .expense)
        tx.typeRaw = "income"
        #expect(tx.type == .income)
    }

    @Test func type_invalidRawValue_fallsBackToExpense() {
        let tx = Transaction(amount: 10, type: .income)
        tx.typeRaw = "garbage"
        #expect(tx.type == .expense)
    }

    @Test func isFromRecurring_nilSourceID_returnsFalse() {
        let tx = Transaction(amount: 10, type: .expense)
        #expect(tx.isFromRecurring == false)
    }

    @Test func isFromRecurring_withSourceID_returnsTrue() {
        let id = UUID()
        let tx = Transaction(amount: 10, type: .expense, sourceID: id, sourceType: "recurring")
        #expect(tx.isFromRecurring == true)
    }

    @Test func init_withNoteAndDate_preservesValues() {
        let note = "午餐 面条"
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        let tx = Transaction(amount: 38.5, type: .expense, note: note, date: date)
        #expect(tx.note == note)
        #expect(tx.date == date)
        #expect(tx.amount == 38.5)
    }

    @Test func init_defaultVendor_isNil() {
        let tx = Transaction(amount: 100, type: .expense)
        #expect(tx.vendor == nil)
    }

    @Test func init_withVendor_preservesValue() {
        let tx = Transaction(amount: 50, type: .expense, vendor: "高德")
        #expect(tx.vendor == "高德")
    }
}
