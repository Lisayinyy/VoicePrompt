# Voice Prompt · MiniMax Code 上架表单可复制稿

日期：2026-09-12
状态：可用于预填 MiniMax Code 插件上架表单；正式提交前仍需补 clean-machine 测试与提交账号信息

## 基础信息

| 字段 | 填写内容 |
| --- | --- |
| 插件名称 | Voice Prompt |
| 插件 ID / 机器名 | voice-prompt |
| 版本号 | 0.7.1 |
| 分类 | Productivity / 效率工具 |
| 目标区域 | CN |
| 目标客户端 | MiniMax Code 桌面端 |
| 作者 / 组织 | 待确认：Lisa Yin 或 Voice Prompt contributors |
| 支持邮箱 | 待填写提交账号邮箱 |
| 源码仓库 | https://github.com/Lisayinyy/VoicePrompt |
| 官网 | https://lisayinyy.github.io/VoicePrompt/ |
| 安装说明 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md |
| 数据与权限说明 | https://github.com/Lisayinyy/VoicePrompt/blob/main/minimax/data-and-permissions.md |
| 公开材料索引 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-marketplace-public-materials.md |
| 提交包索引 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-packet-2026-09-12.md |
| 提交记录模板 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-record-template.md |
| 后端公网 API 状态 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/backend-public-api-status.md |

## 一句话介绍

将口述整理成清晰的 AI 提问草稿，保留原意、数字和限制；配合桌面应用使用快捷键语音输入、实时预览和发送前润色。

## 简短描述

Voice Prompt 是一个面向桌面 Agent 工作流的语音输入与 Prompt 润色工具。用户聚焦 MiniMax Code 或其他输入框后，可以通过桌面应用快捷键开始录音，本地模型将语音转为文字，并在用户确认前将表达整理成更清晰的 Prompt。MiniMax Code 插件提供本地 MCP 与 Skill，用于检查安装状态、引导首次安装、整理给定文本，并帮助用户连接桌面工作流。

## 英文描述

Voice Prompt is a desktop voice input and prompt refinement tool for agent workflows. Users focus an input field, record with the companion macOS shortcut, transcribe speech locally, optionally refine the transcript into a clearer prompt, and review the inserted text before sending. The MiniMax Code plugin provides local MCP tools and Skill guidance for setup checks, first-use onboarding, supplied-text refinement, and connection to the desktop workflow.

## 示例问题

1. 检查 Voice Prompt 是否已准备好语音输入
2. 整理这段口述：嗯，请检查登录页，不要修改数据库，保留版本 2.0
3. 帮我完成 Voice Prompt 首次安装，并开启录音后自动润色

## 权限说明

Voice Prompt 需要以下权限配合桌面应用使用：

- 麦克风：用户按快捷键开始录音后采集语音
- 辅助功能：将整理后的文字填入当前聚焦输入框
- 网络：下载本地模型文件，并在用户启用 AI 润色时调用配置的模型服务
- 本地存储：保存应用、模型文件、配置和非敏感运行状态

插件导入本身不会自动授予系统权限，也不会静默安装桌面应用或模型。macOS 权限需要用户本人在系统弹窗和设置中确认。

## 数据说明

录音只在用户主动开始录音后发生。本地 ASR 在用户 Mac 上运行。开启 AI 润色时，发送的是转写后的文本和可选术语，不会因为文字润色自动上传原始录音。用户会在发送前看到填入的最终文本，并自行确认是否发送。

当前 0.7.1 上架候选包不包含发布者统一付费的云端润色额度，也不会读取或提取 MiniMax Code 用户订阅凭据。共享云端润色能力仍在 HTTPS API、客户令牌和额度控制验证阶段。

## 使用边界

`@Voice Prompt` 用于调用插件工具或 Skill 引导，例如检查状态、指导安装、整理给定文字。它不是麦克风开关。真正的全局快捷键录音、实时预览和输入框注入由配套 macOS 桌面应用完成。

首版上架建议描述为“本地 MCP + Skill + 桌面伴侣应用”的组合。除非后续完成 Streamable HTTP MCP 适配并通过 MiniMax 联调，否则不要把 `/voice/prepare` REST 接口描述成 MiniMax 远程 MCP Connector。

## 包体证据

| 项目 | 内容 |
| --- | --- |
| 候选 ZIP | `dist/minimax/voice-prompt-minimax-0.7.1.zip` |
| SHA-256 | `acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072` |
| ZIP 大小 | 101,178 bytes |
| 解包大小 | 97,622 bytes |
| 文件 / 条目 | 32 files / 32 ZIP entries |
| 本地预检 | Passed |
| Marketplace review | Not submitted |

## 当前未完成项

- 自动隔离 clean preflight 已通过；真实 clean-machine 新机测试尚未完成
- MiniMax Code 表单尚未正式提交
- `api.voiceprompt.work` 公网 HTTPS API 尚未可用，当前不能作为 hosted polish 证据
- 桌面应用仍是 beta 分发路径，正式公开分发前还需要签名、公证和新设备安装验证

## 提交前最终检查

1. 确认提交账号和支持邮箱
2. 确认作者字段使用 Lisa Yin 还是 Voice Prompt contributors
3. 可先运行 `node scripts/make-minimax-submission-bundle.mjs` 生成本地提交材料包
4. 上传 `dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip` 或原始 `dist/minimax/voice-prompt-minimax-0.7.1.zip`
5. 附上官网、安装说明、数据说明、公开材料索引
6. 完成真实 clean-machine 测试报告；自动隔离预检报告已生成
7. 保存 MiniMax 返回的 submission_id、提交邮箱、区域、客户端和任何 Release/MR 链接
