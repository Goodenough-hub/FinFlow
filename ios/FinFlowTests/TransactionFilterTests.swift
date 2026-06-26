import Testing
import Foundation
@testable import FinFlow

@MainActor
struct TransactionFilterTests {
    private func makeTransaction(
        amount: Decimal,
        type: TransactionType = .expense,
        note: String = "",
        categoryName: String? = nil,
        accountName: String? = nil
    ) -> Transaction {
        let category = categoryName.map { Category(name: $0, type: .expense, icon: "tag.fill", colorHex: "#3B82F6") }
        let account = accountName.map { Account(name: $0, type: .other) }
        return Transaction(amount: amount, type: type, note: note, category: category, account: account)
    }

    // MARK: - Empty / Whitespace

    @Test func filter_emptyQuery_returnsAll() {
        let txs = [makeTransaction(amount: 100), makeTransaction(amount: 200)]
        #expect(TransactionFilter.filter(txs, query: "").count == 2)
        #expect(TransactionFilter.filter(txs, query: "   ").count == 2)
    }

    @Test func parseTokens_emptyQuery_returnsEmpty() {
        #expect(TransactionFilter.parseTokens("").isEmpty)
        #expect(TransactionFilter.parseTokens("   ").isEmpty)
    }

    // MARK: - Text token

    @Test func filter_textMatch_noteContains() {
        let txs = [
            makeTransaction(amount: 100, note: "午餐面条"),
            makeTransaction(amount: 200, note: "打车回家"),
            makeTransaction(amount: 300, note: "午餐沙拉"),
        ]
        let result = TransactionFilter.filter(txs, query: "午餐")
        #expect(result.count == 2)
        #expect(result.allSatisfy { $0.note.contains("午餐") })
    }

    @Test func filter_textMatch_categoryContains() {
        let txs = [
            makeTransaction(amount: 100, categoryName: "餐饮"),
            makeTransaction(amount: 200, categoryName: "交通"),
            makeTransaction(amount: 300, categoryName: "餐饮"),
        ]
        let result = TransactionFilter.filter(txs, query: "餐饮")
        #expect(result.count == 2)
    }

    @Test func filter_textMatch_caseInsensitive() {
        let txs = [
            makeTransaction(amount: 100, note: "Starbucks Coffee"),
            makeTransaction(amount: 200, note: "Tea"),
        ]
        #expect(TransactionFilter.filter(txs, query: "starbucks").count == 1)
        #expect(TransactionFilter.filter(txs, query: "COFFEE").count == 1)
    }

    @Test func filter_textNoMatch_returnsEmpty() {
        let txs = [makeTransaction(amount: 100, note: "午餐")]
        #expect(TransactionFilter.filter(txs, query: "xyz").isEmpty)
    }

    // MARK: - Exact amount

    @Test func filter_exactAmount_returnsMatched() {
        let txs = [
            makeTransaction(amount: 38.5),
            makeTransaction(amount: 100),
            makeTransaction(amount: 38.5),
        ]
        let result = TransactionFilter.filter(txs, query: "38.5")
        #expect(result.count == 2)
        #expect(result.allSatisfy { $0.amount == 38.5 })
    }

    @Test func filter_exactAmountWithComma_returnsMatched() {
        let txs = [makeTransaction(amount: 100), makeTransaction(amount: 200)]
        let result = TransactionFilter.filter(txs, query: "100,0")
        #expect(result.count == 1)
        #expect(result.first?.amount == 100)
    }

    @Test func filter_exactAmountNoMatch_fallsBackToEmpty() {
        let txs = [makeTransaction(amount: 100, note: "test"), makeTransaction(amount: 200)]
        let result = TransactionFilter.filter(txs, query: "999")
        #expect(result.isEmpty)
    }

    // MARK: - Amount range

    @Test func filter_amountRange_dash() {
        let txs = [
            makeTransaction(amount: 50),
            makeTransaction(amount: 100),
            makeTransaction(amount: 200),
            makeTransaction(amount: 500),
        ]
        let result = TransactionFilter.filter(txs, query: "100-300")
        #expect(result.count == 2)
    }

