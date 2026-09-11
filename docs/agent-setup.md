# 让 MiniMax Code 帮你安装 Voice Prompt

导入插件后，在 MiniMax Code 发送：

> @Voice Prompt 帮我完成首次安装，配置中文和英文语音输入，并开启录音后 AI 润色，最后检查能否填入输入框

Agent 将使用你已授权的终端/文件工具安装，用可用的桌面工具引导设置。你不需要自己安装 Handy、Node、Python 或复制终端命令。系统授权与账号选择可能需要你完成。若宿主没有这些工具，Agent 必须明确说明无法代办的部分。

## 适用范围

- Apple Silicon Mac，macOS 15+；建议先在有至少 8GB 可用磁盘空间的机器上准备
- 桌面包约 268 MiB，Qwen 权重约 2.46GB，另需 Python、依赖和下载缓存
- 这是 ad-hoc 签名的开发内测包，未公证；macOS 可能要求用户本人在“隐私与安全性”中处理可信应用的打开提示
- 自动录音后润色需要你自己的 OMP 登录或兼容 AI 服务；本项目不提供共享账号

## 给 Agent 的执行步骤

1. 使用插件内 `skills/voice-prompt/references/setup.md`，检查系统和现有安装。只 @ 名称时先做只读检查；用户明确要求安装后继续。已经可用的安装不要重复覆盖。
2. 从 [v0.7.0-beta.2 内测发布页](https://github.com/Lisayinyy/VoicePrompt/releases/tag/v0.7.0-beta.2) 下载 `voice-prompt-setup-0.7.0.zip` 与 `SHA256SUMS`，校验 setup ZIP，解压到用户可写的独立工作目录。不要改写已导入插件的只读目录。发布页的 SHA256SUMS 与 HTTPS 发布来源一起使用。
3. 阅读解压后的 `VoicePrompt/scripts/setup-colleague.sh`。先执行 `sh scripts/setup-colleague.sh --check`，再执行 `sh scripts/setup-colleague.sh --install`。这是宿主 Agent 在已获授权任务中运行安装流程，不是插件导入钩子。
4. 安装器会校验桌面包、验证代码签名、备份并安装应用、自动准备固定版本的 uv/Python/MLX，下载并校验 Qwen，最后选择新模型。脚本不会更改 AI 账号，也不会绕过 macOS 权限。模型下载失败时保留缓存，解决网络问题后重试。
5. 打开 `~/Applications/Voice Prompt.app`，让用户处理必要的系统授权。辅助功能显示允许还不代表写入成功，需要最后的真实输入测试。
6. 检查 AI 配置。已有可用配置继续使用；新用户按 [AI 配置](installation.md#配置-ai-润色) 使用自己的 OMP 或兼容服务。不得把发布者的个人配置带过来。打开“录音后自动润色”，选择深度整理。
7. 重新连接 MiniMax 的 MCP，检查 `voice_setup_status`、`voice_status`、`voice_models`。一个 nonsensitive 润色示例需实际返回 `fallback=false` 才算 AI 成功；配置字段存在不算成功。
8. 请用户在 MiniMax 输入框按 Option+Space，说一句话，再按一次。检查识别、润色、实际填入，文字由用户确认发送。不可用项单独报告，不能将仅 HTTP 成功或模型文件存在当作全链路完成。

## OMP

如果用户也使用 OMP，可在桌面应用退出时从解压的源码目录运行 `node scripts/install.mjs --omp`；Node 可用已安装应用的 `Contents/Resources/bin/node`。这会更新桌面与 OMP connector 并保留备份。已有桌面已就绪时，也可按其插件管理流程安装仓库根插件，重开 OMP 会话后检查 `/voice status`。OMP 会话录音为 Ctrl+Alt+Space；需要润色当前编辑区时使用 Ctrl+Shift+V。

## 当前验证边界

发布包校验、隔离目录安装和本机组件检查不能替代另一台 Mac 的系统授权及真实录音测试。Agent 应明确区分已安装、已推理、已润色与已写入。尚未公证，不能保证所有公司管理设备都允许安装此内测包。
