@main struct HotkeyTests {
    static func main() {
        var keys = VoiceHotkey()
        assert(keys.handle(id: 1, pressed: true, holdToTalk: false) == .toggle)
        assert(keys.handle(id: 1, pressed: false, holdToTalk: false) == .ignore)
        assert(keys.handle(id: 1, pressed: true, holdToTalk: true) == .start)
        assert(keys.held == 1)
        assert(keys.handle(id: 1, pressed: true, holdToTalk: true) == .ignore)
        assert(keys.handle(id: 2, pressed: false, holdToTalk: true) == .ignore)
        assert(keys.held == 1)
        assert(keys.handle(id: 1, pressed: false, holdToTalk: true) == .finish)
        assert(keys.held == nil) // Also gates a late microphone permission callback.
        assert(keys.handle(id: 1, pressed: false, holdToTalk: true) == .ignore)
        assert(keys.handle(id: 2, pressed: true, holdToTalk: true) == .start)
        assert(keys.handle(id: 3, pressed: true, holdToTalk: true) == .cancel)
        assert(keys.held == nil)
        assert(keys.handle(id: 2, pressed: false, holdToTalk: true) == .ignore)
        assert(keys.handle(id: 3, pressed: false, holdToTalk: false) == .ignore)
        assert(keys.handle(id: 9, pressed: true, holdToTalk: false) == .ignore)
        assert(keys.handle(id: 4, pressed: true, holdToTalk: false) == .toggle)
        assert(keys.handle(id: 4, pressed: false, holdToTalk: false) == .ignore)
        assert(keys.handle(id: 4, pressed: true, holdToTalk: true) == .start)
        assert(keys.handle(id: 1, pressed: false, holdToTalk: true) == .ignore)
        assert(keys.handle(id: 4, pressed: false, holdToTalk: true) == .finish)
        assert(keys.held == nil)
        print("22 hotkey checks passed: toggle, hold/release, repeat, alternate and polish keys, cancel, late release")
    }
}
