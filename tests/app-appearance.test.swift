import Foundation

@main struct AppearanceTests {
    static func main() throws {
        func check(_ value: Bool, _ message: String) { precondition(value, message) }
        let parse = VoiceAppAppearance.codexPreference
        check(parse("[desktop]\nappearanceTheme = \"dark\"") == .dark, "software dark with system light")
        check(parse("[ desktop ] # note\nappearanceTheme='light' # note") == .light, "software light")
        check(parse("[\"desktop\"]\n\"appearanceTheme\"='system'") == .system, "system preference")
        check(parse("# [desktop]\nappearanceTheme='dark'") == nil, "ignore comments")
        check(parse("[desktop.other]\nappearanceTheme='dark'") == nil, "ignore nested section")
        check(parse("[desktop]\n[other]\nappearanceTheme='dark'") == nil, "leave section")
        check(parse("[desktop]\nappearanceTheme='unknown'") == nil, "unknown value")
        check(!VoiceAppearancePreference.light.isDark(systemDark: true), "app light overrides system dark")
        check(VoiceAppearancePreference.dark.isDark(systemDark: false), "app dark overrides system light")
        check(VoiceAppearancePreference.system.isDark(systemDark: true), "system dark fallback")
        check(!VoiceAppearancePreference.system.isDark(systemDark: false), "system light fallback")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: url) }
        let reader = VoiceAppAppearance(codexConfig: url)
        for value in ["dark", "light", "system"] {
            try "[desktop]\nappearanceTheme='\(value)'".write(to: url, atomically: true, encoding: .utf8)
            check(reader.preference(for: "com.openai.codex")?.rawValue == value, "reread changes without restart")
            check(reader.preference(for: "com.minimax.agent") == nil, "never leak one app's theme into another")
        }
        let actual = VoiceAppAppearance().preference(for: "com.openai.codex")?.rawValue ?? "unavailable"
        print("PASS: application/system precedence, scoped parsing, theme changes and app isolation")
        print("Current Codex internal appearance: \(actual)")
    }
}
