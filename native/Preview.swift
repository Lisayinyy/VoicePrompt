// Offscreen rendering of our own SwiftUI views for layout verification; no desktop capture.
import AppKit
import SwiftUI
@main struct Preview {
    static func main() throws {
        let app = NSApplication.shared
        app.setActivationPolicy(.prohibited)
        let dir = URL(fileURLWithPath: CommandLine.arguments[1])
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let model = VoiceUI(); model.serviceReady = true; model.aiConfigured = true
        model.micGranted = false; model.pasteGranted = false; model.onboarding = true; model.modelReady = true; model.modelSize = "239 MB"
        try render(VoiceRootView(model: model, actions: VoiceActions()), size: NSSize(width: 680, height: 540), path: dir.appendingPathComponent("welcome.png"))
        model.onboarding = false; model.micGranted = true; model.pasteGranted = true
        try render(VoiceRootView(model: model, actions: VoiceActions()), size: NSSize(width: 680, height: 540), path: dir.appendingPathComponent("general.png"))
        model.page = "polish"
        try render(VoiceRootView(model: model, actions: VoiceActions()), size: NSSize(width: 680, height: 540), path: dir.appendingPathComponent("polish.png"))
        for page in ["history", "models", "advanced", "about"] {
            model.page = page
            try render(VoiceRootView(model: model, actions: VoiceActions()), size: NSSize(width: 680, height: 540), path: dir.appendingPathComponent(page + ".png"))
        }
        model.phase = .listening; model.seconds = 12; model.level = 0.55
        try render(VoiceRecordingView(model: model, actions: VoiceActions()), size: NSSize(width: 280, height: 52), path: dir.appendingPathComponent("recording-preview.png"))
        for (name, phase) in [("paused", VoicePhase.paused), ("transcribing", .transcribing), ("saved", .saved), ("done", .done), ("error", .error)] {
            model.phase = phase; model.pasteGranted = false
            try render(VoiceRecordingView(model: model, actions: VoiceActions()), size: NSSize(width: 280, height: 52), path: dir.appendingPathComponent("overlay-" + name + ".png"))
        }
    }
    static func render<V: View>(_ root: V, size: NSSize, path: URL) throws {
        let view = NSHostingView(rootView: root.frame(width: size.width, height: size.height))
        view.frame = NSRect(origin: .zero, size: size)
        view.layoutSubtreeIfNeeded()
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.15))
        guard let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) else { fatalError("No bitmap") }
        view.cacheDisplay(in: view.bounds, to: rep)
        try rep.representation(using: .png, properties: [:])!.write(to: path)
        print(path.path)
    }
}