    @Test func filter_amountRange_tilde() {
        let txs = [makeTransaction(amount: 50), makeTransaction(amount: 150), makeTransaction(amount: 250)]
        #expect(TransactionFilter.filter(txs, query: "100~200").count == 1)
    }

    @Test func filter_amountRange_chineseSep() {
        let txs = [makeTransaction(amount: 100), makeTransaction(amount: 200), makeTransaction(amount: 300)]
        #expect(TransactionFilter.filter(txs, query: "100至300").count == 3)
    }

    @Test func filter_amountRange_withSpacesAroundSeparator() {
        let txs = [makeTransaction(amount: 100), makeTransaction(amount: 300), makeTransaction(amount: 500)]
        #expect(TransactionFilter.filter(txs, query: "100-300").count == 2)
    }

    @Test func filter_amountRange_reversed_returnsEmpty() {
        let txs = [makeTransaction(amount: 100), makeTransaction(amount: 200)]
        #expect(TransactionFilter.filter(txs, query: "500-100").isEmpty)
    }

    // MARK: - Amount comparison

    @Test func filter_amountGreaterThan() {
        let txs = [makeTransaction(amount: 50), makeTransaction(amount: 100), makeTransaction(amount: 200)]
        let result = TransactionFilter.filter(txs, query: ">100")
        #expect(result.count == 1)
        #expect(result.first?.amount == 200)
    }

    @Test func filter_amountGreaterThanOrEqual() {
        let txs = [makeTransaction(amount: 50), makeTransaction(amount: 100), makeTransaction(amount: 200)]
        let result = TransactionFilter.filter(txs, query: ">=100")
        #expect(result.count == 2)
    }

    @Test func filter_amountLessThan() {
        let txs = [makeTransaction(amount: 50), makeTransaction(amount: 100), makeTransaction(amount: 200)]
        let result = TransactionFilter.filter(txs, query: "<100")
        #expect(result.count == 1)
        #expect(result.first?.amount == 50)
    }

    @Test func filter_amountLessThanOrEqual() {
        let txs = [makeTransaction(amount: 50), makeTransaction(amount: 100), makeTransaction(amount: 200)]
        let result = TransactionFilter.filter(txs, query: "<=100")
        #expect(result.count == 2)
    }

    // MARK: - Type filter

    @Test func filter_typeExpense_english() {
        let txs = [
            makeTransaction(amount: 100, type: .expense),
            makeTransaction(amount: 200, type: .income),
            makeTransaction(amount: 300, type: .expense),
        ]
        let result = TransactionFilter.filter(txs, query: "type:expense")
        #expect(result.count == 2)
        #expect(result.allSatisfy { $0.type == .expense })
    }

    @Test func filter_typeIncome_chinese() {
        let txs = [
            makeTransaction(amount: 100, type: .expense),
            makeTransaction(amount: 200, type: .income),
        ]
        let result = TransactionFilter.filter(txs, query: "type:收入")
        #expect(result.count == 1)
        #expect(result.first?.type == .income)
    }

    @Test func filter_typeInvalid_returnsEmpty() {
        let txs = [makeTransaction(amount: 100)]
        #expect(TransactionFilter.filter(txs, query: "type:invalid").count == 1)
    }

    // MARK: - Field-specific text

    @Test func filter_categoryField_match() {
        let txs = [
            makeTransaction(amount: 100, note: "其他", categoryName: "餐饮"),
            makeTransaction(amount: 200, note: "餐饮", categoryName: "交通"),
        ]
        let result = TransactionFilter.filter(txs, query: "cat:餐饮")
        #expect(result.count == 1)
        #expect(result.first?.category?.name == "餐饮")
    }

    @Test func filter_categoryFieldAlias() {
        let txs = [makeTransaction(amount: 100, categoryName: "餐饮")]
        #expect(TransactionFilter.filter(txs, query: "category:餐").count == 1)
    }

    @Test func filter_noteField_match() {
        let txs = [
            makeTransaction(amount: 100, note: "午餐面条"),
            makeTransaction(amount: 200, note: "打车"),
        ]
        #expect(TransactionFilter.filter(txs, query: "note:面条").count == 1)
    }

