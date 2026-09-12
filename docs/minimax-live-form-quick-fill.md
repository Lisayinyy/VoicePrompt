# Voice Prompt · MiniMax Live Form Quick Fill

Checked: 2026-09-12  
Form: MiniMax Plugin 提交表单 / Plugin Submission Form  
Status: ready for manual fill; not submitted

Use this page when filling the currently visible Feishu form. It reflects the live form fields inspected on 2026-09-12.

## Required fields visible in the live form

| # | Field | Fill value |
| --- | --- | --- |
| 1 | Plugin 名 / Plugin name | `voice-prompt` |
| 2 | 操作类型 / Operation type | `新插件 / New Plugin` |
| 3 | 来源类型 / Source type | `ZIP` |
| 4 | 目标区域 / Target region | `CN` |
| 5 | 启用端 / Delivery target | `桌面端 / Desktop` |
| 6 | 组织/团队 / Organization or team | `Lisa Yin` |
| 7 | 联系邮箱（提交者） / Contact email | TODO: real submitter email |

## ZIP attachment

After selecting `ZIP`, upload:

```text
dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip
```

Checksum:

```text
acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072
```

## Before clicking submit

Run:

```sh
npm run preflight:minimax-submit
```

Expected output:

```text
status: passed
public links: 19 / 19 passed
clean preflight: passed
test suite: passed
```

## Submit button boundary

Uploading the ZIP and clicking `提交` sends the plugin package and form data to MiniMax / Feishu. Do not click submit until the user confirms the exact contact email and final submission action.
