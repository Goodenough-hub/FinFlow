import Foundation
import SwiftData

enum SeedDataService {
    private static let categoriesKey = "finflow.categories.seeded.v3"
    private static let accountsKey = "finflow.accounts.seeded.v1"

    static func seedIfNeeded(context: ModelContext) {
        seedCategories(context: context)
        seedAccounts(context: context)
    }

    private struct SeedNode {
        let name: String
        let icon: String
        let colorHex: String
        let sortOrder: Int
        let children: [SeedNode]
        init(_ name: String, _ icon: String, _ color: String, _ order: Int, _ children: [SeedNode] = []) {
            self.name = name
            self.icon = icon
            self.colorHex = color
            self.sortOrder = order
            self.children = children
        }
    }

    private static let expenseTree: [SeedNode] = [
        SeedNode("餐饮", "fork.knife", "#FF6B35", 0, [
            SeedNode("早餐", "cup.and.saucer.fill", "#FF6B35", 100),
            SeedNode("午餐", "fork.knife", "#F59E0B", 101),
            SeedNode("晚餐", "takeoutbag.and.cup.and.straw.fill", "#EF4444", 102),
            SeedNode("聚餐AA", "person.2.fill", "#8B5CF6", 103),
            SeedNode("聚餐请客", "heart.fill", "#EC4899", 104),
            SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 105),
        ]),
        SeedNode("交通", "car.fill", "#3B82F6", 1, [
            SeedNode("地铁", "tram.fill", "#3B82F6", 100),
            SeedNode("公交", "bus.fill", "#10B981", 101),
            SeedNode("打车", "car.side.fill", "#F59E0B", 102),
            SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 103),
        ]),
        SeedNode("购物", "bag.fill", "#8B5CF6", 2, [
            SeedNode("京东", "shippingbox.fill", "#EF4444", 100),
            SeedNode("淘宝", "bag.fill", "#F59E0B", 101),
            SeedNode("拼多多", "cart.fill", "#EF4444", 102),
            SeedNode("抖音", "music.note", "#6B7280", 103),
            SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 104),
        ]),
        SeedNode("住房", "house.fill", "#10B981", 3, [
            SeedNode("租金", "key.fill", "#10B981", 100),
            SeedNode("水电", "bolt.fill", "#F59E0B", 101),
            SeedNode("物业", "building.2.fill", "#3B82F6", 102),
            SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 103),
        ]),
        SeedNode("娱乐", "gamecontroller.fill", "#F59E0B", 4, [
            SeedNode("游戏", "gamecontroller.fill", "#F59E0B", 100, [
                SeedNode("王者荣耀", "crown.fill", "#F59E0B", 201),
                SeedNode("和平精英", "scope", "#10B981", 202),
                SeedNode("原神", "sparkles", "#3B82F6", 203),
                SeedNode("Steam", "flame.fill", "#EF4444", 204),
                SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 205),
            ]),
            SeedNode("影视", "film.fill", "#8B5CF6", 200, [
                SeedNode("腾讯视频", "tv.fill", "#10B981", 301),
                SeedNode("B站", "play.rectangle.fill", "#EF4444", 302),
                SeedNode("爱奇艺", "play.tv.fill", "#10B981", 303),
                SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 304),
            ]),
            SeedNode("音乐", "music.note", "#06B6D4", 300, [
                SeedNode("Apple Music", "music.note.list", "#EF4444", 401),
                SeedNode("网易云音乐", "music.mic", "#EF4444", 402),
                SeedNode("QQ音乐", "music.quarternote.3", "#3B82F6", 403),
                SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 404),
            ]),
            SeedNode("健身", "figure.run", "#10B981", 400, [
                SeedNode("健身房", "building.2.fill", "#10B981", 601),
                SeedNode("私教", "person.fill.checkmark", "#3B82F6", 602),
                SeedNode("团课", "person.3.fill", "#8B5CF6", 603),
                SeedNode("跑步", "figure.run", "#F59E0B", 604),
                SeedNode("游泳", "figure.pool.swim", "#3B82F6", 605),
                SeedNode("瑜伽", "figure.yoga", "#EC4899", 606),
                SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 607),
            ]),
            SeedNode("网盘", "icloud.fill", "#3B82F6", 500, [
                SeedNode("百度网盘", "externaldrive.connected.to.line.below.fill", "#3B82F6", 501),
                SeedNode("阿里网盘", "externaldrive.connected.to.line.below.fill", "#F59E0B", 502),
                SeedNode("天翼网盘", "externaldrive.connected.to.line.below.fill", "#EF4444", 503),
                SeedNode("夸克网盘", "externaldrive.connected.to.line.below.fill", "#8B5CF6", 504),
                SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 505),
            ]),
        ]),
        SeedNode("医疗", "cross.case.fill", "#EF4444", 5, [
            SeedNode("挂号", "cross.case.fill", "#EF4444", 100),
            SeedNode("药品", "pill.fill", "#F59E0B", 101),
            SeedNode("体检", "stethoscope", "#10B981", 102),
            SeedNode("牙科", "tooth.fill", "#3B82F6", 103),
            SeedNode("眼科", "eye.fill", "#8B5CF6", 104),
            SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 105),
        ]),
        SeedNode("教育", "book.fill", "#6366F1", 6, [
            SeedNode("培训", "graduationcap.fill", "#6366F1", 100),
            SeedNode("书籍", "books.vertical.fill", "#8B5CF6", 101),
            SeedNode("学费", "creditcard.fill", "#3B82F6", 102),
            SeedNode("课程", "play.rectangle.on.rectangle.fill", "#F59E0B", 103),
            SeedNode("考试报名", "doc.text.fill", "#EF4444", 104),
            SeedNode("微信读书订阅", "book.closed.fill", "#10B981", 105),
            SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 106),
        ]),
        SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 7),
    ]

    private static let incomeTree: [SeedNode] = [
        SeedNode("工资", "dollarsign.circle.fill", "#10B981", 0),
        SeedNode("投资", "chart.line.uptrend.xyaxis", "#3B82F6", 1, [
            SeedNode("余额宝收益", "dollarsign.circle.fill", "#10B981", 100),
            SeedNode("零钱通收益", "yensign.circle.fill", "#10B981", 101),
            SeedNode("理财收益", "percent", "#10B981", 102),
            SeedNode("其他", "ellipsis.circle.fill", "#6B7280", 103),
        ]),
        SeedNode("兼职", "briefcase.fill", "#8B5CF6", 2),
        SeedNode("其他收入", "ellipsis.circle.fill", "#6B7280", 3),
    ]

    private static func seedCategories(context: ModelContext) {
        // 迁移：旧版本 seed 的"电影"重命名为"影视"
        let existing = (try? context.fetch(FetchDescriptor<Category>())) ?? []
        for cat in existing where cat.name == "电影" {
            cat.name = "影视"
        }
        try? context.save()

        insertTree(expenseTree, parent: nil, type: .expense, context: context)
        insertTree(incomeTree, parent: nil, type: .income, context: context)

        do {
            try context.save()
            UserDefaults.standard.set(true, forKey: categoriesKey)
        } catch {
            print("Seed categories failed: \(error)")
        }
    }

    private static func insertTree(_ nodes: [SeedNode], parent: Category?, type: CategoryType, context: ModelContext) {
        let parentID = parent?.id
        let existing = (try? context.fetch(FetchDescriptor<Category>())) ?? []
        for node in nodes {
            let existingCat = existing.first { $0.name == node.name && $0.parentID == parentID }
            let cat: Category
            if let existingCat {
                cat = existingCat
            } else {
                cat = Category(name: node.name, type: type, icon: node.icon, colorHex: node.colorHex, sortOrder: node.sortOrder, isSystem: true, parentID: parentID)
                context.insert(cat)
            }
            if !node.children.isEmpty {
                insertTree(node.children, parent: cat, type: type, context: context)
            }
        }
    }

    private static func seedAccounts(context: ModelContext) {
        guard !UserDefaults.standard.bool(forKey: accountsKey) else { return }
        let descriptors = FetchDescriptor<Account>()
        let existing = (try? context.fetch(descriptors)) ?? []
        if !existing.isEmpty {
            UserDefaults.standard.set(true, forKey: accountsKey)
            return
        }

        let defaults: [(AccountType, Int)] = [
            (.alipay, 0),
            (.wechat, 1),
            (.unionpay, 2),
            (.fixed, 3),
        ]
        for (type, order) in defaults {
            context.insert(Account(name: type.displayName, type: type, sortOrder: order, isSystem: true))
        }

        do {
            try context.save()
            UserDefaults.standard.set(true, forKey: accountsKey)
        } catch {
            print("Seed accounts failed: \(error)")
        }
    }
}
