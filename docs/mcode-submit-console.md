# Voice Prompt · Mcode 提交控制台

日期：2026-09-12  
状态：提交前控制台；这是正式填表时优先打开的单页入口。当前尚未提交 MiniMax / Mcode 表单。

## 1. 先确认状态

快速查看当前提交状态：

```sh
npm run mcode:submit-status
```

再跑完整提交前检查：

```sh
npm run preflight:minimax-submit
```

必须看到：

```text
status: passed
public links: 20 / 20 passed
clean preflight: passed
Submission readiness audit: passed
Test suite: passed
```

## 2. 生成私有填表稿

真实邮箱只放本地私有目录，不默认写进 GitHub：

```sh
npm run prepare:minimax-private-submission -- --submitter-email <提交邮箱>
```

如果支持邮箱不同：

```sh
npm run prepare:minimax-private-submission -- --submitter-email <提交邮箱> --support-email <支持邮箱>
```

打开：

```text
.local/minimax-submission/fill-sheet.private.md
```

## 3. 表单字段

| 字段 | 填写 |
| --- | --- |
| Plugin 名 / Plugin name | `voice-prompt` |
| 操作类型 / Operation type | `新插件 / New Plugin` |
| 来源类型 / Source type | `ZIP` |
| 目标区域 / Target region | `CN` |
| 启用端 / Delivery target | `桌面端 / Desktop` |
| 组织/团队 / Organization or team | `Lisa Yin` |
| 联系邮箱 | 使用 `.local/minimax-submission/fill-sheet.private.md` 里的邮箱 |

## 4. 上传文件

上传这个 ZIP：

```text
dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip
```

校验：

```text
SHA-256: acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072
MiniMax package version: 0.7.1
```

## 5. 可复制材料

| 用途 | 文件 |
| --- | --- |
| 机器可读填表计划 | `docs/mcode-form-fill-plan.json` |
| 最终字段填写稿 | `docs/minimax-form-final-fill.md` |
| 现场快速填表 | `docs/minimax-live-form-quick-fill.md` |
| 提交材料主控清单 | `docs/mcode-marketplace-action-plan.md` |
| 版本边界说明 | `docs/minimax-version-boundary.md` |
| 审核回复模板 | `docs/minimax-review-response-template.md` |
| 提交后记录模板 | `docs/minimax-submission-record-template.md` |

## 6. 点击提交前的边界

上传 ZIP 和点击提交会把插件包、联系邮箱和表单内容发送给 MiniMax / 飞书。提交前需要最后确认。

不要在表单或备注里写：

- 已发布或已上架
- 已经通过 marketplace 审核
- 导入插件后会自动安装桌面 App、模型或 macOS 权限
- 0.7.1 已包含发布者共享云端润色额度
- 当前 REST API 已是 MiniMax 托管远程 MCP Connector

## 7. 提交后立刻记录

拿到官方 submission id 后运行：

```sh
npm run record:minimax-submission -- \
  --submission-id <官方返回的ID> \
  --submitter-email <提交邮箱> \
  --support-email <支持邮箱> \
  --author "Lisa Yin" \
  --operation "new plugin"
```

如果有记录链接，再加：

```sh
--submission-url <记录链接>
```

生成的记录只证明“表单已提交”，不证明已审核、已发布或市场可见。
