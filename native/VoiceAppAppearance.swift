import Foundation

enum VoiceAppearancePreference: String {
    case light, dark, system
    func isDark(systemDark: Bool) -> Bool {
        self == .system ? systemDark : self == .dark
    }
}

// Read the app's own persisted appearance setting, not its native window chrome.
// Keep this adapter explicit: an unknown app must not inherit Codex's preference.
final class VoiceAppAppearance {
    let codexConfig: URL
    init(codexConfig: URL? = nil) {
        let home = ProcessInfo.processInfo.environment["CODEX_HOME"]
            .flatMap { $0.isEmpty ? nil : URL(fileURLWithPath: $0) }
            ?? FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".codex")
        self.codexConfig = codexConfig ?? home.appendingPathComponent("config.toml")
    }
    func preference(for bundle: String) -> VoiceAppearancePreference? {
        guard bundle == "com.openai.codex" else { return nil }
        guard let values = try? codexConfig.resourceValues(forKeys: [.fileSizeKey]),
              let size = values.fileSize, size <= 2_000_000,
              let text = try? String(contentsOf: codexConfig, encoding: .utf8) else { return nil }
        return Self.codexPreference(in: text)
    }
    static func codexPreference(in text: String) -> VoiceAppearancePreference? {
        // Only the verified [desktop].appearanceTheme scalar is used. Never log
        // the config or expose unrelated settings, paths or account information.
        let section = try! NSRegularExpression(pattern: #"^\[\s*(?:desktop|"desktop"|'desktop')\s*\]\s*(?:#.*)?$"#)
        let setting = try! NSRegularExpression(pattern: #"^(?:appearanceTheme|"appearanceTheme"|'appearanceTheme')\s*=\s*(?:"(dark|light|system)"|'(dark|light|system)')\s*(?:#.*)?$"#)
        var inDesktop = false
        for line in text.components(separatedBy: .newlines) {
            let line = line.trimmingCharacters(in: .whitespaces)
            let range = NSRange(line.startIndex..., in: line)
            if line.hasPrefix("[") {
                inDesktop = section.firstMatch(in: line, range: range) != nil
            } else if inDesktop, let match = setting.firstMatch(in: line, range: range) {
                for index in 1...2 {
                    if let r = Range(match.range(at: index), in: line) {
                        return VoiceAppearancePreference(rawValue: String(line[r]))
                    }
                }
            }
        }
        return nil
    }
}
