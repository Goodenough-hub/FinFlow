import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: [SortDescriptor(\Transaction.date, order: .reverse)]) private var transactions: [Transaction]

    @AppStorage("app.appearance") private var appearanceRaw: String = AppearanceMode.system.rawValue

    @State private var exportURL: URL?
    @State private var showingImporter = false
    @State private var importResult: String?
    @State private var importError: String?
    @State private var sampleMessage: String?
    @State private var showingClearConfirm = false

    private var appearance: AppearanceMode {
        AppearanceMode(rawValue: appearanceRaw) ?? .system
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("外观", selection: $appearanceRaw) {
                        ForEach(AppearanceMode.allCases, id: \.self) { mode in
                            Text(mode.displayName).tag(mode.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text("外观")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                } footer: {
                    Text("选择跟随系统、强制深色或浅色模式")
                        .font(.system(size: 11))
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    NavigationLink {
                        CategoryListView()
                    } label: {
                        settingsLabel("分类管理", systemImage: "tag.fill", color: .expenseGold)
                    }
                    NavigationLink {
                        RecurringTransactionListView()
                    } label: {
                        settingsLabel("周期账单", systemImage: "arrow.triangle.2.circlepath", color: .transferBlue)
                    }
                    NavigationLink {
                        BudgetListView()
                    } label: {
                        settingsLabel("预算管理", systemImage: "chart.pie.fill", color: .incomeGreen)
                    }
                }

                Section {
                    Button {
                        exportCSV()
                    } label: {
                        settingsLabel("导出 CSV (\(transactions.count) 条)", systemImage: "square.and.arrow.up", color: .accentBlue)
                    }
                    Button {
                        showingImporter = true
                    } label: {
                        settingsLabel("导入 CSV", systemImage: "square.and.arrow.down", color: .accentBlue)
                    }
                }

                Section {
                    HStack {
                        Text("版本")
                            .foregroundStyle(.textPrimary)
                        Spacer()
                        Text("1.0.0")
                            .font(.system(size: 14, weight: .medium, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.textTertiary)
                    }
                    HStack {
                        Text("数据存储")
                            .foregroundStyle(.textPrimary)
                        Spacer()
                        Text("本地（SwiftData）")
                            .font(.system(size: 14))
                            .foregroundStyle(.textTertiary)
                    }
                } header: {
                    Text("关于")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                Section {
                    Button {
                        populateSampleData()
                    } label: {
                        settingsLabel("填充测试数据", systemImage: "wand.and.stars", color: .accentBlue)
                    }
                    Button(role: .destructive) {
                        showingClearConfirm = true
                    } label: {
                        settingsLabel("清空所有交易", systemImage: "trash", color: .overspendRed)
                    }
                    if let msg = sampleMessage {
                        Text(msg)
                            .font(.system(size: 12))
                            .foregroundStyle(.textTertiary)
                    }
                } header: {
                    Text("开发")
                        .font(.system(size: 12, weight: .semibold))
                        .textCase(.uppercase)
                        .tracking(1)
                        .foregroundStyle(.textTertiary)
                }

                if let result = importResult {
                    Section {
                        Label(result, systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.incomeGreen)
                    }
                }
                if let err = importError {
                    Section {
                        Label(err, systemImage: "xmark.circle.fill")
                            .foregroundStyle(.overspendRed)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .background(Color.bgPrimary.ignoresSafeArea())
            .scrollContentBackground(.hidden)
            .navigationTitle("设置")
            .fileImporter(
                isPresented: $showingImporter,
                allowedContentTypes: [.commaSeparatedText, .text]
            ) { result in
                switch result {
                case .success(let url):
                    importCSV(from: url)
                case .failure(let error):
                    importError = error.localizedDescription
                    importResult = nil
                }
            }
            .sheet(item: Binding(
                get: { exportURL.map { IdentifiableURL(url: $0) } },
                set: { exportURL = $0?.url }
            )) { item in
                ShareLink(item: item.url, preview: SharePreview("FinFlow 导出"))
                    .presentationDetents([.medium])
            }
            .confirmationDialog("确认清空所有交易？此操作不可恢复", isPresented: $showingClearConfirm, titleVisibility: .visible) {
                Button("清空", role: .destructive) { clearAllTransactions() }
                Button("取消", role: .cancel) {}
            }
        }
    }

    private func settingsLabel(_ title: String, systemImage: String, color: Color) -> some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(color, in: RoundedRectangle(cornerRadius: 7))
            Text(title)
                .foregroundStyle(.textPrimary)
        }
    }

    private func exportCSV() {
        do {
            let url = try CSVService.makeExportFileURL(transactions: transactions)
            exportURL = url
        } catch {
            importError = "导出失败：\(error.localizedDescription)"
            importResult = nil
        }
    }

    private func importCSV(from url: URL) {
        importResult = nil
        importError = nil
        guard url.startAccessingSecurityScopedResource() else {
            importError = "无法访问文件"
            return
        }
        defer { url.stopAccessingSecurityScopedResource() }
        do {
            let data = try Data(contentsOf: url)
            let count = try CSVService.importCSV(from: data, context: context)
            importResult = "成功导入 \(count) 条"
        } catch {
            importError = "导入失败：\(error.localizedDescription)"
        }
    }

    private func populateSampleData() {
        do {
            try SampleDataService.populate(context: context)
            sampleMessage = "已填充最近 24 个月测试数据"
        } catch {
            sampleMessage = "填充失败：\(error.localizedDescription)"
        }
    }

    private func clearAllTransactions() {
        let txs = (try? context.fetch(FetchDescriptor<Transaction>())) ?? []
        for tx in txs { context.delete(tx) }
        try? context.save()
        sampleMessage = "已清空 \(txs.count) 条交易"
    }
}

private struct IdentifiableURL: Identifiable {
    let url: URL
    var id: URL { url }
}

#Preview {
    SettingsView()
        .modelContainer(for: [Transaction.self, Category.self, Budget.self, RecurringTransaction.self, Account.self], inMemory: true)
        .preferredColorScheme(.dark)
}
