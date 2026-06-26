import Testing
import Foundation
import SwiftData
@testable import FinFlow

@MainActor
struct SeedDataServiceTests {
    private func makeContainer() throws -> ModelContainer {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        return try ModelContainer(
            for: Transaction.self, Category.self, Budget.self, RecurringTransaction.self, Account.self,
            configurations: config
        )
    }

    private func resetSeedState() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "finflow.categories.seeded.v1")
        defaults.removeObject(forKey: "finflow.categories.seeded.v2")
        defaults.removeObject(forKey: "finflow.categories.seeded.v3")
        defaults.removeObject(forKey: "finflow.accounts.seeded.v1")
    }

    @Test func seedIfNeeded_emptyDatabase_seedsCategoriesAndAccounts() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        let accounts = try context.fetch(FetchDescriptor<Account>())

        #expect(categories.count == 74)
        #expect(accounts.count == 4)

        let expenseCount = categories.filter { $0.type == .expense }.count
        let incomeCount = categories.filter { $0.type == .income }.count
        #expect(expenseCount == 70)
        #expect(incomeCount == 4)
    }

    @Test func seedIfNeeded_seededCategoriesContainExpectedNames() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        let names = Set(categories.map(\.name))

        #expect(names.contains("餐饮"))
        #expect(names.contains("交通"))
        #expect(names.contains("工资"))
        #expect(names.contains("投资"))
    }

    @Test func seedIfNeeded_seedsTransportSubCategories() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        let transport = categories.first { $0.name == "交通" && $0.parentID == nil }
        #expect(transport != nil)

        let subs = categories.filter { $0.parentID == transport?.id }
        let subNames = Set(subs.map(\.name))
        #expect(subNames == ["地铁", "公交", "打车", "其他"])
        #expect(subs.allSatisfy { $0.isSystem })
        #expect(subs.allSatisfy { $0.type == .expense })
    }

    @Test func seedIfNeeded_seedsEntertainmentAndGameSubCategories() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        let entertainment = categories.first { $0.name == "娱乐" && $0.parentID == nil }
        #expect(entertainment != nil)

        let entertainmentSubs = categories.filter { $0.parentID == entertainment?.id }
        let entertainmentSubNames = Set(entertainmentSubs.map(\.name))
        #expect(entertainmentSubNames == ["游戏", "影视", "音乐", "健身", "网盘"])

        let game = entertainmentSubs.first { $0.name == "游戏" }
        #expect(game != nil)

        let games = categories.filter { $0.parentID == game?.id }
        let gameNames = Set(games.map(\.name))
        #expect(gameNames == ["王者荣耀", "和平精英", "原神", "Steam", "其他"])
        #expect(games.allSatisfy { $0.isSystem })
        #expect(games.allSatisfy { $0.type == .expense })

        let film = entertainmentSubs.first { $0.name == "影视" }
        #expect(film != nil)
        let filmSubs = categories.filter { $0.parentID == film?.id }
        #expect(Set(filmSubs.map(\.name)) == ["腾讯视频", "B站", "爱奇艺", "其他"])

        let music = entertainmentSubs.first { $0.name == "音乐" }
        #expect(music != nil)
        let musicSubs = categories.filter { $0.parentID == music?.id }
        #expect(Set(musicSubs.map(\.name)) == ["Apple Music", "网易云音乐", "QQ音乐", "其他"])

        let cloud = entertainmentSubs.first { $0.name == "网盘" }
        #expect(cloud != nil)
        let cloudSubs = categories.filter { $0.parentID == cloud?.id }
        #expect(Set(cloudSubs.map(\.name)) == ["百度网盘", "阿里网盘", "天翼网盘", "夸克网盘", "其他"])

        let fitness = entertainmentSubs.first { $0.name == "健身" }
        #expect(fitness != nil)
        let fitnessSubs = categories.filter { $0.parentID == fitness?.id }
        #expect(Set(fitnessSubs.map(\.name)) == ["健身房", "私教", "团课", "跑步", "游泳", "瑜伽", "其他"])
    }

    @Test func seedIfNeeded_seedsEducationSubCategories() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        let education = categories.first { $0.name == "教育" && $0.parentID == nil }
        #expect(education != nil)
        let subs = categories.filter { $0.parentID == education?.id }
        #expect(Set(subs.map(\.name)) == ["培训", "书籍", "学费", "课程", "考试报名", "微信读书订阅", "其他"])
        #expect(subs.allSatisfy { $0.isSystem })
        #expect(subs.allSatisfy { $0.type == .expense })
    }

    @Test func seedIfNeeded_seedsMedicalSubCategories() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        let medical = categories.first { $0.name == "医疗" && $0.parentID == nil }
        #expect(medical != nil)
        let subs = categories.filter { $0.parentID == medical?.id }
        #expect(Set(subs.map(\.name)) == ["挂号", "药品", "体检", "牙科", "眼科", "其他"])
        #expect(subs.allSatisfy { $0.isSystem })
        #expect(subs.allSatisfy { $0.type == .expense })
    }

    @Test func seedIfNeeded_seedsShoppingHousingAndDiningSubCategories() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())

        let dining = categories.first { $0.name == "餐饮" && $0.parentID == nil }
        let diningSubs = categories.filter { $0.parentID == dining?.id }
        #expect(Set(diningSubs.map(\.name)) == ["早餐", "午餐", "晚餐", "聚餐AA", "聚餐请客", "其他"])

        let shopping = categories.first { $0.name == "购物" && $0.parentID == nil }
        let shoppingSubs = categories.filter { $0.parentID == shopping?.id }
        #expect(Set(shoppingSubs.map(\.name)) == ["京东", "淘宝", "拼多多", "抖音", "其他"])

        let housing = categories.first { $0.name == "住房" && $0.parentID == nil }
        let housingSubs = categories.filter { $0.parentID == housing?.id }
        #expect(Set(housingSubs.map(\.name)) == ["租金", "水电", "物业", "其他"])
    }

    @Test func seedIfNeeded_seededAccountsContainFourTypes() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)

        let accounts = try context.fetch(FetchDescriptor<Account>())
        let types = Set(accounts.map(\.type))

        #expect(types.contains(.alipay))
        #expect(types.contains(.wechat))
        #expect(types.contains(.unionpay))
        #expect(types.contains(.fixed))
        #expect(types.count == 4)
    }

    @Test func seedIfNeeded_systemCategoriesAndAccountsMarkedAsSystem() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        let accounts = try context.fetch(FetchDescriptor<Account>())

        #expect(categories.allSatisfy { $0.isSystem })
        #expect(accounts.allSatisfy { $0.isSystem })
    }

    @Test func seedIfNeeded_calledTwice_doesNotDuplicate() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        SeedDataService.seedIfNeeded(context: context)
        SeedDataService.seedIfNeeded(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        let accounts = try context.fetch(FetchDescriptor<Account>())

        #expect(categories.count == 74)
        #expect(accounts.count == 4)
    }

    @Test func seedIfNeeded_existingCustomCategory_preservedAlongsideSystemSeeds() throws {
        resetSeedState()
        let container = try makeContainer()
        let context = ModelContext(container)

        let existing = Category(name: "自定义", type: .expense, icon: "tag.fill", colorHex: "#3B82F6")
        context.insert(existing)
        try context.save()

        SeedDataService.seedIfNeeded(context: context)

        let categories = try context.fetch(FetchDescriptor<Category>())
        // 自定义分类保留
        #expect(categories.contains(where: { $0.name == "自定义" && $0.isSystem == false }))
        // 系统分类被补加
        #expect(categories.contains(where: { $0.name == "餐饮" && $0.isSystem == true }))
        #expect(categories.contains(where: { $0.name == "王者荣耀" && $0.isSystem == true }))
    }
}
