# Voice Prompt 安装与免费润色

在 MiniMax Code 中选中 @Voice Prompt，发送「安装」。Agent 按随包的 [安装步骤](agent-setup.md) 下载桌面应用、运行环境与 Qwen 模型。

支持 Apple Silicon Mac、macOS 15+，首次准备需要数 GB 下载。系统麦克风与辅助功能权限由用户本人确认。

## 免费 AI 润色

打开 Voice Prompt 后自动开通免费服务，无需邀请码、账号、API Key 或 Provider 配置。自动开通会实际验证一次模型调用，成功后开启「录音后自动润色」。看到「免费 AI 润色已就绪」后，点击目标输入框，按 Option＋空格开始，再按一次结束，检查文字后发送。

模型 Key 只存于 Voice Prompt 服务器；这台 Mac 的独立访问凭证保存在钥匙串。不会读取 MiniMax Code 的 Key。现有自定义服务会保留，用户可在 AI 润色页面切换免费服务。

每台设备每天 30 次调用，共享总量和并发有限。失败时保留原文，不会向用户收费。显示「服务暂不可用」时，无需修改 Provider 或填写 API Key，稍后点「重试」。显示「等待授权」时，由用户确认这台 Mac 的钥匙串提示。只有真实润色验证通过后才显示「已就绪」。

## 自动填入

在每台 Mac 分别允许麦克风和辅助功能。点击「试填一句到输入框」，在 5 秒内点中 MiniMax Code 输入框，可单独检查 AI 润色与写入。应用通过系统输入事件写入，不使用剪贴板，不自动发送。

检查实际出现的文字；权限开关、工具注册成功、HTTP 200 都不能单独证明写入成功。诊断为 unconfirmed 时先确认输入框内容，避免重复填入。

## 本版下载校验

配套插件与桌面应用版本 0.8.0，桌面 build 30。发布页为 https://github.com/Lisayinyy/VoicePrompt/releases/tag/v0.8.0

| 文件 | SHA-256 |
| --- | --- |
| voice-prompt-desktop-0.8.0-macos-arm64.zip | `b450e45be8502f60b5c5c0e590d60e1ec767971875b5f3fbb2bda50e715967f4` |

安装工具包 voice-prompt-setup-0.8.0.zip 的校验值见同一发布页 SHA256SUMS。不得用旧包代替。发布页尚未出现本版时，应使用发布者提供并核验的候选包，不能声称市场已经更新。

当前桌面构建采用 ad-hoc 签名，尚未完成 Developer ID 公证。系统或公司管理策略可能阻止安装；需要用户处理系统提示，不能关闭 Gatekeeper 或绕过权限。
