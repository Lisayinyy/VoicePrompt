import Foundation

// A UTF-16 accessibility selection must resolve cleanly before writing an editor value.
enum VoiceDirectEdit {
    // Only a leading, explicit invocation in the current editor enables polishing.
    // Do not infer invocation from a quoted mention, email address or conversation history.
    static func mentionsVoicePrompt(_ editor: String?) -> Bool {
        guard let editor else { return false }
        return editor.range(of: #"^\s*@(?:voice-prompt|voice prompt)(?=\s|$)"#, options: [.regularExpression, .caseInsensitive]) != nil
    }
    static func replacing(_ original: String, selection: NSRange, with text: String) -> String? {
        let units = Array(original.utf16)
        func scalarBoundary(_ offset: Int) -> Bool {
            guard offset > 0, offset < units.count else { return true }
            return !(0xDC00...0xDFFF).contains(units[offset]) || !(0xD800...0xDBFF).contains(units[offset - 1])
        }
        guard selection.location != NSNotFound, selection.location >= 0, selection.length >= 0,
              selection.location <= units.count, selection.length <= units.count - selection.location,
              scalarBoundary(selection.location), scalarBoundary(selection.location + selection.length),
              let range = Range(selection, in: original) else { return nil }
        return original.replacingCharacters(in: range, with: text)
    }
}
