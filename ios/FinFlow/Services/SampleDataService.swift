import Foundation
import SwiftData

enum SampleDataService {
    static func populate(context: ModelContext) throws {
        let categories = (try? context.fetch(FetchDescriptor<Category>())) ?? []
        let accounts = (try? context.fetch(FetchDescriptor<Account>())) ?? []
        guard !categories.isEmpty, !accounts.isEmpty else { return }

        let existing = (try? context.fetch(FetchDescriptor<Transaction>())) ?? []
        guard existing.isEmpty else { return }

        let parentIDs = Set(categories.compactMap { $0.parentID })
        let leafExpense = categories.filter { $0.type == .expense && !parentIDs.contains($0.id) }
        let expenseCategories = leafExpense.isEmpty ? categories.filter { $0.type == .expense } : leafExpense
        let incomeCategories = categories.filter { $0.type == .income && !parentIDs.contains($0.id) }

        let cal = Calendar.current
        let now = Date()
        var txs: [Transaction] = []

        for monthsAgo in stride(from: 23, through: 0, by: -1) {
            guard let monthStart = cal.date(byAdding: .month, value: -monthsAgo, to: now)?.startOfMonth else { continue }
            let daysInMonth = cal.range(of: .day, in: .month, for: monthStart)?.count ?? 30

            // 每月固定收入：工资
            if let salary = incomeCategories.first(where: { $0.name == "工资" }) {
                let payday = cal.date(byAdding: .day, value: min(10, daysInMonth - 1), to: monthStart) ?? monthStart
                txs.append(Transaction(amount: 12000 + Decimal(randomIn: 0...500), type: .income, note: "月度工资", date: payday, category: salary, account: accounts.first))
            }
            // 偶尔兼职/投资收入
            if monthsAgo % 2 == 0, let extra = incomeCategories.first(where: { $0.name == "兼职" }) {
                let day = cal.date(byAdding: .day, value: Int.random(in: 5...20), to: monthStart) ?? monthStart
                txs.append(Transaction(amount: Decimal(randomIn: 800...2000), type: .income, note: "兼职报酬", date: day, category: extra, account: accounts.randomElement()!))
            }

            // 日常支出：20-30 条
            let expenseCount = Int.random(in: 22...30)
            for _ in 0..<expenseCount {
                guard let cat = expenseCategories.randomElement(), let acc = accounts.randomElement() else { continue }
                let dayOffset = Int.random(in: 0..<daysInMonth)
                let date = cal.date(byAdding: .day, value: dayOffset, to: monthStart) ?? monthStart
                let (amount, note) = sampleAmountAndNote(for: cat.name)
                let vendor = cat.name == "打车" ? ["高德", "滴滴", "美团"].randomElement() : nil
                let account = (cat.name == "地铁" || cat.name == "公交") ? (accounts.first(where: { $0.type == .transit }) ?? acc) : acc
                txs.append(Transaction(amount: amount, type: .expense, note: note, date: date, category: cat, account: account, vendor: vendor))
            }
        }

        for tx in txs { context.insert(tx) }

        // 当前月预算：餐饮 + 交通（父分类汇总）+ 购物 + 娱乐
        let nowMonth = now.monthValue
        let nowYear = now.yearValue
        let allExpenseCats = categories.filter { $0.type == .expense }
        let transportParent = allExpenseCats.first { $0.name == "交通" && $0.parentID == nil }
        let budgetTargets: [Category] = allExpenseCats.filter {
            ["餐饮", "购物", "娱乐"].contains($0.name) && $0.parentID == nil
        } + (transportParent.map { [$0] } ?? [])
        let amounts: [String: Decimal] = ["餐饮": 2000, "交通": 800, "购物": 1500, "娱乐": 600]
        for cat in budgetTargets {
            if let amount = amounts[cat.name], (try? context.fetch(FetchDescriptor<Budget>()))?.first(where: { $0.category?.id == cat.id && $0.month == nowMonth && $0.year == nowYear }) == nil {
                context.insert(Budget(amount: amount, month: nowMonth, year: nowYear, category: cat))
            }
        }

        try context.save()
    }

