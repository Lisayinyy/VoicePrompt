# Voice Prompt · MiniMax Code Live Form Field Map

Checked: 2026-09-12  
Form URL: https://vrfi1sk8a0.feishu.cn/share/base/form/shrcnbnpeor3z72fUkeHzrOE7vb  
Status: live form inspected; not submitted

The live Feishu form currently shows seven required fields. This mapping is based on the visible form state, not on older assumptions from draft docs.

## Visible required fields

| # | Live form field | Meaning | Voice Prompt value |
| --- | --- | --- | --- |
| 1 | Plugin 名 / Plugin name | Unique English identifier from `.minimax-plugin/plugin.json` `name`; not display name | `voice-prompt` |
| 2 | 操作类型 / Operation type | New plugin or update existing plugin | `新插件 / New Plugin` unless MiniMax reports an existing CN record |
| 3 | 来源类型 / Source type | ZIP or GitHub | `ZIP` |
| 4 | 目标区域 / Target region | CN, US, or both | `CN` |
| 5 | 启用端 / Delivery target | Desktop, Cloud, or both | `桌面端 / Desktop` |
| 6 | 组织/团队 / Organization or team | Developer, team, or company name | `Lisa Yin` |
| 7 | 联系邮箱（提交者）/ Contact email | Identity matching, status queries, and failure details | TODO: real submitter email |

## Upload field

The form description says ZIP submissions should upload only the ZIP attachment. The upload control was not visible before selecting `ZIP`. After choosing source type `ZIP`, use this file:

```text
dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip
```

SHA-256:

```text
acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072
```

## Fields from earlier preparation that are not visible on the first live form screen

The current visible form does not show separate boxes for long description, examples, permissions, privacy links, public material links, or SHA-256. Keep those materials ready for reviewer follow-up or if the form reveals more fields after selecting `ZIP`.

Use these references if requested:

- Final field-by-field form sheet: `docs/minimax-form-final-fill.md`
- Structured payload: `docs/minimax-form-payload.json`
- Public material index: `docs/minimax-marketplace-public-materials.md`
- Latest preflight evidence: `docs/minimax-submit-preflight-latest.md`

## Submission boundary

This inspection does not prove formal submission. Do not mark the plugin as submitted until the form returns a `submission_id` or equivalent official receipt.
