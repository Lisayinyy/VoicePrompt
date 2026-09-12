# Voice Prompt · MiniMax Code 上架提交日 Runbook

日期：2026-09-12  
状态：提交当天使用；按顺序执行，避免上传错包或误写未验证能力。

## 1. 先确认 5 个无法自动决定的字段

| 字段 | 当前建议 | 提交前实际值 |
| --- | --- | --- |
| 作者 / 组织显示名 | Lisa Yin | TODO |
| 提交邮箱 | 使用登录 MiniMax / 飞书表单的邮箱 | TODO |
| 支持邮箱 | 可先与提交邮箱一致 | TODO |
| 操作类型 | 新增插件 | TODO：新增 / 更新 |
| 是否先提交内测候选版 | 可以先提交，但保持 beta 与 clean-machine 边界 | TODO：是 / 否 |

如果没有查到既有 CN 插件记录，操作类型填“新增插件”。如果 MiniMax 后台已有 `voice-prompt` 记录，改成“更新插件”，并补维护权证明。


## 1A. 如果已经知道邮箱，先写入材料

如果提交邮箱和支持邮箱已经确定，先运行：

```sh
npm run set:minimax-contact -- \
  --submitter-email <提交邮箱> \
  --support-email <支持邮箱> \
  --author "Lisa Yin"
```

如果支持邮箱与提交邮箱一致，可以省略 `--support-email`。这个命令会同步更新最终表单 Markdown、结构化 JSON payload 和人工确认字段。

## 2. 上传文件

上传这个 ZIP：

```text
dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip
```

备用路径：

```text
dist/minimax/voice-prompt-minimax-0.7.1.zip
```

不要上传旧包、源码目录、`minimax/` 模板目录或仓库根目录。

## 3. 表单填写入口

主要照这份执行模板填写：

https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-execution-template.md

需要复制大段中文说明时，用这份：

https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-form-copy-zh.md

如果表单要求更多证明链接，用这份索引：

https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-marketplace-public-materials.md

## 4. 提交前最后命令

在仓库根目录优先运行一键自检：

```sh
npm run preflight:minimax-submit
```

它会依次执行 ZIP 校验、自动隔离 clean preflight、提交材料包生成、公开链接检查和测试套件。需要拆开排查时，再逐条运行：

```sh
python3 scripts/pack-minimax.py --validate dist/minimax/voice-prompt-minimax-0.7.1.zip
node scripts/verify-minimax-clean-preflight.mjs
node scripts/make-minimax-submission-bundle.mjs
node scripts/verify-minimax-public-links.mjs
npm test
```

当前期望：

- ZIP localPreflight passed
- automated clean preflight passed
- public links 14/14 passed，self-report link skipped
- tests 51/51 passed

## 5. 不要写进表单的说法

- 已上架 / 已审核通过
- 已有 submission_id
- 导入插件后会自动安装桌面 App、模型或系统权限
- 0.7.1 已包含发布者共享云端润色额度
- `api.voiceprompt.work` 是已上线的公开 HTTPS polish API
- Voice Prompt 已是 MiniMax 托管的 Streamable HTTP MCP Connector

## 6. 提交后马上记录

提交成功后，优先运行脚本生成正式记录：

```sh
npm run record:minimax-submission -- \
  --submission-id <官方返回的ID> \
  --submitter-email <提交邮箱> \
  --support-email <支持邮箱> \
  --author "Lisa Yin" \
  --operation "new plugin"
```

如果表单返回了记录链接，再加 `--submission-url <链接>`。如果当前 shell 提示找不到 `node`，先用 `/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin npm run record:minimax-submission -- ...`。也可以手动把这些内容写入 `docs/minimax-submission-record-template.md` 或复制成正式记录文件：

- submission_id 或官方 receipt
- 提交时间
- 提交邮箱
- 作者 / 组织显示名
- 操作类型
- 区域和启用端
- 上传文件名与 SHA-256
- 审核状态
- Release / MR / 工单链接
- 审核反馈

不要在 MiniMax Code 市场真实可见前宣称“已发布”。
