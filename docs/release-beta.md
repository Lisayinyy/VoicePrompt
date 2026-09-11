Voice Prompt 0.7.0 beta.2（桌面 build 17）：新增录音中的识别文字预览，以及由 MiniMax Code Agent 引导的首次安装

停顿后显示最近说的话，连续说话时隔几秒更新；保持原语言，预览不进行 AI 润色，也不写入输入框。结束后再完整识别、润色和填入。默认开启，可在通用设置关闭。它是分段预览，不是逐字流式识别。

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

Qwen 需要 Apple Silicon Mac / macOS 15+，模型与运行环境另需磁盘空间。本机 M2 Pro / 16GB 已做公开音频推理测试；38 项 Node 检查、Skill 验证和隔离目录的全新桌面安装检查通过；新增 Swift 预览调度/未完成 WAV 测试，公开样本的 1.5/3.0/4.2 秒快照均完成实际识别。尚未验证另一台全新 Mac 的系统授权与真实输入链路，必须由测试者最终确认。

这是 ad-hoc 签名的开发包，**尚未 Developer ID 签名或公证**。公司管理设备可能禁止运行；遇到系统拦截，不要关闭 Gatekeeper 或删除安全属性来绕过。自动录音后润色需测试者自己的模型服务，不附带发布者账号或共享额度。

完整指南：https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md
