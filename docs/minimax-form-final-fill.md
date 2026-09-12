# Voice Prompt · MiniMax Code 上架表单最终填写版

日期：2026-09-12  
状态：提交前最终填写稿；除邮箱、提交账号和表单返回信息外，其余字段可直接复制。

## 1. 表单基础字段

| 表单字段 | 直接填写 |
| --- | --- |
| 操作类型 | 新增插件 |
| 插件名称 | Voice Prompt |
| 插件 ID / 机器名 | voice-prompt |
| 版本号 | 0.7.1 |
| 分类 | Productivity / 效率工具 |
| 目标区域 | CN |
| 启用端 | MiniMax Code 桌面端 |
| 作者 / 组织 | Lisa Yin |
| 提交邮箱 | TODO：填写实际登录并接收审核通知的邮箱 |
| 支持邮箱 | TODO：建议先与提交邮箱一致 |
| 源码仓库 | https://github.com/Lisayinyy/VoicePrompt |
| 官网 | https://lisayinyy.github.io/VoicePrompt/ |
| 安装说明 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md |
| 数据与权限说明 | https://github.com/Lisayinyy/VoicePrompt/blob/main/minimax/data-and-permissions.md |
| 公开材料索引 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-marketplace-public-materials.md |
| 提交包索引 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-packet-2026-09-12.md |
| 提交日 Runbook | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-day-runbook.md |
| 人工确认字段 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-human-fields.md |
| 自动隔离预检报告 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-clean-preflight-report.json |
| 公开链接检查 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-public-link-check.json |

如果 MiniMax 后台提示已有 CN 的 `voice-prompt` 记录，则把“操作类型”改为“更新插件”，并补维护权证明。否则按“新增插件”提交。

## 2. 上传文件

上传：

```text
dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip
```

校验信息：

```text
SHA-256: acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072
Version: 0.7.1
ZIP size: 101,178 bytes
Unpacked size: 97,622 bytes
Files / entries: 32 / 32
```

不要上传旧的 0.7.0 connector 包、源码根目录、`minimax/` 模板目录或 setup 包。

## 3. 一句话介绍

将口述整理成清晰的 AI 提问草稿，保留原意、数字和限制；配合桌面应用使用快捷键语音输入、实时预览和发送前润色。

## 4. 简短描述

Voice Prompt 是一个面向桌面 Agent 工作流的语音输入与 Prompt 润色工具。用户聚焦 MiniMax Code 或其他输入框后，可以通过桌面应用快捷键开始录音，本地模型将语音转为文字，并在用户确认前将表达整理成更清晰的 Prompt。MiniMax Code 插件提供本地 MCP 与 Skill，用于检查安装状态、引导首次安装、整理给定文本，并帮助用户连接桌面工作流。

## 5. 英文描述

Voice Prompt is a desktop voice input and prompt refinement tool for agent workflows. Users focus an input field, record with the companion macOS shortcut, transcribe speech locally, optionally refine the transcript into a clearer prompt, and review the inserted text before sending. The MiniMax Code plugin provides local MCP tools and Skill guidance for setup checks, first-use onboarding, supplied-text refinement, and connection to the desktop workflow.

## 6. 示例问题

```text
检查 Voice Prompt 是否已准备好语音输入
```

```text
整理这段口述：嗯，请检查登录页，不要修改数据库，保留版本 2.0
```

```text
帮我完成 Voice Prompt 首次安装，并开启录音后自动润色
```

## 7. 权限说明

Voice Prompt 需要以下权限配合桌面应用使用：

- 麦克风：用户按快捷键开始录音后采集语音
- 辅助功能：将整理后的文字填入当前聚焦输入框
- 网络：下载本地模型文件，并在用户启用 AI 润色时调用配置的模型服务
- 本地存储：保存应用、模型文件、配置和非敏感运行状态

插件导入本身不会自动授予系统权限，也不会静默安装桌面应用或模型。macOS 权限需要用户本人在系统弹窗和设置中确认。

## 8. 数据说明

录音只在用户主动开始录音后发生。本地 ASR 在用户 Mac 上运行。开启 AI 润色时，发送的是转写后的文本和可选术语，不会因为文字润色自动上传原始录音。用户会在发送前看到填入的最终文本，并自行确认是否发送。

当前 0.7.1 上架候选包不包含发布者统一付费的云端润色额度，也不会读取或提取 MiniMax Code 用户订阅凭据。共享云端润色能力仍在 HTTPS API、客户令牌和额度控制验证阶段。

## 9. 使用边界

`@Voice Prompt` 用于调用插件工具或 Skill 引导，例如检查状态、指导安装、整理给定文字。它不是麦克风开关。真正的全局快捷键录音、实时预览和输入框注入由配套 macOS 桌面应用完成。

首版上架建议描述为“本地 MCP + Skill + 桌面伴侣应用”的组合。除非后续完成 Streamable HTTP MCP 适配并通过 MiniMax 联调，否则不要把 `/voice/prepare` REST 接口描述成 MiniMax 远程 MCP Connector。

## 10. 当前未完成项说明

如果表单有“补充说明 / 备注”，可以写：

```text
0.7.1 为本地 MCP + Skill + macOS 桌面伴侣应用的上架候选版。自动隔离 clean preflight、公开链接检查、ZIP 本地校验和测试套件均已通过。真实第二台 Mac 的麦克风、辅助功能授权和输入框填入测试将作为后续 clean-machine 体验报告补充；当前不宣称 marketplace 已审核通过、桌面应用已公证、或已提供发布者共享云端润色额度。
```

## 11. 提交前命令

提交前运行：

```sh
npm run preflight:minimax-submit
```

期望结果：

```text
status: passed
public links: 15/15 passed, 1 skipped self-report link
clean preflight: passed
tests: 48/48 passed
```

## 12. 提交后命令

拿到官方 submission_id 后运行：

```sh
npm run record:minimax-submission -- \
  --submission-id <官方返回的ID> \
  --submitter-email <提交邮箱> \
  --support-email <支持邮箱> \
  --author "Lisa Yin" \
  --operation "new plugin"
```

如果有表单记录链接，再加：

```sh
--submission-url <链接>
```
