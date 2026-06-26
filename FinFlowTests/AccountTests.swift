import Testing
import Foundation
import SwiftUI
@testable import FinFlow

@MainActor
struct AccountTests {
    @Test func defaultValues_alipay() {
        let acc = Account(name: "支付宝", type: .alipay)
        #expect(acc.icon == "a.circle.fill")
        #expect(acc.colorHex == "#1677FF")
        #expect(acc.type == .alipay)
        #expect(acc.initialBalance == 0)
        #expect(acc.isSystem == false)
    }

    @Test func defaultValues_wechat() {
        let acc = Account(name: "微信", type: .wechat)
        #expect(acc.icon == "message.fill")
        #expect(acc.colorHex == "#07C160")
    }

    @Test func defaultValues_unionpay() {
        let acc = Account(name: "云闪付", type: .unionpay)
        #expect(acc.icon == "c.circle.fill")
        #expect(acc.colorHex == "#E60012")
    }

    @Test func defaultValues_fixed() {
        let acc = Account(name: "定期", type: .fixed)
        #expect(acc.icon == "safe.fill")
        #expect(acc.colorHex == "#F59E0B")
    }

    @Test func defaultValues_transit() {
        let acc = Account(name: "交通卡", type: .transit)
        #expect(acc.icon == "tram.fill")
        #expect(acc.colorHex == "#8B5CF6")
        #expect(acc.type == .transit)
    }

    @Test func customIconAndColor_overridesDefaults() {
        let acc = Account(name: "自定义", type: .other, initialBalance: 5000, icon: "wallet.pass.fill", colorHex: "#123456")
        #expect(acc.icon == "wallet.pass.fill")
        #expect(acc.colorHex == "#123456")
        #expect(acc.initialBalance == 5000)
    }

    @Test func color_parsesHexCorrectly() {
        let acc = Account(name: "test", type: .alipay)
        let color = acc.color
        #expect(color != nil)
    }

    @Test func initialBalance_negativeInput_storedAsGiven() {
        let acc = Account(name: "test", type: .other, initialBalance: -100)
        #expect(acc.initialBalance == -100)
    }

    @Test func displayName_forAllTypes_isChinese() {
        #expect(AccountType.alipay.displayName == "支付宝")
        #expect(AccountType.wechat.displayName == "微信")
        #expect(AccountType.unionpay.displayName == "云闪付")
        #expect(AccountType.fixed.displayName == "定期")
        #expect(AccountType.transit.displayName == "交通卡")
        #expect(AccountType.other.displayName == "其他")
    }
}
