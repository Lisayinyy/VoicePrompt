import AppKit
import AVFoundation
import Carbon
import SwiftUI
import Combine

final class VoicePrompt: NSObject, NSApplicationDelegate {
    let resources = Bundle.main.resourceURL!
    let home = FileManager.default.homeDirectoryForCurrentUser
    let ui = VoiceUI()
    var config: [String: Any] = [:]
    var service: Process?
    var item: NSStatusItem!
    var window: NSWindow!
    var panel: NSPanel!
    var recorder: AVAudioRecorder?
    var file: URL?
    var keys: [EventHotKeyRef] = []
    var keyHandler: EventHandlerRef?
    var gesture = VoiceHotkey()
    var escape: EventHotKeyRef?
    var processing: Task<Void, Never>?
    var generation = UUID()
    var target: NSRunningApplication?
    var targetWindow: AXUIElement?
    var targetSnapshot: VoiceInputSnapshot?
    var targetField: AXUIElement?
    var targetValue: String?
    var targetSelection: CFRange?
    var captureID: String?
    var captureTimer: Timer?
    var capturePolling = false
    var mode = "clean"
    var draft = ""
    var rawDraft = ""
    var pendingInsertion = false
    var pasteTransaction: VoicePasteboardTransaction?
    var historyRecoveryAttempts = 0
    var historyRecovering = false
    var starting = false
    var limit: Timer?
    var meter: Timer?
    var refresh: Timer?
    var dismiss: DispatchWorkItem?
    var subscriptions = Set<AnyCancellable>()

