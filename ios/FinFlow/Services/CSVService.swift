import Foundation
import SwiftData

enum CSVService {
    private static let header = "Date,Type,Category,Amount,Note"
    private static let bom = "\u{FEFF}"

    static func export(transactions: [Transaction]) -> String {
        var lines = [bom + header]
        for tx in transactions.sorted(by: { $0.date < $1.date }) {
            let row = [
                tx.date.shortDateString,
                tx.typeRaw,
                escape(tx.category?.name ?? ""),
                tx.amount.plainString,
                escape(tx.note)
            ].joined(separator: ",")
            lines.append(row)
        }
        return lines.joined(separator: "\n")
    }

    static func makeExportFileURL(transactions: [Transaction]) throws -> URL {
        let csv = export(transactions: transactions)
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let name = "FinFlow_Export_\(formatter.string(from: .now)).csv"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        try csv.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    @discardableResult
    static func importCSV(from data: Data, context: ModelContext) throws -> Int {
        guard var content = String(data: data, encoding: .utf8) else {
            throw CSVError.invalidEncoding
        }
        if content.hasPrefix(bom) { content.removeFirst() }

        let categories = (try? context.fetch(FetchDescriptor<Category>())) ?? []
        let byName = Dictionary(uniqueKeysWithValues: categories.map { ($0.name, $0) })

        let lines = content
            .replacingOccurrences(of: "\r\n", with: "\n")
            .split(separator: "\n", omittingEmptySubsequences: true)
            .map(String.init)

        guard !lines.isEmpty else { throw CSVError.emptyFile }
        if lines.first?.hasPrefix("Date") == true {
            // skip header
        }

        var imported = 0
        for line in lines.drop(while: { $0.hasPrefix("Date") }) {
            guard let fields = parseLine(line), fields.count >= 4 else { continue }
            let dateStr = fields[0]
            let typeStr = fields[1]
            let categoryName = fields[2]
            let amountStr = fields[3]
            let note = fields.count > 4 ? fields[4] : ""

            guard let type = TransactionType(rawValue: typeStr) else { continue }
            guard let amount = Decimal(string: amountStr.replacingOccurrences(of: ",", with: ".")), amount > 0 else { continue }

            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.dateFormat = "yyyy-MM-dd"
            guard let date = formatter.date(from: dateStr) else { continue }

            let category = byName[categoryName] ?? categories.first { $0.typeRaw == type.rawValue }
            let tx = Transaction(amount: amount, type: type, note: note, date: date, category: category)
            context.insert(tx)
            imported += 1
        }
        try context.save()
        return imported
    }

    private static func escape(_ s: String) -> String {
        if s.contains(",") || s.contains("\"") || s.contains("\n") {
            let escaped = s.replacingOccurrences(of: "\"", with: "\"\"")
            return "\"\(escaped)\""
        }
        return s
    }

    private static func parseLine(_ line: String) -> [String]? {
        var fields: [String] = []
        var current = ""
        var inQuotes = false
        var iter = line.makeIterator()
        while let c = iter.next() {
            if inQuotes {
                if c == "\"" {
                    if let next = iter.next() {
                        if next == "\"" {
                            current.append("\"")
                        } else {
                            inQuotes = false
                            if next == "," {
                                fields.append(current)
                                current = ""
                            } else {
                                current.append(next)
                            }
                        }
                    } else {
                        inQuotes = false
                    }
                } else {
                    current.append(c)
                }
            } else {
                if c == "\"" {
                    inQuotes = true
                } else if c == "," {
                    fields.append(current)
                    current = ""
                } else {
                    current.append(c)
                }
            }
        }
        fields.append(current)
        return fields
    }
}

enum CSVError: LocalizedError {
    case invalidEncoding
    case emptyFile

    var errorDescription: String? {
        switch self {
        case .invalidEncoding: return "文件编码无效，请使用 UTF-8"
        case .emptyFile: return "CSV 文件为空"
        }
    }
}
