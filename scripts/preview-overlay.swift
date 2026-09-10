// Layout-only rendering. Does not start the app, record audio or write into other apps.
import AppKit
import SwiftUI

@main struct PreviewOverlay {
    static func main() throws {
        let app = NSApplication.shared
        app.setActivationPolicy(.prohibited)
        let output = URL(fileURLWithPath: CommandLine.arguments[1])
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        let cases: [(String, VoicePhase)] = [
            ("recording", .listening), ("recording-hover", .listening), ("paused", .paused), ("transcribing", .transcribing),
            ("polishing", .polishing), ("waiting", .waiting), ("saved", .saved),
            ("done", .done), ("error", .error), ("preview", .preview)
        ]
        for (name, phase) in cases {
            let model = VoiceUI()
            model.phase = phase; model.level = 0.72; model.seconds = 18
            model.insertionConfirmed = true
            let host = NSHostingView(rootView: VoiceRecordingView(model: model, actions: VoiceActions(), previewHover: name == "recording-hover", previewTime: 0.6))
            let rect = NSRect(x: 0, y: 0, width: RecordingLayout.windowWidth, height: RecordingLayout.windowHeight)
            host.frame = rect
            let window = NSWindow(contentRect: rect, styleMask: [.borderless], backing: .buffered, defer: false)
            window.isOpaque = false; window.backgroundColor = .clear; window.contentView = host
            host.layoutSubtreeIfNeeded()
            // Flush SwiftUI's deferred child-view drawing before caching each state.
            RunLoop.main.run(until: Date().addingTimeInterval(0.08))
            host.layoutSubtreeIfNeeded()
            guard let bitmap = host.bitmapImageRepForCachingDisplay(in: rect) else { fatalError("No bitmap") }
            host.cacheDisplay(in: rect, to: bitmap)
            guard let png = bitmap.representation(using: .png, properties: [:]) else { fatalError("No PNG") }
            try png.write(to: output.appendingPathComponent("\(name).png"))
        }
    }
}
