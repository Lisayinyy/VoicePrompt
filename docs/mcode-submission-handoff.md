# Voice Prompt · Mcode 上架交接说明

日期：2026-09-12  
状态：提交前交接说明；当前尚未提交 MiniMax / Mcode 表单，尚无官方 submission_id。

## 1. 当前结论

Voice Prompt 的 Mcode 插件市场候选包已经准备好。它是 **本地 MCP + Skill + macOS 桌面伴侣应用** 的首版提交材料，不是已经发布的市场版本。

当前可以进入正式填表前阶段，但仍需要提交人提供联系邮箱，并在上传 ZIP 和点击提交前做最后确认。

## 2. 优先打开的文件

正式提交时先看：

```text
docs/mcode-submit-console.md
```

机器可读填表计划：

```text
docs/mcode-form-fill-plan.json
```

最终字段填写稿：

```text
docs/minimax-form-final-fill.md
```

## 3. 当前候选包

上传文件：

```text
dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip
```

校验：

```text
SHA-256: acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072
Version: 0.7.1
Plugin name: voice-prompt
Target region: CN
Delivery target: Desktop
```

## 4. 提交前命令

先看总状态：

```sh
npm run mcode:submit-status
```

生成私有邮箱填表稿：

```sh
npm run prepare:minimax-private-submission -- --submitter-email <提交邮箱>
```

如果支持邮箱不同：

```sh
npm run prepare:minimax-private-submission -- --submitter-email <提交邮箱> --support-email <支持邮箱>
```

跑完整检查：

```sh
npm run preflight:minimax-submit
```

必须看到 `status: passed`。

## 5. 表单填写值

| 字段 | 值 |
| --- | --- |
| Plugin 名 / Plugin name | `voice-prompt` |
| 操作类型 / Operation type | `新插件 / New Plugin` |
| 来源类型 / Source type | `ZIP` |
| 目标区域 / Target region | `CN` |
| 启用端 / Delivery target | `桌面端 / Desktop` |
| 组织/团队 / Organization or team | `Lisa Yin` |
| 联系邮箱 | 从 `.local/minimax-submission/fill-sheet.private.md` 读取 |

## 6. 提交边界

上传 ZIP 和点击提交会把插件包、联系邮箱和表单内容发送给 MiniMax / 飞书。正式点击提交前需要提交人最后确认。

不要在表单里写：

- 已经上架或已发布
- 已经通过 marketplace 审核
- 导入插件后会自动安装桌面 App、模型或 macOS 权限
- 0.7.1 已包含发布者共享云端润色额度
- 当前 REST API 已经是 MiniMax 托管远程 MCP Connector

## 7. 提交后必须记录

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
--submission-url <记录链接>
```

提交后记录只证明表单已经提交，不证明已审核、已发布或市场可见。

## 8. 审核问答材料

审核问问题时优先看：

```text
docs/minimax-review-response-template.md
```

版本疑问看：

```text
docs/minimax-version-boundary.md
```

## 9. 当前仍缺

- 提交邮箱
- 支持邮箱，如果不同于提交邮箱
- 最后上传和提交确认
- 官方 submission_id
- 审核结果和市场可见性验证
