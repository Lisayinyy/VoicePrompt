import AppKit

// Temporary, multi-format clipboard transaction. Never overwrite a newer user copy.
final class VoicePasteboardTransaction {
    private let board: NSPasteboard
    private var saved: [[NSPasteboard.PasteboardType: Data]] = []
    private var publishedCount: Int?
    init(board: NSPasteboard = .general) { self.board = board }
    func publish(_ text: String) -> Bool {
        guard publishedCount == nil else { return false }
        let initialCount = board.changeCount
        var complete = true
        saved = (board.pasteboardItems ?? []).map { item in
            var formats: [NSPasteboard.PasteboardType: Data] = [:]
            for type in item.types {
                if let data = item.data(forType: type) { formats[type] = data }
                else { complete = false }
            }
            return formats
        }
        guard complete, initialCount == board.changeCount else { saved = []; return false }
        board.clearContents()
        let item = NSPasteboardItem()
        item.setString(text, forType: .string)
        // Advisory markers for clipboard managers; these are not access restrictions.
        item.setData(Data(), forType: NSPasteboard.PasteboardType("org.nspasteboard.TransientType"))
        item.setData(Data(), forType: NSPasteboard.PasteboardType("org.nspasteboard.ConcealedType"))
        let success = board.writeObjects([item])
        publishedCount = board.changeCount
        if !success { restore() }
        return success
    }
    var stillOwnsClipboard: Bool { publishedCount == board.changeCount }
    @discardableResult func restore() -> Bool {
        guard let expected = publishedCount else { return false }
        publishedCount = nil
        defer { saved = [] }
        guard board.changeCount == expected else { return false }
        let items = saved.map { formats -> NSPasteboardItem in
            let item = NSPasteboardItem()
            for (type, data) in formats { item.setData(data, forType: type) }
            return item
        }
        board.clearContents()
        if !items.isEmpty { return board.writeObjects(items) }
        return true
    }
    deinit { restore() }
}
