// Pure key gesture state, shared by the Carbon event handler and regression checks.
enum VoiceKeyAction: Equatable { case start, finish, toggle, cancel, ignore }
struct VoiceHotkey {
    private(set) var held: UInt32?
    mutating func handle(id: UInt32, pressed: Bool, holdToTalk: Bool) -> VoiceKeyAction {
        if id == 3 { if pressed { held = nil; return .cancel }; return .ignore }
        guard id == 1 || id == 2 || id == 4 else { return .ignore }
        if !holdToTalk { return pressed ? .toggle : .ignore }
        if pressed {
            guard held == nil else { return .ignore }
            held = id; return .start
        }
        guard held == id else { return .ignore }
        held = nil; return .finish
    }
}
