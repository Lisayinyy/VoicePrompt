import SwiftUI
import AppKit

struct VoiceEntry: Identifiable {
    let id = UUID()
    let created: Date
    init(text: String, raw: String, fallback: Bool, created: Date = Date()) { self.text = text; self.raw = raw; self.fallback = fallback; self.created = created }
    let text: String
    let raw: String
    let fallback: Bool
}
enum VoicePhase { case idle, preview, listening, paused, transcribing, polishing, waiting, inserting, done, saved, cancelled, error }
final class VoiceUI: ObservableObject {
    @Published var onboarding = !UserDefaults.standard.bool(forKey: "welcomeCompleted")
    @Published var page = "general"
    @Published var phase: VoicePhase = .idle
    @Published var micGranted = false
    @Published var pasteGranted = false
    @Published var aiConfigured = false
    @Published var inviteCode = ""
    @Published var betaBusy = false
    @Published var betaActivated = false
    @Published var betaLocal = false
    @Published var betaMessage = ""
    @Published var betaIssue: VoiceBeta.ConnectionIssue?
    var freeStatusTitle: String {
        if betaBusy { return "正在连接" }
        if let betaIssue { return betaIssue.title }
        return betaActivated ? "已就绪" : "等待连接"
    }
    @Published var serviceReady = false
    @Published var mode = "agent"
    @Published var insertionHint = ""
    @Published var insertionConfirmed = false
    @Published var sounds = UserDefaults.standard.object(forKey: "sounds") as? Bool ?? true
    @Published var shortcut = UserDefaults.standard.string(forKey: "shortcut") ?? "option"
    @Published var holdToTalk = UserDefaults.standard.bool(forKey: "holdToTalk")
    @Published var autoInsert = UserDefaults.standard.object(forKey: "autoInsert") as? Bool ?? true
    @Published var polishOnRecord = UserDefaults.standard.bool(forKey: "polishOnRecord")
    @Published var livePreviewEnabled = UserDefaults.standard.object(forKey: "livePreviewEnabled") as? Bool ?? true
    @Published var liveText = ""
    @Published var liveHint = "停顿时显示识别文字"
    @Published var previewBusy = false
    @Published var overlayDark = false
    @Published var modelReady = false
    @Published var modelSize = "—"
    @Published var speechModelId = "sensevoice-small"
    @Published var speechLanguage = "auto"
    @Published var qwenReady = false
    var speechModelName: String { speechModelId == "qwen3-asr-1.7b" ? "Qwen3-ASR 1.7B" : "SenseVoice Small" }
    var shortcutLabel: String { shortcut == "controlOption" ? "⌃ ⌥ Space" : shortcut == "optionShift" ? "⌥ ⇧ Space" : "⌥ Space" }
    @Published var seconds = 0.0
    @Published var level = 0.0
    @Published var message = ""
    @Published var lastFallback = false
    @Published var entries: [VoiceEntry] = []
    @Published var permissionHint = ""
    var title: String {
        switch phase {
        case .idle: return "随时，说点什么。"
        case .preview: return "浮窗预览"
        case .listening: return "正在听…"
        case .paused: return "已暂停"
        case .transcribing: return "正在识别…"
        case .polishing: return "正在润色…"
        case .done: return insertionConfirmed ? "已填入" : "已尝试填入"
        case .saved: return autoInsert && !pasteGranted ? "需要辅助功能权限" : "等待填入"
        case .inserting: return "正在填入…"
        case .waiting: return "正在写入 OMP…"
        case .cancelled: return "已取消"
        case .error: return "这次没有完成"
        }
    }
    var time: String { String(format: "%02d:%02d", Int(seconds)/60, Int(seconds)%60) }
    var active: Bool { [.listening,.paused,.transcribing,.polishing,.waiting,.inserting].contains(phase) }
}
struct VoiceActions {
    var microphone: () -> Void = {}
    var accessibility: () -> Void = {}
    var beginUsing: () -> Void = {}
    var tutorial: () -> Void = {}
    var setMode: (String) -> Void = { _ in }
    var pause: () -> Void = {}
    var finish: () -> Void = {}
    var cancel: () -> Void = {}
    var retryInsertion: () -> Void = {}
    var settings: () -> Void = {}
    var clear: () -> Void = {}
    var notices: () -> Void = {}
    var setShortcut: (String) -> Void = { _ in }
    var soundSettings: () -> Void = {}
    var refreshModel: () -> Void = {}
    var setSpeechModel: (String) -> Void = { _ in }
    var setSpeechLanguage: (String) -> Void = { _ in }
    var activateBeta: () -> Void = {}
    var showBeta: () -> Void = {}
    var testInsertion: () -> Void = {}
    var previewOverlay: () -> Void = {}
}
enum VPColor {
    static let background = Color(white: 0.982)
    static let sidebar = Color(white: 0.982)
    static let pink = Color(red: 0.932, green: 0.725, blue: 0.831)
    static let pale = Color(red: 0.993, green: 0.946, blue: 0.968)
    static let control = Color(red: 0.79, green: 0.42, blue: 0.62)
    static let rose = Color(red: 0.665, green: 0.232, blue: 0.435)
    static let ink = Color(white: 0.16)
    static let muted = Color(white: 0.49)
    static let line = Color(white: 0.88)
}
struct PinkButton: ButtonStyle {
    var prominent = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 13, weight: .semibold))
            .foregroundColor(prominent ? VPColor.ink : VPColor.rose)
            .padding(.horizontal, 18).padding(.vertical, 11)
            .background(prominent ? VPColor.pink : VPColor.pale)
            .clipShape(RoundedRectangle(cornerRadius: 9))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}
