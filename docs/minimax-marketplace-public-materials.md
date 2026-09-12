# Voice Prompt Marketplace Public Materials

Date: 2026-09-12
Status: draft public material index for MiniMax Code submission

This page collects the links and statements needed for a MiniMax Code marketplace review. It should be updated whenever the candidate ZIP, website, or public documentation changes.

## Product Summary

Voice Prompt turns spoken thoughts into clear AI prompt drafts. It is designed for desktop agent workflows where users want to press a shortcut, speak naturally, preview the transcript, optionally polish it with AI, and insert the final text into the focused input field for review before sending.

Current candidate scope:

| Area | Status |
| --- | --- |
| macOS desktop voice input | Beta candidate |
| Local ASR | Supported through local Qwen setup on Apple Silicon Mac |
| MiniMax Code plugin | Local MCP + Skill candidate |
| Public hosted cloud polish | Not yet claimed for this candidate |
| Marketplace submission | Not submitted yet |

## Public Links For The Form

Use these links when the latest changes have been pushed to GitHub:

| Purpose | URL |
| --- | --- |
| Source repository | https://github.com/Lisayinyy/VoicePrompt |
| Installation guide | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md |
| Data and permission statement | https://github.com/Lisayinyy/VoicePrompt/blob/main/minimax/data-and-permissions.md |
| MiniMax package README | https://github.com/Lisayinyy/VoicePrompt/blob/main/minimax/README.md |
| Asset rights | https://github.com/Lisayinyy/VoicePrompt/blob/main/minimax/ASSET-RIGHTS.md |
| Release notes | https://github.com/Lisayinyy/VoicePrompt/blob/main/CHANGELOG.md |
| Submission template | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-marketplace-submission-template.md |
| Submission execution template | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-execution-template.md |
| Human confirmation fields | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-human-fields.md |
| Submission-day runbook | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-day-runbook.md |
| Submission packet | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-packet-2026-09-12.md |
| HTTPS plan | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/https-and-mcp-release-plan.md |
| Commercial launch audit | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/commercial-launch-plan-2026-09-12.md |
| Clean-machine test report | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-clean-machine-test-report.md |
| Automated clean preflight report | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-clean-preflight-report.json |
| Frontend/backend integration plan | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/frontend-backend-integration-plan.md |
| Backend public API status | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/backend-public-api-status.md |
| Public link check | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-public-link-check.json |
| Latest submit preflight evidence | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submit-preflight-latest.md |
| Submission record template | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-record-template.md |
| Chinese form copy | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-form-copy-zh.md |
| Final form fill sheet | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-form-final-fill.md |
| Structured form payload | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-form-payload.json |

Link check on 2026-09-12: the repository, submission template, submission execution template, human confirmation fields, submission-day runbook, public material index, clean-machine test report, automated clean preflight report, submission packet, installation guide, data and permission statement, asset rights statement, changelog, frontend/backend integration plan, backend public API status, Chinese form copy, public link check report, and public website returned HTTP 200 after the latest push.

Website URL:

Verified public website: https://lisayinyy.github.io/VoicePrompt/

GitHub Pages publish workflow: latest run for commit `00c602c` completed successfully on 2026-09-12. The page, JavaScript, and CSS assets returned HTTP 200.

Sites status on 2026-09-12: Sites project was created and local build/archive completed, but production deployment through Sites is not live because the Sites source repository rejected Git push with HTTP 400. Use the verified GitHub Pages URL for marketplace materials unless Sites is later repaired.

Candidate ZIP:

Use the platform upload field for local file `dist/minimax/voice-prompt-minimax-0.7.1.zip`. The candidate package has been locally validated and should not be replaced with older connector archives.

## Review Description

Chinese:

Voice Prompt 是一个桌面语音输入与 Prompt 润色工具。用户在 MiniMax Code 或其他输入框中聚焦目标输入框后，使用桌面应用快捷键录音。本地模型将语音转为文字，开启 AI 润色后会把文字整理成更清晰的 Prompt，并填回输入框，由用户确认后发送。MiniMax 插件提供本地 MCP 与 Skill，用于检查安装状态、引导首次安装、整理给定文本，并帮助用户连接桌面工作流。

English:

Voice Prompt is a desktop voice input and prompt refinement tool. A user focuses an input field, records with the desktop shortcut, transcribes speech locally, optionally refines the transcript into a clearer prompt, and reviews the inserted text before sending. The MiniMax plugin provides a local MCP and Skill layer for readiness checks, first-time setup guidance, text refinement, and connection to the desktop workflow.

## Permission Statement

Required user-granted permissions:

| Permission | Why It Is Needed |
| --- | --- |
| Microphone | Capture speech after the user starts recording |
| Accessibility | Insert the final text into the focused input field |
| Network | Download model files and optionally call configured AI polish services |
| Local storage | Store the app, local model files, configuration, and non-secret runtime state |

The plugin import itself does not grant system permissions. macOS permission dialogs and security approval must be completed by the user.

## Data Statement

The desktop app records only after the user starts recording. Local ASR runs on the user's Mac when configured. AI polish sends transcript text, not raw audio, to the configured model provider. The user reviews inserted text before sending. The first candidate package does not include a publisher-funded shared polish account and does not extract MiniMax Code subscription credentials.

## Pricing Statement

Current beta package:

| Item | Statement |
| --- | --- |
| Desktop beta | Free internal beta |
| Local ASR | No per-transcription cloud fee when running locally |
| AI polish | Depends on the user's configured AI service |
| Publisher shared quota | Not included in the current marketplace candidate |

Before offering paid or publisher-funded hosted polish, confirm API terms, quota limits, billing, privacy policy, and user-facing refund/support terms.

## Candidate Evidence

Latest local candidate package:

| Evidence | Value |
| --- | --- |
| Version | 0.7.1 |
| ZIP path | `dist/minimax/voice-prompt-minimax-0.7.1.zip` |
| SHA-256 | `acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072` |
| ZIP size | 101,178 bytes |
| Local preflight | Passed |
| Marketplace review | Not submitted |

Local package validation and automated isolated clean preflight do not replace MiniMax review or a physical clean-machine user journey test.

## Clean-Machine Evidence To Add

Before final submission, complete the linked test report:

https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-clean-machine-test-report.md

| Check | Result |
| --- | --- |
| Fresh Mac install | TODO |
| Microphone permission | TODO |
| Accessibility permission | TODO |
| Chinese voice input | TODO |
| English voice input | TODO |
| AI polish preserves constraints | TODO |
| Text inserted into MiniMax Code input | TODO |
| No automatic send | TODO |
| Failure handling | TODO |
