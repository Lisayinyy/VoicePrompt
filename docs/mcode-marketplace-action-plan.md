# Voice Prompt · Mcode 插件市场上架执行主控清单

日期：2026-09-12  
状态：提交前执行中；用于把 MiniMax Code / Mcode 插件市场上架流程逐项落地。  
当前证据：最近一次记录的 `npm run preflight:minimax-submit` 已通过；尚未正式提交表单，也没有官方 submission_id。

## 1. 本阶段目标

把 Voice Prompt 作为 MiniMax Code 桌面端可审核的插件候选包提交。首版范围保持清楚：这是 **本地 MCP + Skill + macOS 桌面伴侣应用**，用于让用户在 Mcode 里通过 `@Voice Prompt` 获得安装检查、首次使用引导和文本整理能力；真正的录音、实时预览、AI 润色后填入输入框，由桌面应用完成。

首版提交不把以下能力写成已完成：

- MiniMax 插件市场已经审核通过或已经发布
- 导入插件后自动静默安装桌面 App、模型或 macOS 权限
- 已有 MiniMax 托管的 Streamable HTTP MCP Connector
- 已经面向所有用户开放发布者统一付费的云端润色额度
- 已完成第二台干净 Mac 的真实麦克风、辅助功能和输入框注入测试

## 2. 现在已经完成的准备

| 模块 | 当前状态 | 证据 |
| --- | --- | --- |
| 插件候选包 | 已生成 | `dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip` |
| 提交控制台 | 已整理 | `docs/mcode-submit-console.md` |
| ZIP 校验 | 已通过 | SHA-256 `acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072` |
| 自动隔离预检 | 已通过 | `docs/minimax-clean-preflight-report.json` |
| 公开链接检查 | 已通过 | 20 / 20 passed，1 个自报告链接跳过 |
| 测试套件 | 已通过 | `npm test` 通过 |
| 表单字段映射 | 已整理 | `docs/minimax-live-form-field-map.md` |
| 快速填表页 | 已整理 | `docs/minimax-live-form-quick-fill.md` |
| 最终填写稿 | 已整理 | `docs/minimax-form-final-fill.md` |
| 提交后记录模板 | 已整理 | `docs/minimax-submission-record-template.md` |
| 提交材料审计 | 已通过 | `docs/minimax-submission-readiness-report.json` |
| 审核回复模板 | 已整理 | `docs/minimax-review-response-template.md` |
| 版本边界说明 | 已整理 | `docs/minimax-version-boundary.md` |

## 3. Mcode 表单填写顺序

按你给过的 Mcode 提交流程，当前实操顺序如下：

1. 打开 MiniMax Plugin 提交表单。
2. 选择 `新插件 / New Plugin`。
3. 来源类型选择 `ZIP`。
4. 目标区域选择 `CN`。
5. 启用端选择 `桌面端 / Desktop`。
6. Plugin 名填写 `voice-prompt`。
7. 组织/团队填写 `Lisa Yin`。
8. 联系邮箱填写真实提交邮箱。
9. 上传 `dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip`。
10. 提交前再运行一次 `npm run preflight:minimax-submit`。
11. 确认无误后点击提交。
12. 保存表单返回的 submission_id、记录链接和审核状态。

## 4. 还需要你提供或确认的内容

| 事项 | 为什么需要 | 当前处理 |
| --- | --- | --- |
| 提交邮箱 | 表单必填，也用于审核通知 | 待你确认 |
| 支持邮箱 | 用户或平台反馈入口 | 可以先与提交邮箱一致 |
| 作者显示名 | 表单或市场页可能展示 | 暂定 `Lisa Yin` |
| 是否现在正式提交 | 上传 ZIP 和点击提交会把插件包、联系邮箱和表单内容发送给 MiniMax / 飞书 | 提交前需要你最后确认 |
| 是否把邮箱写进 GitHub 文档 | 邮箱会变成公开信息 | 默认不公开，除非你明确同意 |


## 4A. 私有邮箱填表稿

真实提交邮箱不要默认写进 GitHub 文档。拿到邮箱后，先生成本地私有草稿：

```sh
npm run prepare:minimax-private-submission -- --submitter-email <提交邮箱>
```

如果支持邮箱不同：

```sh
npm run prepare:minimax-private-submission -- --submitter-email <提交邮箱> --support-email <支持邮箱>
```

生成位置：

```text
.local/minimax-submission/form-payload.private.json
.local/minimax-submission/fill-sheet.private.md
```

`.local/` 已加入 `.gitignore`，用于保存真实邮箱和正式填表草稿。公开仓库继续保留 TODO 占位，除非明确决定把邮箱公开。

## 5. 提交前最后检查命令

```sh
npm run preflight:minimax-submit
```

当前通过结果：

```text
status: passed
gitHead: 见 docs/minimax-submit-preflight-latest.md 的最近一次记录
public links: 20 / 20 passed, 1 skipped
clean preflight: passed
upload zip: dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip
sha256: acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072
```

## 6. 正式提交时不要混淆的边界

- `@Voice Prompt` 是插件调用入口，不是录音快捷键。
- 录音、波形、实时预览、输入框注入来自 macOS 桌面应用。
- MCP 插件导入不能绕过 macOS 麦克风和辅助功能授权。
- 当前 ZIP 是 0.7.1 候选包，不是已经上架的市场版本。
- 如果 MiniMax 要求远程 MCP Connector，需要另做 Streamable HTTP MCP 适配，不应把现有 REST `/voice/prepare` 直接称为远程 MCP。

## 7. 提交后记录动作

拿到官方 ID 后运行：

```sh
npm run record:minimax-submission -- \
  --submission-id <官方返回的ID> \
  --submitter-email <提交邮箱> \
  --support-email <支持邮箱> \
  --author "Lisa Yin" \
  --operation "new plugin"
```

如果表单给了记录链接，再加：

```sh
--submission-url <记录链接>
```

然后把生成的记录提交到 GitHub，状态只写“已提交审核”；等 MiniMax 审核通过并且市场真实可见后，才写“已发布”。

## 8. 下一步执行顺序

0. 运行 `npm run mcode:submit-status` 查看当前提交状态。
1. 你给出提交邮箱。
2. 我把邮箱写入本地提交 payload 和最终填写稿；如果你不想公开邮箱，我只保留本地版本，不推到 GitHub。
3. 再跑一次 `npm run preflight:minimax-submit`。
4. 我帮你在表单里填字段并上传 ZIP。
5. 提交前我向你确认一次，因为这是对外发送材料。
6. 提交成功后，我记录 submission_id，并更新提交记录文档。
