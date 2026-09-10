import Foundation
import CoreGraphics

// Identity-independent comparison for controls recreated by web/desktop renderers.
struct VoiceInputSnapshot {
    var role: String?
    var identifier: String?
    var bounds: CGRect?
    var value: String?
    var selection: NSRange?
    var document: String?
}
enum VoiceInputGuard {
    static func failure(before: VoiceInputSnapshot, now: VoiceInputSnapshot, sameElement: Bool) -> String? {
        if let a = before.document, let b = now.document, a != b { return "页面已切换" }
        if let a = before.value, let b = now.value, a != b { return "输入框内容已改变" }
        if let a = before.selection, let b = now.selection, a != b { return "光标位置已改变" }
        if let a = before.identifier, let b = now.identifier, !a.isEmpty, !b.isEmpty, a != b { return "输入框已切换" }
        if sameElement { return nil }
        let textRoles = ["AXTextField", "AXTextArea", "AXComboBox"]
        let sameRole = before.role == now.role || (textRoles.contains(before.role ?? "") && textRoles.contains(now.role ?? ""))
        let sameBounds: Bool
        if let a = before.bounds, let b = now.bounds { sameBounds = abs(a.minX-b.minX)<3 && abs(a.minY-b.minY)<3 && abs(a.width-b.width)<3 && abs(a.height-b.height)<3 }
        else { sameBounds = false }
        // An ID alone may be reused in multiple controls. Require the same location and readable content.
        if sameRole, sameBounds, before.value != nil, now.value != nil { return nil }
        return "无法确认当前输入框"
    }
}