    @Test func filter_accountField_match() {
        let txs = [
            makeTransaction(amount: 100, accountName: "支付宝"),
            makeTransaction(amount: 200, accountName: "微信"),
        ]
        let result = TransactionFilter.filter(txs, query: "acc:支付宝")
        #expect(result.count == 1)
        #expect(result.first?.account?.name == "支付宝")
    }

    @Test func filter_accountFieldAlias() {
        let txs = [makeTransaction(amount: 100, accountName: "支付宝")]
        #expect(TransactionFilter.filter(txs, query: "account:支付").count == 1)
    }

    @Test func filter_fieldWithoutValue_returnsAll() {
        let txs = [makeTransaction(amount: 100)]
        #expect(TransactionFilter.filter(txs, query: "cat:").count == 1)
    }

    @Test func filter_unknownField_returnsAll() {
        let txs = [makeTransaction(amount: 100)]
        #expect(TransactionFilter.filter(txs, query: "foo:bar").count == 1)
    }

    // MARK: - Combination (AND)

    @Test func filter_combinedTextAndAmountRange() {
        let txs = [
            makeTransaction(amount: 50, note: "午餐"),
            makeTransaction(amount: 100, note: "午餐"),
            makeTransaction(amount: 500, note: "午餐"),
            makeTransaction(amount: 100, note: "打车"),
        ]
        let result = TransactionFilter.filter(txs, query: "午餐 100-500")
        #expect(result.count == 2)
        #expect(result.allSatisfy { $0.note.contains("午餐") && $0.amount >= 100 && $0.amount <= 500 })
    }

    @Test func filter_combinedCategoryTypeAndAmount() {
        let txs = [
            makeTransaction(amount: 50, type: .expense, categoryName: "餐饮"),
            makeTransaction(amount: 200, type: .expense, categoryName: "餐饮"),
            makeTransaction(amount: 200, type: .income, categoryName: "餐饮"),
            makeTransaction(amount: 200, type: .expense, categoryName: "交通"),
        ]
        let result = TransactionFilter.filter(txs, query: "cat:餐饮 type:支出 >100")
        #expect(result.count == 1)
        #expect(result.first?.amount == 200)
        #expect(result.first?.type == .expense)
        #expect(result.first?.category?.name == "餐饮")
    }

    @Test func filter_combinedAccountAndNote() {
        let txs = [
            makeTransaction(amount: 100, note: "咖啡", accountName: "支付宝"),
            makeTransaction(amount: 200, note: "咖啡", accountName: "微信"),
            makeTransaction(amount: 100, note: "茶", accountName: "支付宝"),
        ]
        let result = TransactionFilter.filter(txs, query: "acc:支付宝 note:咖啡")
        #expect(result.count == 1)
        #expect(result.first?.account?.name == "支付宝")
    }

    @Test func filter_combinedWithNoMatch_returnsEmpty() {
        let txs = [makeTransaction(amount: 100, note: "午餐")]
        #expect(TransactionFilter.filter(txs, query: "午餐 type:收入").isEmpty)
    }

    // MARK: - Token parsing

    @Test func token_text_isTextCase() {
        #expect(TransactionFilter.Token("午餐") == .text("午餐"))
        #expect(TransactionFilter.Token("abc") == .text("abc"))
    }

    @Test func token_exactAmount_isExactAmountCase() {
        #expect(TransactionFilter.Token("100") == .exactAmount(100))
        #expect(TransactionFilter.Token("38.5") == .exactAmount(38.5))
    }

    @Test func token_amountRange_isRangeCase() {
        #expect(TransactionFilter.Token("100-200") == .amountRange(100, 200))
        #expect(TransactionFilter.Token("100~200") == .amountRange(100, 200))
    }

    @Test func token_comparison_isComparisonCase() {
        #expect(TransactionFilter.Token(">100") == .amountComparison(.gt, 100))
        #expect(TransactionFilter.Token(">=100") == .amountComparison(.gte, 100))
        #expect(TransactionFilter.Token("<100") == .amountComparison(.lt, 100))
        #expect(TransactionFilter.Token("<=100") == .amountComparison(.lte, 100))
    }