struct Keycap: View {
    let text: String
    var large = false
    var body: some View {
        Text(text).font(.system(size: large ? 26 : 13, weight: .medium, design: .rounded))
            .foregroundColor(VPColor.ink).padding(.horizontal, large ? 23 : 10).padding(.vertical, large ? 16 : 6)
            .background(Color.white).clipShape(RoundedRectangle(cornerRadius: large ? 12 : 6))
            .overlay(RoundedRectangle(cornerRadius: large ? 12 : 6).stroke(VPColor.line, lineWidth: 1))
    }
}
struct VoiceBrand: View {
    var large = false
    var body: some View {
        VStack(alignment: .leading, spacing: -3) {
            Text("voice").foregroundColor(VPColor.rose)
            Text("prompt").foregroundColor(VPColor.ink)
        }.font(.system(size: large ? 42 : 27, weight: .heavy, design: .rounded)).tracking(-1.5)
            .accessibilityElement(children: .ignore).accessibilityLabel("Voice Prompt")
    }
}
struct SettingsButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 12, weight: .medium))
            .foregroundColor(VPColor.ink).padding(.horizontal, 12).padding(.vertical, 7)
            .background(Color(white: configuration.isPressed ? 0.90 : 0.95))
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(VPColor.line, lineWidth: 0.5))
    }
}
struct VoiceRootView: View {
    @ObservedObject var model: VoiceUI
    let actions: VoiceActions
    var body: some View {
        Group { if model.onboarding { welcome } else { workspace } }
            .frame(minWidth: 680, minHeight: 540).background(VPColor.background)
            .foregroundColor(VPColor.ink).tint(VPColor.control).preferredColorScheme(.light)
    }
    var welcome: some View {
        VStack(spacing: 20) {
            VoiceBrand(large: true).padding(.top, 15)
            VStack(spacing: 8) {
                Text("把想法，说出来。").font(.system(size: 24, weight: .semibold))
                Text(model.holdToTalk ? "中文或英文，按住说话，松开结束。" : "中文或英文，按一下开始，再按一下结束。")
                    .font(.system(size: 13)).foregroundColor(VPColor.muted)
            }
            Keycap(text: model.shortcutLabel)
            card {
                permissionRow("mic", "麦克风", "只有开始说话时才录音", model.micGranted, actions.microphone)
                rule
                permissionRow("cursorarrow.click", "自动填入", "说完直接回到输入框，由你确认发送", model.pasteGranted, actions.accessibility)
            }.frame(maxWidth: 460)
            Text(model.permissionHint.isEmpty ? "录音无需每次 @；自动润色可在 AI 润色页设置。" : model.permissionHint)
                .font(.system(size: 11)).foregroundColor(VPColor.muted)
            Button("开始使用", action: actions.beginUsing).buttonStyle(PinkButton(prominent: true))
            Button("查看免费 AI 润色", action: actions.showBeta).buttonStyle(.plain).font(.system(size: 12)).foregroundColor(VPColor.rose)
            Text("本地识别 · Esc 取消 · 这份指南只在首次打开时出现")
                .font(.system(size: 10)).foregroundColor(VPColor.muted)
        }.padding(24).frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    var workspace: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                VStack(spacing: 3) {
                    VoiceBrand().frame(maxWidth: .infinity, alignment: .leading).padding(.leading, 16).frame(height: 74)
                    rule.padding(.horizontal, 8).padding(.bottom, 4)
                    nav("general", "通用", "hand.wave")
                    nav("history", "历史", "clock.arrow.circlepath")
                    nav("models", "模型", "cpu")
                    nav("advanced", "高级", "gearshape")
                    nav("polish", "AI 润色", "sparkles")
                    nav("about", "关于", "info.circle")
                    Spacer(minLength: 0)
                }.frame(width: 149).background(VPColor.sidebar)
                Divider().overlay(VPColor.line)
                ScrollView {
                    VStack(alignment: .leading, spacing: 23) {
                        if model.page == "general" { general }
                        else if model.page == "history" { history }
                        else if model.page == "models" { models }
                        else if model.page == "advanced" { advanced }
                        else if model.page == "about" { about }
                        else { polishing }
                        if !model.message.isEmpty { Text(model.message).font(.system(size: 11)).foregroundColor(VPColor.rose).textSelection(.enabled) }
                    }.padding(.horizontal, 16).padding(.vertical, 18).frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            rule
            HStack(spacing: 6) {
                Button { model.page = "models" } label: {
                    HStack(spacing: 6) {
                        Image(systemName: model.serviceReady ? "circle.fill" : "clock").font(.system(size: 7))
                        Text(model.serviceReady ? model.speechModelName : "正在连接…")
                        Image(systemName: "chevron.down").font(.system(size: 8))
                    }
                }.buttonStyle(.plain)
                Spacer()
                Button("使用指南", action: actions.tutorial).buttonStyle(.plain)
                Text("·  v" + (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.7.0"))
            }.font(.system(size: 10)).foregroundColor(VPColor.muted).padding(.horizontal, 15).frame(height: 34)
        }
    }
    var rule: some View { Rectangle().fill(VPColor.line).frame(height: 1) }
    func nav(_ id: String, _ title: String, _ icon: String) -> some View {
        Button { model.page = id } label: {
            HStack(spacing: 10) {
                Image(systemName: icon).font(.system(size: 20, weight: .regular)).frame(width: 23)
                Text(title).font(.system(size: 13, weight: model.page == id ? .medium : .regular))
                Spacer(minLength: 0)
            }.padding(.horizontal, 9).frame(height: 40)
                .background(model.page == id ? VPColor.pink : Color.clear).clipShape(RoundedRectangle(cornerRadius: 7))
        }.buttonStyle(.plain).padding(.horizontal, 7)
    }
    func heading(_ title: String, _ subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(title).font(.system(size: 19, weight: .semibold))
            Text(subtitle).font(.system(size: 12)).foregroundColor(VPColor.muted).fixedSize(horizontal: false, vertical: true).lineSpacing(3)
        }
    }
    func section<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.system(size: 11, weight: .medium)).foregroundColor(VPColor.muted).padding(.leading, 14)
            card(content)
        }
    }
    func card<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        VStack(spacing: 0, content: content).background(VPColor.background)
            .clipShape(RoundedRectangle(cornerRadius: 7)).overlay(RoundedRectangle(cornerRadius: 7).stroke(VPColor.line, lineWidth: 1))
    }
    func row<Control: View>(_ title: String, help: String = "", @ViewBuilder control: () -> Control) -> some View {
        HStack(spacing: 12) {
            HStack(spacing: 6) {
                Text(title).font(.system(size: 13, weight: .medium))
                if !help.isEmpty { Image(systemName: "info.circle").font(.system(size: 11)).foregroundColor(VPColor.muted).help(help).accessibilityLabel(help) }
            }
            Spacer(minLength: 8)
            control().font(.system(size: 12))
        }.padding(.horizontal, 15).frame(minHeight: 45)
    }
    func permissionRow(_ icon: String, _ title: String, _ subtitle: String, _ granted: Bool, _ action: @escaping () -> Void) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 18)).frame(width: 23)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.system(size: 13, weight: .medium))
                Text(subtitle).font(.system(size: 11)).foregroundColor(VPColor.muted)
            }
            Spacer(minLength: 8)
            if granted { Label("已允许", systemImage: "checkmark.circle").font(.system(size: 11)).foregroundColor(VPColor.rose) }
            else { Button("允许", action: action).buttonStyle(SettingsButton()) }
        }.padding(15)
    }
    var general: some View {
        Group {
            section("通用") {
                row("语音快捷键", help: "点击开始，再次点击结束；也可开启按住说话。") {
                    Picker("语音快捷键", selection: Binding(get: { model.shortcut }, set: actions.setShortcut)) {
                        Text("Option + Space").tag("option")
                        Text("Option + Shift + Space").tag("optionShift")
                        Text("Control + Option + Space").tag("controlOption")
                    }.labelsHidden().frame(width: 206).disabled(model.active)
                }
                rule
                row("实时识别预览", help: "停顿时更新原语言文字，连续说话时分段刷新；录音过程中不写入输入框。") {
                    Toggle("实时识别预览", isOn: $model.livePreviewEnabled).labelsHidden().toggleStyle(.switch).controlSize(.small).disabled(model.active)
                }
                row("按住说话", help: "按住语音快捷键录音，松开后自动识别。关闭时按一下开始，再按一下结束。") {
                    Toggle("按住说话", isOn: $model.holdToTalk).labelsHidden().toggleStyle(.switch).controlSize(.small).disabled(model.active)
                }
                rule
                row("取消快捷键", help: "录音或识别时按 Esc，取消本次输入。") { Keycap(text: "Escape") }
            }
            section(model.speechModelName + " 设置") {
                row("语言", help: "可以自动识别；固定说一种语言时，也可指定中文或英文。") {
                    Picker("说话语言", selection: Binding(get: { model.speechLanguage }, set: actions.setSpeechLanguage)) {
                        Text("自动识别").tag("auto")
                        Text("中文").tag("zh")
                        Text("English").tag("en")
                    }.labelsHidden().frame(width: 206).disabled(model.active)
                }
            }
            section("声音") {
                row("麦克风", help: "使用 macOS 当前默认输入设备。") {
                    Button("系统默认", action: actions.soundSettings).buttonStyle(SettingsButton())
                }
                rule
                row("声音提示", help: "开始与结束录音时播放提示音。") {
                    Toggle("声音提示", isOn: $model.sounds).labelsHidden().toggleStyle(.switch).controlSize(.small)
                }
                rule
                row("麦克风权限") {
                    if model.micGranted { Label("已允许", systemImage: "checkmark.circle").foregroundColor(VPColor.muted) }
                    else { Button("允许麦克风", action: actions.microphone).buttonStyle(SettingsButton()) }
                }
            }
            Text(model.holdToTalk ? "按住 \(model.shortcutLabel) 说话，松开后识别并填入。" : "按 \(model.shortcutLabel) 开始，再按一次结束。鼠标移到声波上可暂停或结束。")
                .font(.system(size: 11)).foregroundColor(VPColor.muted)
        }
    }
    var advanced: some View {
        Group {
            section("输入行为") {
                row("自动填入输入框", help: "自动填入会临时使用剪贴板并恢复原内容。关闭后只保留历史；不会自动发送。") {
                    Toggle("自动填入输入框", isOn: $model.autoInsert).labelsHidden().toggleStyle(.switch).controlSize(.small)
                }
                rule
                permissionRow("cursorarrow.click", "辅助功能权限", "让文字填回开始录音时的输入框", model.pasteGranted, actions.accessibility)
            }
            section("外观") {
                row("悬浮声波 · 无底板") { Button("预览", action: actions.previewOverlay).buttonStyle(SettingsButton()).disabled(model.active) }
            }
            section("隐私与历史") {
                row("本地语音识别") { Label("已开启", systemImage: "lock").foregroundColor(VPColor.muted) }
                rule
                row("历史保留时间") { Text("1 小时 · 最多 20 条").foregroundColor(VPColor.muted) }
                rule
                row("清空本次历史") { Button("清空", action: actions.clear).buttonStyle(SettingsButton()).disabled(model.entries.isEmpty) }
            }
            Text("录音处理后自动删除。识别原文只在本机处理；需要 AI 润色时，文字才会发送给配置的服务。")
                .font(.system(size: 12)).foregroundColor(VPColor.muted).lineSpacing(4)
        }
    }
    var models: some View {
        Group {
            heading("语音模型", "在这台 Mac 上识别，录音无需上传。")
            section("识别偏好") {
                row("识别模型") {
                    Picker("识别模型", selection: Binding(get: { model.speechModelId }, set: actions.setSpeechModel)) {
                        Text("Qwen · 精准测试版").tag("qwen3-asr-1.7b").disabled(!model.qwenReady)
                        Text("SenseVoice · 原版").tag("sensevoice-small")
                    }.labelsHidden().frame(width: 200).disabled(model.active)
                }
                rule
                row("说话语言") {
                    Picker("说话语言", selection: Binding(get: { model.speechLanguage }, set: actions.setSpeechLanguage)) {
                        Text("自动识别").tag("auto")
                        Text("中文").tag("zh")
                        Text("English").tag("en")
                    }.labelsHidden().frame(width: 200).disabled(model.active)
                }
            }
            HStack {
                Text("已安装的模型").font(.system(size: 12)).foregroundColor(VPColor.muted)
                Spacer()
                Button(action: actions.refreshModel) { Image(systemName: "arrow.clockwise") }.buttonStyle(SettingsButton()).help("重新检查模型").accessibilityLabel("重新检查模型")
            }
            VStack(alignment: .leading, spacing: 13) {
                HStack {
                    Text(model.speechModelName).font(.system(size: 15, weight: .semibold))
                    Label(model.modelReady ? "使用中" : "未就绪", systemImage: model.modelReady ? "checkmark" : "exclamationmark.circle")
                        .font(.system(size: 10, weight: .medium)).padding(.horizontal, 10).padding(.vertical, 4).background(VPColor.pink).clipShape(Capsule())
                    Spacer()
                }
                Text(model.speechModelId == "qwen3-asr-1.7b" ? "本地精准识别，支持中文、英文和术语提示。首次使用需加载模型。" : "轻量本地识别，保留为原版对照。")
                    .font(.system(size: 12)).foregroundColor(VPColor.muted).lineSpacing(4)
                rule
                HStack {
                    Label("中文 / English", systemImage: "globe"); Spacer()
                    Label(model.modelSize, systemImage: "internaldrive")
                }.font(.system(size: 11)).foregroundColor(VPColor.muted)
            }.padding(16).background(VPColor.pale.opacity(0.65)).clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(VPColor.pink.opacity(0.65), lineWidth: 2))
            Text("0.7 测试版 · 模型离线运行。Qwen 连续使用时复用模型，空闲 30 分钟后释放。")
                .font(.system(size: 11)).foregroundColor(VPColor.muted)
        }
    }
    var polishing: some View {
        Group {
            heading("AI 润色", "把口述整理成清楚的提示词，保留你的意思。")
            section("免费 AI 润色") {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Label(model.freeStatusTitle, systemImage: model.betaBusy ? "sparkles" : (model.betaIssue != nil ? "info.circle" : (model.betaActivated ? "checkmark.circle.fill" : "sparkles")))
                            .font(.system(size: 13, weight: .medium)).foregroundColor(model.betaIssue != nil ? VPColor.muted : VPColor.rose)
                        Spacer()
                        Button(model.betaBusy ? "正在连接" : (model.betaActivated && model.betaIssue == nil ? "检查连接" : "重试"), action: actions.activateBeta)
                            .buttonStyle(SettingsButton()).disabled(model.betaBusy || model.active)
                    }
                    if !model.betaMessage.isEmpty { Text(model.betaMessage).font(.system(size: 12)).foregroundColor(model.betaIssue != nil ? VPColor.muted : VPColor.rose).textSelection(.enabled) }
                    Text("语音在本机识别；润色时仅将文字发送至云端，由 MiniMax 处理。每台设备每天可用 30 次，共享额度繁忙时保留原文。可随时关闭自动润色。")
                        .font(.system(size: 11)).foregroundColor(VPColor.muted)
                    if model.betaActivated { Button("试填一句到输入框", action: actions.testInsertion).buttonStyle(SettingsButton()).disabled(model.active) }
                    if model.betaActivated && !model.pasteGranted { Button("允许自动填入", action: actions.accessibility).buttonStyle(SettingsButton()) }
                }.padding(16).frame(maxWidth: .infinity, alignment: .leading)
            }
            section("润色行为") {
                row("录音后自动润色", help: "开启后只用普通录音快捷键：结束录音后自动润色并填入草稿，不发送。关闭时，开头的文字 @voice-prompt 仍可单次开启润色。") {
                    Toggle("录音后自动润色", isOn: $model.polishOnRecord).labelsHidden().toggleStyle(.switch).controlSize(.small).disabled(model.active)
                }
                rule
                row("润色方式") {
                    Picker("润色方式", selection: Binding(get: { model.mode }, set: actions.setMode)) {
                        Text("轻润色").tag("clean"); Text("深度整理").tag("agent")
                    }.labelsHidden().frame(width: 140)
                }
            }
            Text(model.mode == "agent" ? "深度整理：理顺目标、背景与限制，合并重复表达；不会擅自增加要求或执行任务。" : "轻润色：去掉口头重复，补上标点与语法，保留表达顺序。")
                .font(.system(size: 12)).foregroundColor(VPColor.muted).lineSpacing(4)
            section("在 AGENT 中使用") {
                row("MiniMax Code") { Text("\(model.shortcutLabel) 开始 / 结束").foregroundColor(VPColor.muted) }
                rule
                row("OMP") { Text("Ctrl+Alt+Space 直接输入").foregroundColor(VPColor.muted) }
            }
            Text("想每次都先润色再填入，开启上面的开关即可。文字已保留时，点中目标输入框，再点击声波旁的填入箭头重试。无需复制，也不会自动发送。AI 不可用时保留原文。")
                .font(.system(size: 11)).foregroundColor(VPColor.muted)
        }
    }
    var history: some View {
        Group {
            HStack {
                heading("历史", "找回刚才说过的话。")
                Spacer()
                Button("清空", action: actions.clear).buttonStyle(SettingsButton()).disabled(model.entries.isEmpty)
            }
            if model.entries.isEmpty {
                VStack(spacing: 13) {
                    Image(systemName: "clock.arrow.circlepath").font(.system(size: 32, weight: .light)).foregroundColor(VPColor.muted)
                    Text("还没有录音记录").font(.system(size: 14, weight: .medium))
                    Text("在输入框按 \(model.shortcutLabel)，说出第一句话。")
                        .font(.system(size: 12)).foregroundColor(VPColor.muted)
                }.frame(maxWidth: .infinity).padding(.vertical, 72)
            }
            ForEach(model.entries.reversed()) { entry in VoiceHistoryRow(entry: entry) }
            Text("仅保留最近 1 小时的 20 条文字；退出应用后清除。")
                .font(.system(size: 10)).foregroundColor(VPColor.muted)
        }
    }
    var about: some View {
        Group {
            heading("Voice Prompt", "说出来，成为清楚的表达。")
            section("关于") {
                row("版本") { Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.7.0").foregroundColor(VPColor.muted) }
                rule
                row("使用指南") { Button("打开", action: actions.tutorial).buttonStyle(SettingsButton()) }
                rule
                row("开源许可与声明") { Button("查看", action: actions.notices).buttonStyle(SettingsButton()) }
            }
            Text("语音识别在本地完成。Agent 插件连接 AI 润色，两个部分共用这一套桌面录音体验。")
                .font(.system(size: 12)).foregroundColor(VPColor.muted).lineSpacing(4)
        }
    }
}
struct VoiceHistoryRow: View {
    let entry: VoiceEntry
    @State var original = false
    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack { Text(entry.created, style: .time); Spacer(); if entry.fallback { Text("已保留原文") } }.font(.system(size: 10)).foregroundColor(VPColor.muted)
            Text(original ? entry.raw : entry.text).font(.system(size: 13)).lineSpacing(4).textSelection(.enabled)
            HStack { if entry.raw != entry.text { Button(original ? "查看润色稿" : "查看原文") { original.toggle() } }; Spacer() }.buttonStyle(.plain).font(.system(size: 11)).foregroundColor(VPColor.rose)
        }.padding(17).background(Color.white).clipShape(RoundedRectangle(cornerRadius: 10)).overlay(RoundedRectangle(cornerRadius: 10).stroke(VPColor.line))
    }
}
// The waveform itself is the interface: transparent window, no containing surface.
enum RecordingLayout {
    static let previewWidth: CGFloat = 440
    static let previewHeight: CGFloat = 148
    static let windowWidth: CGFloat = 220
    static let windowHeight: CGFloat = 88
}
struct VoiceWave: Shape {
    var amplitude: Double
    var phase: Double
    let strand: Double
    var animatableData: AnimatablePair<Double, Double> {
        get { AnimatablePair(amplitude, phase) }
        set { amplitude = newValue.first; phase = newValue.second }
    }
    func path(in rect: CGRect) -> Path {
        var path = Path()
        for step in 0...120 {
            let x = Double(step) / 120
            let envelope = pow(sin(.pi * x), 1.6)
            let carrier = sin(x * .pi * 5 - phase + strand * 0.62)
            let overtone = sin(x * .pi * 3 + phase * 0.42 + strand) * 0.22
            let y = rect.midY + CGFloat((carrier + overtone) * envelope * amplitude) * rect.height * 0.39
            let point = CGPoint(x: rect.minX + CGFloat(x) * rect.width, y: y)
            if step == 0 { path.move(to: point) } else { path.addLine(to: point) }
        }
        return path
    }
}
struct VoiceWaveform: View {
    let level: Double
    let phase: VoicePhase
    var previewTime: Double? = nil
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var moving: Bool { [.listening, .transcribing, .polishing, .waiting, .inserting, .preview].contains(phase) }
    var amplitude: Double {
        if phase == .listening { return 0.10 + min(1, max(0, level)) * 0.86 }
        if phase == .preview { return 0.78 }
        if [.transcribing, .polishing, .waiting, .inserting].contains(phase) { return 0.34 }
        return 0.10
    }
    var body: some View {
        Group {
            if let previewTime { lines(time: previewTime) }
            else {
                TimelineView(.animation(minimumInterval: 1.0 / 30, paused: !moving || reduceMotion)) { context in
                    lines(time: reduceMotion || !moving ? 0 : context.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 120))
                }
            }
        }.frame(width: 116, height: 34)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(phase == .listening ? "正在录音，声波随麦克风音量变化" : "语音状态")
    }
    func lines(time: Double) -> some View {
            ZStack {
                ForEach(0..<3) { index in
                    VoiceWave(amplitude: amplitude * (1 - Double(index) * 0.16), phase: time * 2.2, strand: Double(index))
                        .stroke(LinearGradient(colors: [Color(red: 0.55, green: 0.64, blue: 0.72), Color(red: 0.63, green: 0.49, blue: 0.76), Color(red: 0.78, green: 0.57, blue: 0.64)], startPoint: .leading, endPoint: .trailing), style: StrokeStyle(lineWidth: index == 0 ? 2.4 : 1.3, lineCap: .round))
                        .opacity(index == 0 ? 1 : 0.45)
                }
            }
            .shadow(color: .black.opacity(0.12), radius: 3, y: 1)
    }
}
struct VoiceRecordingView: View {
    @ObservedObject var model: VoiceUI
    let actions: VoiceActions
    var previewHover = false
    var previewTime: Double? = nil
    @State private var hovered = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var ink: Color { model.overlayDark ? Color(white: 0.96) : Color(white: 0.10) }
    var showsTranscript: Bool { model.livePreviewEnabled && [.listening, .paused, .transcribing, .polishing].contains(model.phase) }
    var recording: Bool { model.phase == .listening || model.phase == .paused }
    var showControls: Bool { hovered || previewHover || model.phase == .paused || NSWorkspace.shared.isVoiceOverEnabled }
    var body: some View {
        VStack(spacing: 2) {
            if showsTranscript {
                VStack(spacing: 0) {
                    Text(String(model.liveText.suffix(180)))
                        .font(.system(size: 15, weight: .medium)).lineSpacing(3).lineLimit(3)
                        .multilineTextAlignment(.center).frame(maxWidth: .infinity, minHeight: 54)
                        .foregroundColor(ink)
                }.padding(.horizontal, 20).padding(.bottom, 6)
                    .accessibilityElement(children: .combine)
            }
            VoiceWaveform(level: model.level, phase: model.phase, previewTime: previewTime)
            ZStack {
                if recording {
                    HStack(spacing: 9) {
                        Text(model.time).font(.system(size: 10, design: .monospaced))
                        control(model.phase == .paused ? "play.fill" : "pause.fill", model.phase == .paused ? "继续录音" : "暂停录音", actions.pause)
                        control("stop.fill", "完成录音", actions.finish)
                        control("xmark", "取消 · Esc", actions.cancel)
                    }.opacity(showControls ? 1 : 0)
                        .allowsHitTesting(showControls).accessibilityHidden(!showControls)
                } else if model.phase != .preview {
                    HStack(spacing: 6) {
                        if model.phase == .polishing {
                            Text("正在润色").font(.system(size: 10, weight: .regular))
                        }
                        if model.phase == .saved {
                            Text(status).font(.system(size: 10, weight: .regular))
                        }
                        if model.phase == .saved || model.phase == .error {
                            if model.phase == .saved {
                                control("arrow.down.to.line", "点中目标输入框，再点这里重新填入", actions.retryInsertion)
                            }
                            control("arrow.up.right", "查看原因与权限设置", model.pasteGranted ? actions.settings : actions.accessibility)
                        } else if model.active && showControls {
                            control("xmark", "取消 · Esc", actions.cancel)
                        }
                    }.help(model.phase == .saved ? model.insertionHint : status)
                        .accessibilityLabel(status)
                }
            }.frame(height: 24)
                .foregroundColor(ink)
        }.frame(width: showsTranscript ? RecordingLayout.previewWidth : RecordingLayout.windowWidth, height: showsTranscript ? RecordingLayout.previewHeight : RecordingLayout.windowHeight)
            .contentShape(Rectangle()).onHover { hovered = $0 }
            .animation(reduceMotion ? nil : .easeInOut(duration: 0.16), value: showControls)
            .preferredColorScheme(model.overlayDark ? .dark : .light)
    }
    func control(_ icon: String, _ title: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).font(.system(size: 10, weight: .medium))
                .frame(width: 24, height: 24).contentShape(Rectangle())
        }.buttonStyle(.plain).help(title).accessibilityLabel(title)
    }
    var status: String {
        switch model.phase {
        case .transcribing: return "正在识别"
        case .polishing: return "正在润色"
        case .saved: return model.autoInsert && !model.pasteGranted ? "需要辅助功能权限" : "等待填入"
        case .inserting: return "正在填入"
        case .waiting: return "正在写入 OMP"
        case .done: return model.insertionConfirmed ? "已填入" : "已尝试填入"
        case .cancelled: return "已取消"
        case .error: return "未完成"
        default: return model.title
        }
    }
}
