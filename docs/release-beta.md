Voice Prompt 0.7.0 beta.3（桌面 build 22）：软件主题跟随与简洁语音浮窗

## 这次更新

- 当前 ChatGPT/Codex 桌面端优先跟随软件内部深浅主题，切换后约一秒刷新字幕颜色
- 纯色字幕，无描边、无文字阴影；移除实时预览、校准、识别等多余说明
- 仅在 AI 实际润色时显示小号“正在润色”，完成后消失
- 保留停顿后的原语言识别预览，录音中不填入；结束后完整识别、按设置润色，再填入输入框，由用户确认发送

软件内部主题适配目前明确支持当前 ChatGPT/Codex。其他软件采用可读取的原生外观或系统外观，不代表已经支持 MiniMax Code、浏览器等软件的独立主题。

## 同事怎么开始

1. 在 MiniMax Code 导入 `https://github.com/Lisayinyy/VoicePrompt`
2. 发送：`@Voice Prompt 帮我完成首次安装并开启录音后 AI 润色`
3. Agent 按插件内指南检查环境、下载并校验安装工具包，准备桌面应用、Python/MLX 和 Qwen
4. 用户完成系统授权，使用自己的 AI 服务配置，最后测试 Option+Space 录音和填入

需要宿主授予终端/文件操作能力；可用时使用桌面控制引导设置。只有桌面控制权限、没有终端工具的环境不保证能代办安装。

## 下载内容

- `voice-prompt-setup-0.7.0.zip`：给 Agent 使用的安装脚本、源码及指南；不是自动执行的安装器
- `voice-prompt-desktop-0.7.0-macos-arm64.zip`：桌面应用、自带 Node 和 SenseVoice；不含个人配置或账号
- `voice-prompt-connector-0.7.0.zip`：独立 MCP/Skill connector，包含首次安装指南；不能独立录音
- `SHA256SUMS`：以上三个文件的 SHA-256 校验值

运行工具包中的 `sh scripts/setup-colleague.sh --install` 会联网下载桌面包、固定版本的 uv/Python 依赖及约 2.46GB 的 Qwen 权重，并执行校验。不要在导入钩子中运行它。脚本不更改 AI 账号、不打开麦克风、不绕过系统授权。

## 适用范围与测试

Qwen 需要 Apple Silicon Mac / macOS 15+，模型与运行环境另需磁盘空间。本机 M2 Pro / 16GB 已做公开音频推理测试；38 项 Node 检查、Skill 验证和隔离目录的全新桌面安装检查通过；Swift 软件主题优先级、配置变更、应用隔离及预览调度/未完成 WAV 测试，公开样本的 1.5/3.0/4.2 秒快照均完成实际识别。尚未验证另一台全新 Mac 的系统授权与真实输入链路，必须由测试者最终确认。

这是 ad-hoc 签名的开发包，**尚未 Developer ID 签名或公证**。公司管理设备可能禁止运行；遇到系统拦截，不要关闭 Gatekeeper 或删除安全属性来绕过。自动录音后润色需测试者自己的模型服务，不附带发布者账号或共享额度。

完整指南：https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md

## 免费内测

项目源码以 MIT 许可证开放，本内测版本不收取插件或桌面应用费用。语音识别在本机运行；AI 润色需要用户自己的模型服务，其 API 或订阅费用由相应服务决定，不提供共享账号或无限免费云端额度。
