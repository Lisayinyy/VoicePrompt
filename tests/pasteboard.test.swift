import AppKit
@main struct PasteboardTests {
    static func main() {
        let board = NSPasteboard(name: NSPasteboard.Name("voice-prompt-test-" + UUID().uuidString))
        defer { board.releaseGlobally() }
        let original = NSPasteboardItem()
        original.setString("original", forType: .string)
        let custom = NSPasteboard.PasteboardType("app.voiceprompt.fixture")
        original.setData(Data([1,2,3]), forType: custom)
        board.writeObjects([original])
        let tx = VoicePasteboardTransaction(board: board)
        assert(tx.publish("语音 draft")); assert(board.string(forType:.string)=="语音 draft")
        assert(tx.restore()); assert(board.string(forType:.string)=="original")
        assert(board.data(forType:custom)==Data([1,2,3])); assert(!tx.restore())
        let changed = VoicePasteboardTransaction(board:board)
        assert(changed.publish("temporary"))
        board.clearContents(); board.setString("new user copy",forType:.string)
        assert(!changed.stillOwnsClipboard); assert(!changed.restore())
        assert(board.string(forType:.string)=="new user copy")
        board.clearContents()
        let empty = VoicePasteboardTransaction(board:board)
        assert(empty.publish("temporary")); assert(empty.restore()); assert(board.pasteboardItems?.isEmpty ?? true)
        print("13 private-pasteboard assertions passed; system clipboard untouched")
    }
}