    @Test func token_typeField_isTypeCase() {
        #expect(TransactionFilter.Token("type:expense") == .type(.expense))
        #expect(TransactionFilter.Token("type:支出") == .type(.expense))
        #expect(TransactionFilter.Token("type:income") == .type(.income))
        #expect(TransactionFilter.Token("type:收入") == .type(.income))
    }

    @Test func token_categoryField_isCategoryCase() {
        #expect(TransactionFilter.Token("cat:餐饮") == .category("餐饮"))
        #expect(TransactionFilter.Token("category:餐饮") == .category("餐饮"))
    }

    @Test func token_noteField_isNoteCase() {
        #expect(TransactionFilter.Token("note:面条") == .note("面条"))
    }

    @Test func token_accountField_isAccountCase() {
        #expect(TransactionFilter.Token("acc:支付宝") == .account("支付宝"))
        #expect(TransactionFilter.Token("account:支付宝") == .account("支付宝"))
    }

    @Test func token_invalidType_returnsNil() {
        #expect(TransactionFilter.Token("type:invalid") == nil)
    }

    @Test func token_emptyValue_returnsNil() {
        #expect(TransactionFilter.Token("cat:") == nil)
    }

    @Test func token_unknownField_returnsNil() {
        #expect(TransactionFilter.Token("foo:bar") == nil)
    }

    // MARK: - parseRange

    @Test func parseRange_validDash() {
        let r = TransactionFilter.Token.parseRange("100-500")
        #expect(r?.lower == 100)
        #expect(r?.upper == 500)
    }

    @Test func parseRange_validTilde() {
        let r = TransactionFilter.Token.parseRange("100~500")
        #expect(r?.lower == 100)
        #expect(r?.upper == 500)
    }

    @Test func parseRange_validChineseSep() {
        let r = TransactionFilter.Token.parseRange("100至500")
        #expect(r?.lower == 100)
        #expect(r?.upper == 500)
    }

    @Test func parseRange_withSpaces() {
        let r = TransactionFilter.Token.parseRange("100 - 500")
        #expect(r?.lower == 100)
        #expect(r?.upper == 500)
    }

    @Test func parseRange_reversedBounds_returnsNil() {
        #expect(TransactionFilter.Token.parseRange("500-100") == nil)
    }

    @Test func parseRange_singleNumber_returnsNil() {
        #expect(TransactionFilter.Token.parseRange("100") == nil)
    }

    @Test func parseRange_nonNumeric_returnsNil() {
        #expect(TransactionFilter.Token.parseRange("abc-def") == nil)
    }

    @Test func parseRange_invalidBounds_returnsNil() {
        #expect(TransactionFilter.Token.parseRange("100-") == nil)
        #expect(TransactionFilter.Token.parseRange("-100") == nil)
    }

    // MARK: - Operator

    @Test func operator_gt() {
        #expect(TransactionFilter.Operator.gt.evaluate(200, 100) == true)
        #expect(TransactionFilter.Operator.gt.evaluate(100, 100) == false)
        #expect(TransactionFilter.Operator.gt.evaluate(50, 100) == false)
    }

    @Test func operator_gte() {
        #expect(TransactionFilter.Operator.gte.evaluate(200, 100) == true)
        #expect(TransactionFilter.Operator.gte.evaluate(100, 100) == true)
        #expect(TransactionFilter.Operator.gte.evaluate(50, 100) == false)
    }

    @Test func operator_lt() {
        #expect(TransactionFilter.Operator.lt.evaluate(50, 100) == true)
        #expect(TransactionFilter.Operator.lt.evaluate(100, 100) == false)
        #expect(TransactionFilter.Operator.lt.evaluate(200, 100) == false)
    }

    @Test func operator_lte() {
        #expect(TransactionFilter.Operator.lte.evaluate(50, 100) == true)
        #expect(TransactionFilter.Operator.lte.evaluate(100, 100) == true)
        #expect(TransactionFilter.Operator.lte.evaluate(200, 100) == false)
    }
}