    private static func sampleAmountAndNote(for categoryName: String) -> (Decimal, String) {
        switch categoryName {
        case "餐饮":
            let notes = ["早餐", "午餐", "晚餐", "外卖", "咖啡", "零食", "聚餐"]
            return (Decimal(randomIn: 15...300), notes.randomElement()!)
        case "早餐":
            return (Decimal(randomIn: 5...30), ["包子", "豆浆油条", "三明治", "粥"].randomElement()!)
        case "午餐":
            return (Decimal(randomIn: 15...80), ["工作餐", "外卖", "堂食", "快餐"].randomElement()!)
        case "晚餐":
            return (Decimal(randomIn: 15...120), ["外卖", "堂食", "回家做饭"].randomElement()!)
        case "聚餐AA":
            return (Decimal(randomIn: 50...300), ["同事聚餐", "朋友聚餐", "家庭聚餐"].randomElement()!)
        case "聚餐请客":
            return (Decimal(randomIn: 100...800), ["请客", "生日", "庆祝"].randomElement()!)
        case "地铁":
            return (Decimal(randomIn: 3...12), ["上班", "回家", "外出"].randomElement()!)
        case "公交":
            return (Decimal(randomIn: 1...5), ["上班", "回家"].randomElement()!)
        case "打车":
            return (Decimal(randomIn: 15...200), ["上班", "回家", "机场", "外出"].randomElement()!)
        case "交通":
            let notes = ["加油", "高铁", "停车费"]
            return (Decimal(randomIn: 50...500), notes.randomElement()!)
        case "购物":
            let notes = ["日用品", "衣服", "电子产品", "化妆品", "书籍", "网购"]
            return (Decimal(randomIn: 50...2000), notes.randomElement()!)
        case "京东":
            return (Decimal(randomIn: 50...3000), ["数码", "家电", "日用"].randomElement()!)
        case "淘宝":
            return (Decimal(randomIn: 30...1500), ["衣服", "日用", "零食"].randomElement()!)
        case "拼多多":
            return (Decimal(randomIn: 10...300), ["日用", "零食", "百亿补贴"].randomElement()!)
        case "抖音":
            return (Decimal(randomIn: 20...500), ["直播", "商品", "团购"].randomElement()!)
        case "住房":
            return (Decimal(randomIn: 2000...4500), ["房租", "水电费", "物业费"].randomElement()!)
        case "租金":
            return (Decimal(randomIn: 2000...4500), ["月租"].randomElement()!)
        case "水电":
            return (Decimal(randomIn: 50...500), ["水费", "电费", "燃气费"].randomElement()!)
        case "物业":
            return (Decimal(randomIn: 100...500), ["物业费"].randomElement()!)
        case "娱乐":
            let notes = ["电影", "游戏", "KTV", "健身", "球赛"]
            return (Decimal(randomIn: 30...800), notes.randomElement()!)
        case "王者荣耀":
            return (Decimal(randomIn: 6...648), ["皮肤", "英雄", "战令"].randomElement()!)
        case "和平精英":
            return (Decimal(randomIn: 6...648), ["皮肤", "通行证"].randomElement()!)
        case "原神":
            return (Decimal(randomIn: 30...328), ["月卡", "创世结晶", "皮肤"].randomElement()!)
        case "Steam":
            return (Decimal(randomIn: 30...500), ["新游戏", "DLC", "打折"].randomElement()!)
        case "电影":
            return (Decimal(randomIn: 30...150), ["院线", "会员"].randomElement()!)
        case "影视":
            return (Decimal(randomIn: 15...200), ["会员", "点播", "影院"].randomElement()!)
        case "腾讯视频":
            return (Decimal(randomIn: 15...238), ["会员", "超前点播"].randomElement()!)
        case "B站":
            return (Decimal(randomIn: 12...198), ["大会员", "充电", "会员购"].randomElement()!)
        case "爱奇艺":
            return (Decimal(randomIn: 15...248), ["会员", "星钻"].randomElement()!)
        case "音乐":
            return (Decimal(randomIn: 8...25), ["会员", "数字专辑"].randomElement()!)
        case "Apple Music":
            return (Decimal(randomIn: 10...108), ["月卡", "家庭卡"].randomElement()!)
        case "网易云音乐":
            return (Decimal(randomIn: 8...198), ["黑胶VIP", "数字专辑"].randomElement()!)
        case "QQ音乐":
            return (Decimal(randomIn: 8...198), ["绿钻", "豪华绿钻"].randomElement()!)
        case "网盘":
            return (Decimal(randomIn: 10...298), ["会员", "扩容"].randomElement()!)
        case "百度网盘":
            return (Decimal(randomIn: 25...298), ["超级会员", "会员"].randomElement()!)
        case "阿里网盘":
            return (Decimal(randomIn: 12...168), ["会员", "八折活动"].randomElement()!)
        case "天翼网盘":
            return (Decimal(randomIn: 10...98), ["黄金会员", "白金会员"].randomElement()!)
        case "夸克网盘":
            return (Decimal(randomIn: 8...168), ["会员", "SVIP"].randomElement()!)
        case "健身":
            return (Decimal(randomIn: 50...500), ["月卡", "私教", "团课"].randomElement()!)
        case "健身房":
            return (Decimal(randomIn: 100...800), ["月卡", "季卡", "年卡"].randomElement()!)
        case "私教":
            return (Decimal(randomIn: 200...1000), ["1对1", "套餐"].randomElement()!)
        case "团课":
            return (Decimal(randomIn: 50...300), ["瑜伽课", "动感单车", "HIIT"].randomElement()!)
        case "跑步":
            return (Decimal(randomIn: 50...1500), ["跑鞋", "赛事报名", "装备"].randomElement()!)
        case "游泳":
            return (Decimal(randomIn: 30...500), ["门票", "月卡", "培训"].randomElement()!)
        case "瑜伽":
            return (Decimal(randomIn: 50...800), ["课程", "瑜伽垫", "工作坊"].randomElement()!)
        case "医疗":
            let notes = ["挂号", "买药", "体检"]
            return (Decimal(randomIn: 20...600), notes.randomElement()!)
        case "挂号":
            return (Decimal(randomIn: 10...100), ["门诊", "急诊", "专家号"].randomElement()!)
        case "药品":
            return (Decimal(randomIn: 10...500), ["处方药", "非处方药", "中药", "保健品"].randomElement()!)
        case "体检":
            return (Decimal(randomIn: 100...2000), ["常规体检", "入职体检", "专项检查"].randomElement()!)
        case "牙科":
            return (Decimal(randomIn: 50...3000), ["洗牙", "补牙", "拔牙", "正畸"].randomElement()!)
        case "眼科":
            return (Decimal(randomIn: 50...1500), ["配镜", "检查", "近视手术"].randomElement()!)
        case "教育":
            let notes = ["课程", "书籍", "培训"]
            return (Decimal(randomIn: 50...1500), notes.randomElement()!)
        case "培训":
            return (Decimal(randomIn: 200...3000), ["技能课", "兴趣班", "职业培训"].randomElement()!)
        case "书籍":
            return (Decimal(randomIn: 30...300), ["纸质书", "电子书", "杂志"].randomElement()!)
        case "学费":
            return (Decimal(randomIn: 500...8000), ["学期", "学年"].randomElement()!)
        case "课程":
            return (Decimal(randomIn: 50...1500), ["网课", "专栏", "直播课"].randomElement()!)
        case "考试报名":
            return (Decimal(randomIn: 50...1000), ["资格证", "等级考", "认证"].randomElement()!)
        case "微信读书订阅":
            return (Decimal(randomIn: 9...228), ["月卡", "季卡", "年卡"].randomElement()!)
        default:
            return (Decimal(randomIn: 10...300), ["杂项", "其他"].randomElement()!)
        }
    }
}

private extension Decimal {
    init(randomIn range: ClosedRange<Int>) {
        self = Decimal(Int.random(in: range))
    }
}
