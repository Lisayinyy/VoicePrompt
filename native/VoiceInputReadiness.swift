import Foundation

// Shared by onboarding and the global shortcut. OMP owns its editor insertion.
enum VoiceInputReadiness {
    static func blocker(microphone: Bool, accessibility: Bool, autoInsert: Bool, editorOwned: Bool = false) -> String? {
        if !microphone { return "microphone_required" }
        if autoInsert && !editorOwned && !accessibility { return "accessibility_required" }
        return nil
    }
}
