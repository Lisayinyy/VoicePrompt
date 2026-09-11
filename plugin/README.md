# Voice Prompt

快捷键语音输入与保留原意的 AI 润色。版本 0.7.0 本地识别测试版。

完整的安装、使用示例与架构说明见 [项目 README](https://github.com/Lisayinyy/VoicePrompt#readme)。

此目录是可独立导入的 Agent Plugins 1.0 connector。只安装 connector 不会安装桌面录音程序、模型或 AI 服务；需要先安装并启动 Voice Prompt.app。

## 0.7 测试版怎么用

1. 在 Voice Prompt 的「模型」页选择 Qwen · 精准测试版
2. 说话语言选择「自动识别」「中文」或「English」
3. 点中 MiniMax Code、OMP 或其他应用的输入框，用原来的快捷键录音
4. 等文字填入，检查后自己发送；AI 润色沿用已有设置
5. 想对比旧效果时，在同一页切回 SenseVoice · 原版

Qwen3-ASR 1.7B 8-bit 使用 MLX 在 Apple Silicon 本地运行。现有配置中的 terms 在识别阶段作为词汇提示传入；不会机械替换文本。录音不上传。AI 润色使用原来配置的服务，和语音识别分开。

一段录音整体识别（应用最多五分钟），不沿用旧模型的 25 秒分段。模型进程在连续录音之间复用，空闲三十分钟后释放；首次识别或空闲后再次识别需要加载。取消和超时会终止识别，不静默回退旧模型或上传云端。

## 安装与分发边界

本地测试版的 Qwen 运行环境及约 2.46 GB 模型由开发安装脚本 `scripts/setup-local-asr.py` 准备，固定依赖版本及模型 revision。它们不在 connector ZIP 内，也不在当前桌面 ZIP 内。桌面包仍包含 SenseVoice 回退模型；新安装默认使用 SenseVoice，Qwen 就绪后可在设置选择。

此开发脚本需要 uv；本机由开发者完成准备。正式市场版的一键安装、签名、公证与模型下载界面仍是后续工作，不能把当前测试版描述为任意用户安装 connector 后自动拥有全部依赖。

## MCP

`voice_status` 返回当前识别模型及语言设置。`voice_models` 显示已安装和选中状态。`voice_transcribe_file` 支持可选 `model`、`language`（auto/zh/en）和 `terms`，只转写指定本地 WAV，不开启麦克风。`voice_prepare_prompt` 负责文字润色。

全局录音快捷键由桌面应用管理；OMP 也提供编辑器专用入口。模型设置对两者共用的本地服务生效。更新后重连 MiniMax 的 MCP 或重新打开 OMP 会话以加载新的插件元数据。