    lazy var actions = VoiceActions(
        microphone: { [weak self] in self?.requestMicrophone() },
        accessibility: { [weak self] in self?.requestAccessibility() },
        beginUsing: { [weak self] in self?.beginUsing() },
        tutorial: { [weak self] in self?.tutorial() },
        setMode: { [weak self] mode in self?.setMode(mode) },
        pause: { [weak self] in self?.pause() },
        finish: { [weak self] in self?.finish() },
        cancel: { [weak self] in self?.cancel() },
        retryInsertion: { [weak self] in self?.retryInsertion(atCurrentFocus: true) },
        settings: { [weak self] in guard let self else { return }; self.panel.orderOut(nil); self.ui.page = "advanced"; self.showMain() },
        clear: { [weak self] in self?.clearHistory() },
        notices: { [weak self] in guard let self else { return }; NSWorkspace.shared.open(self.resources.appendingPathComponent("licenses")) },
        setShortcut: { [weak self] in self?.setShortcut($0) },
        soundSettings: { NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.sound?input")!) },
        refreshModel: { [weak self] in self?.refreshModel() },
        setSpeechModel: { [weak self] in self?.setSpeechPreference("speechModelId", $0) },
        setSpeechLanguage: { [weak self] in self?.setSpeechPreference("speechLanguage", $0) },
        previewOverlay: { [weak self] in
            guard let self, self.recorder == nil, self.processing == nil, self.pasteTransaction == nil, !self.starting else { return }
            self.display(.preview, dismissAfter: 5)
        }
    )
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        let appMenu = NSMenu(), submenu = NSMenu()
        submenu.addItem(withTitle: "打开 Voice Prompt", action: #selector(showMain), keyEquivalent: "0").target = self
        submenu.addItem(withTitle: "显示待填入文字", action: #selector(showPending), keyEquivalent: "").target = self
        submenu.addItem(withTitle: "使用指南", action: #selector(tutorial), keyEquivalent: "") .target = self
        submenu.addItem(.separator())
        submenu.addItem(withTitle: "退出 Voice Prompt", action: #selector(quit), keyEquivalent: "q").target = self
        let top = appMenu.addItem(withTitle: "Voice Prompt", action: nil, keyEquivalent: ""); top.submenu = submenu
        NSApp.mainMenu = appMenu
        item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.image = NSImage(systemSymbolName: "waveform", accessibilityDescription: "Voice Prompt")
        item.menu = submenu.copy() as? NSMenu
        buildWindows()
        refreshPermissions()
        ui.$holdToTalk.dropFirst().sink { UserDefaults.standard.set($0, forKey: "holdToTalk") }.store(in: &subscriptions)
        ui.$autoInsert.dropFirst().sink { UserDefaults.standard.set($0, forKey: "autoInsert") }.store(in: &subscriptions)
        ui.$polishOnRecord.dropFirst().sink { UserDefaults.standard.set($0, forKey: "polishOnRecord") }.store(in: &subscriptions)
        ui.$sounds.dropFirst().sink { UserDefaults.standard.set($0, forKey: "sounds") }.store(in: &subscriptions)
        do {
            try setupService()
            ui.mode = config["defaultMode"] as? String ?? "agent"
            ui.aiConfigured = (config["provider"] as? String ?? "unconfigured") != "unconfigured"
            try registerKeys()
            checkService()
            refreshModel()
            captureTimer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in self?.pollCapture() }
        } catch { ui.message = "启动未完成：\(error.localizedDescription)" }
        refresh = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self else { return }; self.refreshPermissions(); self.recoverHistoryAfterUpdate()
            self.ui.entries.removeAll { Date().timeIntervalSince($0.created) > 3600 }
        }
        showMain()
    }
    func buildWindows() {
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 680, height: 540), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Voice Prompt"; window.minSize = NSSize(width: 680, height: 562)
        window.isReleasedWhenClosed = false; window.titlebarAppearsTransparent = true
        window.backgroundColor = NSColor(VPColor.background)
        window.contentView = NSHostingView(rootView: VoiceRootView(model: ui, actions: actions))
        window.center()
        panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: RecordingLayout.windowWidth, height: RecordingLayout.windowHeight), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.title = "Voice Prompt · 录音"; panel.level = .floating; panel.isReleasedWhenClosed = false
        panel.isOpaque = false; panel.backgroundColor = .clear; panel.hasShadow = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.contentView = NSHostingView(rootView: VoiceRecordingView(model: ui, actions: actions))
    }
    func registerKeys() throws {
        if keyHandler == nil {
            let specs = [EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed)),
                         EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyReleased))]
            let result = specs.withUnsafeBufferPointer { buffer in
                InstallEventHandler(GetApplicationEventTarget(), { _, event, context in
                    guard let context, let event else { return OSStatus(eventNotHandledErr) }
                    var id = EventHotKeyID()
                    GetEventParameter(event, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID), nil, MemoryLayout<EventHotKeyID>.size, nil, &id)
                    let app = Unmanaged<VoicePrompt>.fromOpaque(context).takeUnretainedValue()
                    let requested = "auto"
                    let action = app.gesture.handle(id: id.id, pressed: GetEventKind(event) == UInt32(kEventHotKeyPressed), holdToTalk: app.ui.holdToTalk)
                    switch action {
                    case .start: if app.recorder == nil { app.toggle(requested) }
                    case .finish: if app.recorder != nil { app.finish() }
                    case .toggle: app.toggle(requested)
                    case .cancel: app.cancel()
                    case .ignore: break
                    }
                    return noErr
                }, buffer.count, buffer.baseAddress, Unmanaged.passUnretained(self).toOpaque(), &keyHandler)
            }
            guard result == noErr else { throw NSError(domain: "Voice Prompt", code: Int(result), userInfo: [NSLocalizedDescriptionKey: "快捷键监听未能启动。请重启应用。"]) }
        }
        for key in keys { UnregisterEventHotKey(key) }; keys.removeAll()
        let primary = ui.shortcut == "optionShift" ? UInt32(optionKey | shiftKey) : ui.shortcut == "controlOption" ? UInt32(controlKey | optionKey) : UInt32(optionKey)
        let bindings: [(UInt32, UInt32, UInt32)] = [(1, primary, 49)]
        for (id, modifiers, keyCode) in bindings {
            var ref: EventHotKeyRef?
            let result = RegisterEventHotKey(keyCode, modifiers, EventHotKeyID(signature: 0x5650524d, id: id), GetApplicationEventTarget(), 0, &ref)
            guard result == noErr, let ref else {
                for key in keys { UnregisterEventHotKey(key) }; keys.removeAll()
                throw NSError(domain: "Voice Prompt", code: Int(result), userInfo: [NSLocalizedDescriptionKey: "快捷键被其他程序占用。请退出其他语音程序，或选择另一组快捷键。"])
            }
            keys.append(ref)
        }
    }
    func setShortcut(_ value: String) {
        guard !ui.active, !starting, ["option", "optionShift", "controlOption"].contains(value) else { return }
        let old = ui.shortcut; ui.shortcut = value
        do { try registerKeys(); UserDefaults.standard.set(value, forKey: "shortcut"); ui.message = "" }
        catch { ui.shortcut = old; try? registerKeys(); ui.message = error.localizedDescription }
    }
    func refreshModel() {
        let fm = FileManager.default
        ui.speechModelId = config["speechModelId"] as? String ?? "sensevoice-small"
        ui.speechLanguage = config["speechLanguage"] as? String ?? "auto"
        let qwen = ui.speechModelId == "qwen3-asr-1.7b"
        let qwenRoot = config["qwenModelPath"] as? String ?? home.appendingPathComponent(".local/share/voice-prompt/models/qwen3-asr-1.7b-8bit").path
        let python = config["asrPython"] as? String ?? home.appendingPathComponent(".local/share/voice-prompt/asr-venv/bin/python").path
        ui.qwenReady = fm.isReadableFile(atPath: qwenRoot + "/model.safetensors") && fm.isExecutableFile(atPath: python)
        let model = qwen ? qwenRoot + "/model.safetensors" : (config["speechModel"] as? String ?? resources.appendingPathComponent("models/sensevoice-small.gguf").path)
        let engine = qwen ? python : (config["engineCommand"] as? String ?? resources.appendingPathComponent("bin/voice-asr").path)
        ui.modelReady = fm.isReadableFile(atPath: model) && fm.isExecutableFile(atPath: engine)
        if let size = (try? fm.attributesOfItem(atPath: model))?[.size] as? NSNumber {
            ui.modelSize = ByteCountFormatter.string(fromByteCount: size.int64Value, countStyle: .file)
        } else { ui.modelSize = "未找到模型" }
    }
    func setSpeechPreference(_ key: String, _ value: String) {
        guard !ui.active, !starting else { return }
        Task { @MainActor in
            do {
                _ = try await call("/api/preferences", [key: value])
                config[key] = value; refreshModel(); ui.message = ""
            } catch { ui.message = "识别设置未保存：\(error.localizedDescription)" }
        }
    }
    @objc func showMain() { window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true) }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool { showMain(); return true }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
    @objc func tutorial() { ui.onboarding = true; ui.permissionHint = ""; showMain() }
    func refreshPermissions() {
        ui.micGranted = AVCaptureDevice.authorizationStatus(for: .audio) == .authorized
        ui.pasteGranted = AXIsProcessTrusted()
    }
    func requestMicrophone() {
        let status = AVCaptureDevice.authorizationStatus(for: .audio)
        if status == .denied || status == .restricted {
            NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")!)
            ui.permissionHint = "在系统设置中打开 Voice Prompt 的麦克风权限。"
        } else { AVCaptureDevice.requestAccess(for: .audio) { [weak self] _ in DispatchQueue.main.async { self?.refreshPermissions() } } }
    }
    func requestAccessibility() {
        _ = AXIsProcessTrustedWithOptions(["AXTrustedCheckOptionPrompt": true] as CFDictionary)
        NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!)
        ui.permissionHint = "在系统设置中允许 Voice Prompt，然后回到这里。"
    }
    func beginUsing() {
        refreshPermissions()
        UserDefaults.standard.set(true, forKey: "welcomeCompleted"); ui.onboarding = false; ui.page = "general"
        ui.permissionHint = ""
    }
    func setMode(_ value: String) {
        let before = ui.mode; ui.mode = value
        Task { @MainActor in
            do { _ = try await call("/api/preferences", ["defaultMode": value]); config["defaultMode"] = value; ui.message = "" }
            catch { ui.mode = before; ui.message = "润色方式未保存，请稍后再试。" }
        }
    }
    func checkService() {
        Task { @MainActor in
            for _ in 0..<20 {
                do {
                    var req = URLRequest(url: URL(string: "http://127.0.0.1:\(config["port"] as? Int ?? 17866)/api/status")!)
                    req.timeoutInterval = 1; req.setValue("Bearer \(config["token"] as? String ?? "")", forHTTPHeaderField: "Authorization")
                    let (_, response) = try await URLSession.shared.data(for: req)
                    if (response as? HTTPURLResponse)?.statusCode == 200 { ui.serviceReady = true; return }
                } catch {}
                try? await Task.sleep(nanoseconds: 250_000_000)
            }
            ui.message = "语音服务暂未连接，请重新打开 Voice Prompt。"
        }
    }
    func setupService() throws {
        let dir = home.appendingPathComponent(".config/voice-prompt")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        try resources.appendingPathComponent("bin/node").path.write(to: dir.appendingPathComponent("runtime-path"), atomically: true, encoding: .utf8)
        let url = dir.appendingPathComponent("config.json")
        if let data = try? Data(contentsOf: url), let saved = try JSONSerialization.jsonObject(with: data) as? [String: Any] { config = saved }
        config["port"] = config["port"] ?? 17866
        config["provider"] = config["provider"] ?? "unconfigured"
        if config["mentionPolicyVersion"] as? Int != 1 {
            config["defaultMode"] = "agent"
            config["mentionPolicyVersion"] = 1
        }
        config["defaultMode"] = config["defaultMode"] ?? "agent"
        config["token"] = config["token"] ?? UUID().uuidString + UUID().uuidString
        config["engineCommand"] = resources.appendingPathComponent("bin/voice-asr").path
        config["speechModel"] = resources.appendingPathComponent("models/sensevoice-small.gguf").path
        try JSONSerialization.data(withJSONObject: config, options: [.prettyPrinted, .sortedKeys]).write(to: url, options: .atomic)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
        let child = Process(); child.executableURL = resources.appendingPathComponent("bin/node")
        child.arguments = [resources.appendingPathComponent("plugin/server.mjs").path, "serve"]
        var env = ProcessInfo.processInfo.environment; env["VOICE_PROMPT_CONFIG"] = url.path; child.environment = env
        let log = dir.appendingPathComponent("service.log")
        if !FileManager.default.fileExists(atPath: log.path) { FileManager.default.createFile(atPath: log.path, contents: nil, attributes: [.posixPermissions: 0o600]) }
        let handle = try FileHandle(forWritingTo: log); try handle.seekToEnd(); child.standardError = handle; child.standardOutput = handle
        try child.run(); service = child
    }
    func display(_ phase: VoicePhase, dismissAfter seconds: Double? = nil) {
        dismiss?.cancel(); ui.phase = phase
        let screen = NSScreen.screens.first(where: { NSMouseInRect(NSEvent.mouseLocation, $0.frame, false) }) ?? NSScreen.main
        if let frame = screen?.visibleFrame { panel.setFrameOrigin(NSPoint(x: frame.midX - panel.frame.width / 2, y: frame.minY + 22)) }
        panel.orderFrontRegardless()
        if let seconds {
            let work = DispatchWorkItem { [weak self] in self?.panel.orderOut(nil); self?.ui.phase = .idle }
            dismiss = work; DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: work)
        }
    }
    func play(_ name: NSSound.Name) { if ui.sounds { NSSound(named: name)?.play() } }
    func toggle(_ requested: String, fromEditor: Bool = false) {
        if recorder != nil { finish(); return }
        if captureID != nil && !fromEditor { return }
        if processing != nil || starting || pasteTransaction != nil { return }
        target = NSWorkspace.shared.frontmostApplication
        targetWindow = target.flatMap { focusedWindow($0) }
        targetField = target.flatMap { focusedField($0) }
        targetSnapshot = targetField.map { snapshot($0) }
        if !["AXTextField", "AXTextArea", "AXComboBox"].contains(targetSnapshot?.role ?? "") { targetField = nil }
        targetValue = targetField.flatMap { fieldValue($0) }
        targetSelection = targetField.flatMap { fieldSelection($0) }
        let selectedMode = requested == "auto" && (ui.polishOnRecord || VoiceDirectEdit.mentionsVoicePrompt(targetValue)) ? ui.mode : "raw"
        generation = UUID(); let current = generation; starting = true
        AVCaptureDevice.requestAccess(for: .audio) { granted in DispatchQueue.main.async {
            guard current == self.generation else { return }; self.starting = false
            guard granted else { self.updateCapture("error", error: "请在 Voice Prompt 中允许麦克风。"); self.ui.permissionHint = "请允许麦克风后再开始。"; self.ui.onboarding = true; self.showMain(); return }
            guard self.captureID != nil || !self.ui.holdToTalk || self.gesture.held != nil else { return }
            self.begin(selectedMode)
        } }
    }
    func begin(_ requested: String) {
        Task { @MainActor in _ = try? await call("/api/asr/warm", [:]) }
        do {
            let dir = home.appendingPathComponent(".config/voice-prompt/audio")
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
            let url = dir.appendingPathComponent(UUID().uuidString + ".wav")
            let r = try AVAudioRecorder(url: url, settings: [AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: 16000.0, AVNumberOfChannelsKey: 1, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false])
            r.isMeteringEnabled = true
            guard r.record() else { throw NSError(domain: "Voice Prompt", code: 1, userInfo: [NSLocalizedDescriptionKey: "无法开始录音，请检查麦克风。"] ) }
            recorder = r; file = url; mode = requested; pendingInsertion = false; ui.seconds = 0; ui.level = 0; ui.message = ""; ui.lastFallback = false
            item.button?.image = NSImage(systemSymbolName: "mic.fill", accessibilityDescription: "正在录音")
            RegisterEventHotKey(53, 0, EventHotKeyID(signature: 0x5650524d, id: 3), GetApplicationEventTarget(), 0, &escape)
            play("Tink"); display(.listening); updateCapture("recording")
            meter = Timer.scheduledTimer(withTimeInterval: 0.08, repeats: true) { [weak self] _ in
                guard let self, let recorder = self.recorder else { return }
                self.ui.seconds = recorder.currentTime
                if recorder.isRecording { recorder.updateMeters(); self.ui.level = max(0, min(1, (Double(recorder.averagePower(forChannel: 0)) + 50) / 50)) }
            }
            limit = Timer.scheduledTimer(withTimeInterval: 300, repeats: false) { [weak self] _ in self?.finish() }
        } catch { updateCapture("error", error: error.localizedDescription); ui.message = error.localizedDescription; display(.error, dismissAfter: 6) }
    }
    @objc func pause() {
        guard let r = recorder else { return }
        if r.isRecording { r.pause(); ui.level = 0; display(.paused) }
        else if r.record() { display(.listening) }
    }
    @objc func finish() {
        guard let r = recorder, let audio = file else { return }
        r.stop(); recorder = nil; limit?.invalidate(); limit = nil; meter?.invalidate(); meter = nil
        play("Pop")
        let current = generation, chosen = mode
        display(.transcribing); updateCapture("transcribing")
        processing = Task { @MainActor in
            defer { try? FileManager.default.removeItem(at: audio) }
            do {
                let transcript = try await self.call("/api/transcribe", ["path": audio.path])
                try Task.checkCancellation()
                guard current == self.generation else { return }
                guard let raw = transcript["text"] as? String, !raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw NSError(domain: "Voice Prompt", code: 2, userInfo: [NSLocalizedDescriptionKey: "刚才没有听清，可以再说一次。"] ) }
                self.rawDraft = raw
                if chosen != "raw" { self.display(.polishing) }
                var request: [String: Any] = ["text": raw, "session": "desktop", "id": current.uuidString]
                request["mode"] = chosen
                var result: [String: Any]
                do { result = try await self.call("/api/prepare", request) }
                catch { try Task.checkCancellation(); result = ["text": raw, "fallback": true] }
                try Task.checkCancellation(); guard current == self.generation else { return }
                self.draft = result["text"] as? String ?? raw
                let fallback = result["fallback"] as? Bool == true
                self.ui.lastFallback = fallback
                self.ui.entries.append(VoiceEntry(text: self.draft, raw: raw, fallback: fallback))
                if self.ui.entries.count > 20 { self.ui.entries.removeFirst(self.ui.entries.count - 20) }
                self.processing = nil; self.finishState()
                self.ui.message = fallback ? "刚才的润色未完成，已保留原文。" : ""
                if self.captureID != nil {
                    self.updateCapture("ready", text: self.draft)
                    self.display(.waiting)
                } else { self.insert(self.draft, fallback: fallback) }
            } catch {
                guard current == self.generation else { return }
                self.processing = nil; self.finishState(); self.updateCapture("error", error: error.localizedDescription); self.ui.message = error.localizedDescription
                self.display(.error, dismissAfter: 6)
            }
        }
    }
    func recoverHistoryAfterUpdate() {
        guard ui.serviceReady, historyRecoveryAttempts < 30, !historyRecovering, ui.entries.isEmpty, draft.isEmpty,
              recorder == nil, processing == nil, !starting, captureID == nil else { return }
        historyRecoveryAttempts += 1; historyRecovering = true
        let current = generation
        Task { @MainActor in
            defer { historyRecovering = false }
            guard let result = try? await call("/api/drafts?session=desktop"),
                  let entries = result["drafts"] as? [[String: Any]], !entries.isEmpty,
                  generation == current, ui.entries.isEmpty, draft.isEmpty else { return }
            ui.entries = entries.suffix(20).compactMap { entry in
                guard let text = entry["text"] as? String, let raw = entry["raw"] as? String,
                      let created = entry["createdAt"] as? Double else { return nil }
                let date = Date(timeIntervalSince1970: created / 1000)
                guard Date().timeIntervalSince(date) < 3600 else { return nil }
                return VoiceEntry(text: text, raw: raw, fallback: entry["fallback"] as? Bool == true, created: date)
            }
            if let last = ui.entries.last {
                draft = last.text; rawDraft = last.raw; ui.lastFallback = last.fallback
                keepDraft("已恢复更新前的录音。点中目标输入框，再点声波旁的填入箭头即可重试。")
            }
        }
    }
    func call(_ route: String, _ body: [String: Any]? = nil) async throws -> [String: Any] {
        var req = URLRequest(url: URL(string: "http://127.0.0.1:\(config["port"] as? Int ?? 17866)\(route)")!)
        req.httpMethod = body == nil ? "GET" : "POST"; req.timeoutInterval = 180
        req.setValue("Bearer \(config["token"] as? String ?? "")", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body { req.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: req)
        let parsed = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw NSError(domain: "Voice Prompt", code: 3, userInfo: [NSLocalizedDescriptionKey: (parsed["error"] as? [String: Any])?["message"] as? String ?? "语音服务暂不可用"]) }
        return parsed
    }
    func finishState() {
        item.button?.image = NSImage(systemSymbolName: "waveform", accessibilityDescription: "Voice Prompt")
        if let key = escape { UnregisterEventHotKey(key); escape = nil }
    }
    @objc func cancel() {
        pasteTransaction?.restore(); pasteTransaction = nil
        updateCapture("cancelled")
        gesture = VoiceHotkey()
        generation = UUID(); starting = false; recorder?.stop(); recorder = nil; processing?.cancel(); processing = nil
        limit?.invalidate(); limit = nil; meter?.invalidate(); meter = nil
        if let file { try? FileManager.default.removeItem(at: file) }; file = nil
        finishState(); display(.cancelled, dismissAfter: 1.2)
    }
    func updateCapture(_ state: String, text: String? = nil, error: String? = nil) {
        guard let id = captureID else { return }
        if state == "cancelled" || state == "error" { captureID = nil }
        Task { @MainActor in
            var body: [String: Any] = ["id": id, "state": state]
            if let text { body["text"] = text }; if let error { body["error"] = error }
            _ = try? await call("/api/capture/update", body)
        }
    }
    func pollCapture() {
        guard ui.serviceReady, !capturePolling else { return }
        capturePolling = true
        Task { @MainActor in
            defer { capturePolling = false }
            guard let job = try? await call("/api/capture/next", [:]), let id = job["id"] as? String,
                  let command = job["command"] as? String else { return }
            if command == "start" || command == "start-finish" {
                guard recorder == nil, processing == nil, !starting, captureID == nil else {
                    _ = try? await call("/api/capture/update", ["id": id, "state": "error", "error": "另一段录音正在进行。"]); return
                }
                if command == "start-finish" {
                    _ = try? await call("/api/capture/update", ["id": id, "state": "cancelled"]); return
                }
                captureID = id; toggle("raw", fromEditor: true)
            } else if captureID == id {
                if command == "finish" { if recorder != nil { finish() } else if starting { cancel() } }
                else if command == "cancel" { cancel() }
                else if command == "inserted" {
                    captureID = nil; ui.insertionConfirmed = true; display(.done, dismissAfter: 2)
                } else if command == "rejected" {
                    captureID = nil; keepDraft("OMP 输入框已变化，文字保留在历史中。")
                }
            }
        }
    }
    func elementAttribute(_ element: AXUIElement, _ name: String) -> AXUIElement? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success,
              let value, CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
        return (value as! AXUIElement)
    }
    func stringAttribute(_ element: AXUIElement, _ name: String) -> String? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success else { return nil }
        if let url = value as? URL { return url.absoluteString }
        return value as? String
    }
    func focusedWindow(_ app: NSRunningApplication) -> AXUIElement? {
        elementAttribute(AXUIElementCreateApplication(app.processIdentifier), kAXFocusedWindowAttribute)
    }
    func focusedField(_ app: NSRunningApplication) -> AXUIElement? {
        guard AXIsProcessTrusted() else { return nil }
        // Prefer the system focus, which avoids stale per-app focus proxies.
        if let focused = elementAttribute(AXUIElementCreateSystemWide(), kAXFocusedUIElementAttribute) {
            var pid: pid_t = 0
            if AXUIElementGetPid(focused, &pid) == .success, pid == app.processIdentifier { return focused }
        }
        return elementAttribute(AXUIElementCreateApplication(app.processIdentifier), kAXFocusedUIElementAttribute)
    }
    func snapshot(_ field: AXUIElement) -> VoiceInputSnapshot {
        var position = CGPoint.zero, size = CGSize.zero
        var p: CFTypeRef?, z: CFTypeRef?
        var bounds: CGRect?
        if AXUIElementCopyAttributeValue(field, kAXPositionAttribute as CFString, &p) == .success,
           AXUIElementCopyAttributeValue(field, kAXSizeAttribute as CFString, &z) == .success,
           let p, let z, CFGetTypeID(p) == AXValueGetTypeID(), CFGetTypeID(z) == AXValueGetTypeID(),
           AXValueGetValue(p as! AXValue, .cgPoint, &position), AXValueGetValue(z as! AXValue, .cgSize, &size) {
            bounds = CGRect(origin: position, size: size)
        }
        var document: String?, ancestor: AXUIElement? = field
        for _ in 0..<16 {
            guard let current = ancestor else { break }
            if let url = stringAttribute(current, "AXURL") { document = url; break }
            ancestor = elementAttribute(current, kAXParentAttribute)
        }
        let selected = fieldSelection(field).map { NSRange(location: $0.location, length: $0.length) }
        return VoiceInputSnapshot(role: stringAttribute(field, kAXRoleAttribute), identifier: stringAttribute(field, kAXIdentifierAttribute), bounds: bounds, value: fieldValue(field), selection: selected, document: document)
    }
    func fieldValue(_ field: AXUIElement) -> String? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(field, kAXValueAttribute as CFString, &value) == .success else { return nil }
        return value as? String
    }
    func fieldSelection(_ field: AXUIElement) -> CFRange? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(field, kAXSelectedTextRangeAttribute as CFString, &value) == .success,
              let value, CFGetTypeID(value) == AXValueGetTypeID() else { return nil }
        var range = CFRange()
        guard AXValueGetValue(value as! AXValue, .cfRange, &range) else { return nil }
        return range
    }
    func settable(_ field: AXUIElement, _ attribute: String) -> Bool {
        var result = DarwinBoolean(false)
        return AXUIElementIsAttributeSettable(field, attribute as CFString, &result) == .success && result.boolValue
    }
    @objc func showPending() {
        guard pendingInsertion else { return }; window.orderOut(nil); display(.saved)
    }
    func keepDraft(_ reason: String) {
        pendingInsertion = true
        ui.insertionHint = reason; ui.message = reason
        display(.saved)
    }
    func retryInsertion(atCurrentFocus: Bool) {
        guard pendingInsertion, !starting, recorder == nil, processing == nil, captureID == nil, pasteTransaction == nil else { return }
        guard let latest = ui.entries.last, Date().timeIntervalSince(latest.created) < 3600, latest.text == draft else {
            pendingInsertion = false; ui.message = "没有待填入的录音，或文字已过期。"; return
        }
        if atCurrentFocus {
            guard let front = NSWorkspace.shared.frontmostApplication, front.bundleIdentifier != Bundle.main.bundleIdentifier else { return }
            target = front; targetWindow = focusedWindow(front); targetField = focusedField(front)
            targetSnapshot = targetField.map { snapshot($0) }
            if !["AXTextField", "AXTextArea", "AXComboBox"].contains(targetSnapshot?.role ?? "") { targetField = nil }
            targetValue = targetField.flatMap { fieldValue($0) }
            targetSelection = targetField.flatMap { fieldSelection($0) }
        }
        generation = UUID()
        insert(draft, fallback: ui.lastFallback)
    }
    func insert(_ text: String, fallback: Bool) {
        guard pasteTransaction == nil else { return }
        ui.insertionConfirmed = false
        guard ui.autoInsert else { keepDraft("自动填入已关闭，文字保留在历史中。"); return }
        guard AXIsProcessTrusted() else {
            keepDraft("请在系统辅助功能中允许 Voice Prompt 自动填入；不需要手动复制。"); return
        }
        guard let target, !target.isTerminated, target.bundleIdentifier != Bundle.main.bundleIdentifier else {
            keepDraft("请先点中目标输入框，再点声波旁的填入箭头。"); return
        }
        let field = targetField, before = targetValue, selection = targetSelection
        let expected: String? = before.flatMap { value in
            selection.flatMap { VoiceDirectEdit.replacing(value, selection: NSRange(location: $0.location, length: $0.length), with: text) }
        }
        var activeField = field
        func targetFailure() -> String? {
            guard NSWorkspace.shared.frontmostApplication?.processIdentifier == target.processIdentifier else { return "当前应用已切换" }
            if let originalWindow = self.targetWindow {
                guard let currentWindow = self.focusedWindow(target), CFEqual(originalWindow, currentWindow) else { return "当前窗口已切换" }
            }
            if let beforeDocument = self.targetSnapshot?.document, let currentField = self.focusedField(target),
               let nowDocument = self.snapshot(currentField).document, beforeDocument != nowDocument { return "页面已切换" }
            if let field, let before = self.targetSnapshot {
                guard let focused = self.focusedField(target) else { return "暂时读不到输入框" }
                let failure = VoiceInputGuard.failure(before: before, now: self.snapshot(focused), sameElement: CFEqual(field, focused))
                if failure == nil { activeField = focused }
                return failure
            }
            return nil // Opaque apps: paste to the unchanged front window, without claiming a verified result.
        }
        let front = NSWorkspace.shared.frontmostApplication
        guard front?.processIdentifier == target.processIdentifier || front?.bundleIdentifier == Bundle.main.bundleIdentifier else {
            keepDraft("你切换了应用，文字已保留；点中目标输入框后可重试。"); return
        }
        panel.orderOut(nil)
        if front?.bundleIdentifier == Bundle.main.bundleIdentifier { target.activate(options: [.activateIgnoringOtherApps]) }
        let current = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) { [weak self] in
            guard let self, self.generation == current else { return }
            if let reason = targetFailure() { self.keepDraft(reason + "，文字已保留。"); return }
            let transaction = VoicePasteboardTransaction()
            guard transaction.publish(text) else { self.keepDraft("剪贴板正在变化，未覆盖原内容，请重试填入。"); return }
            self.pasteTransaction = transaction
            self.display(.inserting)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { [weak self] in
                guard let self else { transaction.restore(); return }
                let focusFailure = targetFailure()
                guard self.generation == current, transaction.stillOwnsClipboard, focusFailure == nil else {
                    transaction.restore(); self.pasteTransaction = nil
                    if self.generation == current { self.keepDraft((focusFailure ?? "剪贴板已改变") + "，文字已保留。") }
                    return
                }
                guard let source = CGEventSource(stateID: .privateState),
                      let down = CGEvent(keyboardEventSource: source, virtualKey: 9, keyDown: true),
                      let up = CGEvent(keyboardEventSource: source, virtualKey: 9, keyDown: false) else {
                    transaction.restore(); self.pasteTransaction = nil; self.keepDraft("未能创建自动填入事件，请重试。"); return
                }
                // Product input delivery: Cmd+V only. Never emit Return/Enter.
                down.flags = .maskCommand; up.flags = .maskCommand
                down.post(tap: .cghidEventTap); up.post(tap: .cghidEventTap)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self] in
                    transaction.restore()
                    guard let self else { return }
                    self.pasteTransaction = nil
                    guard self.generation == current else { return }
                    let confirmed = expected != nil && activeField.flatMap { self.fieldValue($0) } == expected
                    self.ui.insertionConfirmed = confirmed
                    self.pendingInsertion = !confirmed
                    self.ui.insertionHint = confirmed ? "" : "已发送自动填入操作；此输入框无法确认结果，请检查。原文仍在历史中。"
                    self.display(.done, dismissAfter: 3)
                }
            }
        }
    }
    func clearHistory() {
        ui.entries.removeAll(); draft = ""; rawDraft = ""; pendingInsertion = false
        Task { @MainActor in _ = try? await call("/api/clear", [:]) }
    }
    @objc func quit() { NSApp.terminate(nil) }
    func applicationWillTerminate(_ notification: Notification) {
        generation = UUID(); recorder?.stop(); processing?.cancel(); limit?.invalidate(); meter?.invalidate(); refresh?.invalidate(); captureTimer?.invalidate(); dismiss?.cancel()
        if let file { try? FileManager.default.removeItem(at: file) }
        pasteTransaction?.restore(); pasteTransaction = nil
        service?.terminate(); for key in keys { UnregisterEventHotKey(key) }; if let escape { UnregisterEventHotKey(escape) }
    }
}
@main
struct VoicePromptMain {
    static func main() {
        let app = NSApplication.shared
        let delegate = VoicePrompt()
        app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
}
