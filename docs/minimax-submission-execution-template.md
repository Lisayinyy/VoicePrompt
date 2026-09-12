# Voice Prompt · MiniMax Code MCP 上架执行模板

日期：2026-09-12  
状态：提交前执行模板；用于按 MiniMax Code MCP 插件市场流程逐项填写、上传、记录结果。正式提交前仍需补真实 clean-machine 测试和提交账号信息。

## 0. 本次上架目标

把 Voice Prompt 作为 **MiniMax Code 桌面端的本地 MCP + Skill 插件候选包**提交审核。首版上架范围是：让用户在 MiniMax Code 中通过 `@Voice Prompt` 检查安装状态、获得首次安装引导、整理已提供的口述文字，并连接 Voice Prompt 桌面应用的语音输入工作流。

首版不要宣称：

- 已经通过 MiniMax marketplace 审核
- 已经有 submission_id
- 导入插件后会静默安装桌面 App、模型或 macOS 权限
- 已经提供 MiniMax 托管的远程 Streamable HTTP MCP Connector
- 已经提供发布者统一付费的共享云端润色额度
- `api.voiceprompt.work` 已经是可公开使用的 HTTPS 润色 API

## 1. 提交前当前状态

| 项目 | 当前结论 |
| --- | --- |
| 插件名称 | Voice Prompt |
| 插件机器名 | `voice-prompt` |
| 版本 | 0.7.1 |
| 目标区域 | CN |
| 目标客户端 | MiniMax Code 桌面端 |
| 提交路线 | ZIP 上传，本地 MCP + Skill candidate |
| 官网 | https://lisayinyy.github.io/VoicePrompt/ |
| 源码仓库 | https://github.com/Lisayinyy/VoicePrompt |
| Marketplace 状态 | 未提交 |
| Hosted polish 状态 | 不作为 0.7.1 上架承诺 |

## 2. 正式上传文件

表单里选择 ZIP 上传路线，上传以下文件：

```text
dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip
```

如果提交时没有生成 `dist/submission`，可以重新生成：

```sh
node scripts/make-minimax-submission-bundle.mjs
```

也可以上传原始构建产物：

```text
dist/minimax/voice-prompt-minimax-0.7.1.zip
```

不要上传：

- `dist/voice-prompt-connector-0.7.0.zip`
- `dist/voice-prompt-setup-0.7.0.zip`
- 原始 `minimax/` 文件夹
- 仓库根目录

## 3. 表单字段填写稿

| 表单字段 | 建议填写 |
| --- | --- |
| 操作类型 | 新增插件；如果 MiniMax 后台已有 CN 的 `voice-prompt` 记录，则改为更新插件 |
| 插件名称 | Voice Prompt |
| 插件 ID / 机器名 | voice-prompt |
| 版本号 | 0.7.1 |
| 分类 | Productivity / 效率工具 |
| 目标区域 | CN |
| 启用端 | MiniMax Code 桌面端 |
| 作者 / 组织 | TODO：Lisa Yin 或 Voice Prompt contributors |
| 提交邮箱 | TODO：提交账号邮箱 |
| 支持邮箱 | TODO：支持邮箱，建议与提交邮箱一致或使用正式支持邮箱 |
| 源码仓库 | https://github.com/Lisayinyy/VoicePrompt |
| 官网 | https://lisayinyy.github.io/VoicePrompt/ |
| 安装说明 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md |
| 数据与权限说明 | https://github.com/Lisayinyy/VoicePrompt/blob/main/minimax/data-and-permissions.md |
| 公开材料索引 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-marketplace-public-materials.md |
| 提交包索引 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-packet-2026-09-12.md |
| Clean-machine 报告 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-clean-machine-test-report.md |
| 自动隔离预检报告 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-clean-preflight-report.json |
| 公开链接检查 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-public-link-check.json |
| 人工确认字段 | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-human-fields.md |

## 4. 一句话介绍

将口述整理成清晰的 AI 提问草稿，保留原意、数字和限制；配合桌面应用使用快捷键语音输入、实时预览和发送前润色。

## 5. 中文描述

Voice Prompt 是一个面向桌面 Agent 工作流的语音输入与 Prompt 润色工具。用户聚焦 MiniMax Code 或其他输入框后，可以通过桌面应用快捷键开始录音，本地模型将语音转为文字，并在用户确认前将表达整理成更清晰的 Prompt。MiniMax Code 插件提供本地 MCP 与 Skill，用于检查安装状态、引导首次安装、整理给定文本，并帮助用户连接桌面工作流。

## 6. 英文描述

Voice Prompt is a desktop voice input and prompt refinement tool for agent workflows. Users focus an input field, record with the companion macOS shortcut, transcribe speech locally, optionally refine the transcript into a clearer prompt, and review the inserted text before sending. The MiniMax Code plugin provides local MCP tools and Skill guidance for setup checks, first-use onboarding, supplied-text refinement, and connection to the desktop workflow.

