# 安装与使用

[返回首页](../README.md)

## 先选择要体验的能力

- **已经安装 Voice Prompt.app：** 启动它，再按下文导入 MiniMax Code connector。
- **只想先验证文字润色：** 安装 Node.js 22+，运行源码服务，并使用下面的开发 MCP 配置。不需要录音模型。
- **从零体验快捷键语音输入：** 在 Apple Silicon Mac / macOS 15+ 上，优先使用 [Agent 安装指南](agent-setup.md) 和内测 Release 桌面包；也可按 [开发文档](development.md) 自行构建。导入插件本身不会自动下载模型或申请系统权限。

0.7.0 新增 Qwen 本地识别，具体环境要求、安装命令和验收方式见 [0.7 内测指南](beta-0.7.md)。

## MiniMax Code

在 Plugins → Create → Import plugin from a Git repository 中填入：

```text
https://github.com/Lisayinyy/VoicePrompt
```

点击 Preview 检查名称，再 Import。进入 Personal → Voice Prompt → Try，或在聊天框输入 `@` 选择插件。附上要整理的文字并发送，即请求一次润色；返回结果是草稿。

录音前点中目标输入框，按 `Option + Space`，说完再按一次。桌面应用尝试把结果填回原输入框，你确认后发送。想在填入前就润色，请在桌面应用的 AI 润色页面打开“录音后自动润色”。宿主中提交的 @ 消息是另一条路径，不能让 MCP 在发送前监控聊天框。

### 纯源码文字服务

```sh
git clone https://github.com/Lisayinyy/VoicePrompt.git
cd VoicePrompt
npm run init
npm start
```

初始化会生成个人配置及本地令牌；不要把输出或配置提交到 Git。保持服务进程运行，并在支持手动 MCP 的客户端添加如下 stdio server，替换两处绝对路径：

```json
{
  "mcpServers": {
    "voice-prompt": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/VoicePrompt/plugin/server.mjs", "mcp"]
    }
  }
}
```

此方式用于开发。仓库自带的 `mcp-launch.sh` 则寻找已安装桌面应用中的 Node，不会自动切换到系统 Node。没有配置 AI 时，润色会返回原文和 fallback 提示；这是回退，不是 AI 润色成功。

## 配置 AI 润色

0.8.0 桌面版默认自动开通免费 AI 润色，无需邀请码或 API Key。下列手动配置只适用于开发或自定义服务。免费服务每台设备每天 30 次，受共享用量限制；已有配置保留。

先运行 `npm run init`，再编辑 `~/.config/voice-prompt/config.json` 中的对应字段，保留其余字段和已有 `token`。重启服务或桌面应用使其采用新配置。不要用以下片段覆盖整份配置。

### 使用已有 OMP 登录

```json
{
  "provider": "omp",
  "ompCommand": "/absolute/path/to/omp",
  "defaultMode": "agent",
  "terms": ["Voice Prompt", "MiniMax Code"]
}
```

先确认自己的 OMP CLI 可以调用模型。Voice Prompt 使用该 CLI 的现有配置；项目不附带账号。模型请求运行在临时目录中，并禁用工具与扩展，避免把待润色内容执行成任务。

### 使用兼容 Chat Completions 的服务

```json
{
  "provider": "openai-compatible",
  "baseUrl": "https://your-provider.example/v1",
  "model": "your-model-id",
  "apiKeyEnv": "VOICE_PROMPT_API_KEY",
  "defaultMode": "agent"
}
```

在启动服务的进程环境中设置 `VOICE_PROMPT_API_KEY`。地址、模型和凭证使用你自己的服务配置。Finder 启动的应用通常不继承终端环境；仅在终端 export 并不代表桌面服务已获得变量。开发时可从已配置环境的终端启动源码服务。远程端点必须使用 HTTPS。

### 连接 Prompt.ai

设置 `provider: "prompt-ai"` 和自己部署的 `baseUrl`。客户端会调用 `/voice/prepare`，要求响应声明 `schema: "prompt-ai-voice/1"`；旧的扩写接口不会被当作保真语音润色接口。服务端入口见 `worker/index.mjs`，上线前需要在外层接入自己的身份认证、限流与额度管理。

## OMP

先完成桌面运行包构建，再运行本地安装器：

```sh
node scripts/install.mjs --omp
```

安装前退出 Voice Prompt；完成后重新打开桌面应用并重启 OMP。安装器会备份现有应用、配置与同名扩展，注册 OMP connector。仅重新加载 JavaScript 不会替代桌面应用更新。

| 操作 | 方法 |
| --- | --- |
| 会话内开始 / 结束录音 | `Ctrl + Alt + Space` 或 `/voice input` |
| 整理指定文字 | `/voice-prompt 你的文字` 或 `/voice polish 你的文字` |
| 整理当前编辑区 | `Ctrl + Shift + V` |
| 查看当前草稿的原文 | `/voice raw` |
| 显式取回桌面草稿 | `/voice latest` |
| 查看状态 / 取消 | `/voice status` / `/voice cancel` |

会话录音通过 OMP 编辑器 API 写入，不使用系统剪贴板；编辑器或会话改变时会停止覆盖。不要把桌面全局快捷键也设为 Ctrl+Alt+Space，以免抢占 OMP 按键。

## 常见问题

**已保留，没有填入？** 点中需要输入的文本框，点击声波旁的填入箭头。检查 macOS 的麦克风、辅助功能授权与输入框焦点；更新 ad-hoc 签名的应用后，旧授权可能需要重新确认。失败时保留草稿，不能绕过系统授权。

**没有 @，仍然能录音？** 正常。桌面快捷键独立运行；MCP connector 让 Agent 能调用状态、模型、润色与文件转录工具。

**为什么文字没变化？** 检查 provider 是否配置、返回结果是否 fallback；也可能原话已足够清晰。不要仅凭“文字返回了”判断模型被调用。

**会自动发送吗？** 不会。桌面与 OMP 写入都不按 Enter；用户确认后发送。
