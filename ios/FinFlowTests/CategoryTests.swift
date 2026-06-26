import Testing
import Foundation
@testable import FinFlow

@MainActor
struct CategoryTests {
    @Test func init_defaultParentID_isNil() {
        let cat = Category(name: "测试", type: .expense, icon: "tag.fill", colorHex: "#3B82F6")
        #expect(cat.parentID == nil)
    }

    @Test func init_withParentID_preservesValue() {
        let parentID = UUID()
        let cat = Category(name: "地铁", type: .expense, icon: "tram.fill", colorHex: "#3B82F6", parentID: parentID)
        #expect(cat.parentID == parentID)
    }

    @Test func categoryType_displayName() {
        #expect(CategoryType.expense.displayName == "支出")
        #expect(CategoryType.income.displayName == "收入")
    }
}