## 7. 示例问题

1. 检查 Voice Prompt 是否已准备好语音输入
2. 整理这段口述：嗯，请检查登录页，不要修改数据库，保留版本 2.0
3. 帮我完成 Voice Prompt 首次安装，并开启录音后自动润色

注意：`@Voice Prompt` 是调用插件工具或 Skill 引导，不是麦克风开关。真正的快捷键录音、实时预览和输入框注入由 macOS 桌面应用完成。

## 8. 权限与数据说明

Voice Prompt 需要以下权限配合桌面应用使用：

- 麦克风：用户按快捷键开始录音后采集语音
- 辅助功能：将整理后的文字填入当前聚焦输入框
- 网络：下载本地模型文件，并在用户启用 AI 润色时调用配置的模型服务
- 本地存储：保存应用、模型文件、配置和非敏感运行状态

录音只在用户主动开始录音后发生。本地 ASR 在用户 Mac 上运行。开启 AI 润色时，发送的是转写后的文本和可选术语，不会因为文字润色自动上传原始录音。用户会在发送前看到填入的最终文本，并自行确认是否发送。

当前 0.7.1 上架候选包不包含发布者统一付费的云端润色额度，也不会读取或提取 MiniMax Code 用户订阅凭据。共享云端润色能力仍在 HTTPS API、客户令牌和额度控制验证阶段。

## 9. 上传前命令检查

在仓库根目录运行：

```sh
python3 scripts/pack-minimax.py --validate dist/minimax/voice-prompt-minimax-0.7.1.zip
node scripts/verify-minimax-clean-preflight.mjs
node scripts/make-minimax-submission-bundle.mjs
node scripts/verify-minimax-public-links.mjs
npm test
```

当前期望结果：

- package validation：`localPreflight` 为 `passed`
- automated clean preflight：`status` 为 `passed`
- public link check：20 个公开链接通过，1 个自报告链接跳过
- test suite：51 项通过

## 10. 提交前人工确认

提交按钮点击前，必须人工确认：

- 表单上传的是 0.7.1 ZIP，不是旧包或源码目录
- 作者字段和支持邮箱正确
- 目标区域是 CN，启用端是 MiniMax Code 桌面端
- 所有公开链接无需登录可打开
- 描述没有承诺 hosted cloud polish、自动安装、自动授权或 marketplace 已通过
- 已决定本次是否先不等待物理 clean-machine 测试；如果没有做，应在材料里保持“自动隔离预检已通过，物理新机测试待补”的边界

## 11. 提交后记录模板

表单提交成功后，立刻把以下信息写入 `docs/minimax-submission-record-template.md` 或复制成新的记录文件：

| 字段 | 实际填写 |
| --- | --- |
| Submission ID / official receipt | TODO |
| 提交时间 | TODO |
| 提交账号邮箱 | TODO |
| 作者 / 组织显示名 | TODO |
| 操作类型 | TODO：新增 / 更新 |
| 目标区域 | TODO：CN |
| 启用端 | TODO：MiniMax Code 桌面端 |
| 上传 ZIP | `voice-prompt-minimax-0.7.1.zip` |
| ZIP SHA-256 | `acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072` |
| 审核状态 | TODO |
| Release / MR / 工单链接 | TODO |
| 审核反馈 | TODO |
| 市场是否可见 | TODO |

不要在拿到官方 receipt 前把状态改成 submitted；不要在 MiniMax Code 市场真实可见前宣称已发布。

## 12. 如果审核问到这些问题

**问：为什么插件导入后不能直接录音？**  
答：MiniMax 插件层负责 MCP 与 Skill。全局快捷键、麦克风、波形预览和输入框注入是 macOS 桌面应用能力，需要用户授权。插件会引导安装和检查状态。

**问：是否上传录音？**  
答：首版设计为本地 ASR。AI 润色只发送转写后的文字和可选术语，不因为文字润色上传原始录音。

**问：是否使用 MiniMax Code 用户的订阅额度？**  
答：0.7.1 不读取或提取 MiniMax Code 用户凭据。润色走用户在桌面端配置的服务或后续 Voice Prompt 自有客户令牌服务；发布者共享额度还未纳入本次候选。

**问：是否是远程 MCP Connector？**  
答：不是。本次是本地 MCP + Skill candidate。远程 Streamable HTTP MCP 需要单独适配、HTTPS、鉴权、配额和平台联调后再提交。

**问：如何证明包可用？**  
答：ZIP 本地预检、自动隔离 clean preflight、公开链接检查和源码测试均已通过。物理新机安装、麦克风授权、辅助功能授权和真实输入框填入需要单独记录。
