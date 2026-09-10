# 开发与打包

[返回首页](../README.md)

## 目录

| 路径 | 内容 |
| --- | --- |
| `native/` | Swift macOS 应用、快捷键、浮窗、焦点检查与剪贴板事务 |
| `plugin/lib/` | 本地 HTTP 服务、MCP、识别、AI 提供者与保真策略 |
| `plugin/omp/` | OMP 会话内编辑器集成 |
| `skills/` | 仓库根插件的 Agent 行为说明 |
| `plugin/skills/` | 独立 connector 打包所用的同一份 Skill |
| `worker/` | 可嵌入 Prompt.ai 的最小语音润色 Worker 入口 |
| `tests/` | Node 单元测试与 Swift 行为测试 |
| `scripts/` | 构建、打包、安装与验证 |
| `media/` | 已剪辑宣传片、封面与动效预览 |

## 检查

```sh
npm test
node scripts/verify-direct-omp.mjs
```

第二条要求本机存在 `~/.local/bin/omp`；它通过真实 OMP RPC 配合确定的转录 fixture 检查编辑器写入，不录制麦克风，也不调用模型。不要把它当作音频或云模型验收。

Swift 测试可用 Xcode Command Line Tools 编译，例如：

```sh
swiftc native/VoiceHotkey.swift tests/hotkey.test.swift -o /tmp/voice-hotkey-test
/tmp/voice-hotkey-test
```

其他测试分别与对应的 VoiceDirectEdit、VoicePasteboard、VoiceInputGuard 源文件编译。Pasteboard 测试使用独立命名的测试板，不接触系统剪贴板。

## 构建独立桌面应用

当前发布工具针对 Apple Silicon macOS 13+，需要 Swift 编译器、Python 3.11+ 与已准备好的上游构建输入。此脚本是打包器，不是自动下载所有工具的安装向导。

准备 `BUILD_DIR`：

1. Node.js 22+ 的官方 darwin-arm64 `.tar.gz` 及对应解压目录，目录内需要 `bin/node` 与 `LICENSE`。
2. `node-provenance.json`，包含 `archive` 文件名和核对过官方校验信息的 `sha256`。
3. transcribe.cpp 的 `e2f82cb6702315a1194f3bf1a6fee67cd2678447` 源码，目录名为 `transcribe.cpp-e2f82cb6702315a1194f3bf1a6fee67cd2678447`，保留自身及 ggml 的许可文件。
4. 该版本编译的可执行文件 `compiled/bin/transcribe-cli`。现有运行包使用 CPU + Apple Accelerate，关闭 Metal 以避免首次着色器编译。
5. 另行准备 SenseVoiceSmall Q8 GGUF 模型。来源为 `handy-computer/SenseVoiceSmall-gguf` 的 revision `4a08b8e900b38a977e32eb08d5d0697d6e72ba04`，SHA-256 必须为 `6c759ee4c9748c9b3f7a5a60ca74f0f7e685fb9d45d1378fce7cfd62f59adf29`。

```sh
python3 scripts/build-runtime.py /absolute/build-dir /absolute/sensevoice-small.gguf
npm run pack
```

桌面 ZIP 输出到 `dist/voice-prompt-desktop-0.6.5-macos-arm64.zip`，包含应用、Node、识别引擎、模型及第三方声明。`npm run pack` 单独打包 connector，不附带这些桌面组件。

脚本会验证输入哈希并进行 ad-hoc 签名。面向普通用户分发前，仍需完成可信构建输入准备、Developer ID 签名、公证、安装与更新流程；这些尚未作为公开发布流水线交付。

## 本机开发安装

```sh
node scripts/install.mjs --omp --mcode=/absolute/path/to/minimax-data
```

仅在已构建上述 ZIP 后运行。自行确认 MiniMax Code 数据目录；不要把示例路径当作真实路径。先退出 Voice Prompt。安装器备份旧版本后更新本地应用，并按参数安装 connector；不发布到 MiniMax 公共插件市场。

## 根插件与独立 connector

根目录 `mcp.json` 的 `cwd` 指向 `./plugin`，调用其启动脚本；独立 ZIP 则使用 `plugin/` 内的 manifest。修改 Skill 时同步两份文件，包装测试会检查它们一致。根目录为 Git 仓库导入入口，嵌套目录是可独立分发的 connector 源。

## 与 Prompt.ai 结合

`worker/index.mjs` 是 `/voice/prepare` 最小路由，复用 `plugin/lib/worker-voice.mjs` 的策略，不包含网站原来的扩写产品。Worker 使用 `MINIMAX_API_KEY`，当前适配代码中固定了服务端模型；部署者需要按自己的服务能力检查端点与模型配置。

对外暴露前，在父 Worker 中加入身份验证、速率限制与消费配额。仓库没有部署该服务，也没有提供公共额度。客户端只有收到 `prompt-ai-voice/1` 响应并通过保真检查后，才采用润色结果。

## 发布文件边界

源码、许可、公开示例和剪辑后的宣传素材可以提交。个人配置、令牌、API key、历史转录、原始录屏、模型及本地构建包均不进入 Git。桌面模型与运行时应通过独立的版本化安装包分发，并保留对应许可。
