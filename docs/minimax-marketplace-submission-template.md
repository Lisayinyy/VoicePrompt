# Voice Prompt MiniMax Code Marketplace Submission Template

Date: 2026-09-12
Status: draft for pre-submission preparation; candidate package rebuilt and locally validated on 2026-09-12

This file is the working template for submitting Voice Prompt to the MiniMax Code plugin marketplace. It is based on the MiniMax Code upload guide and the current Voice Prompt repository state. Do not mark the plugin as submitted until the form returns a real submission record.

## 1. Submission Decision

Recommended first submission route:

| Item | Decision |
| --- | --- |
| Submission type | New plugin, unless MiniMax confirms an existing `voice-prompt` CN record |
| Target area | CN |
| Target client | MiniMax Code desktop |
| Package source | ZIP package from `npm run pack:minimax` |
| Plugin form | Local MCP + Skill candidate |
| Public cloud polish | Not bundled in first candidate until HTTPS, quota, and platform classification are confirmed |

Reasoning: the current working product is a Mac desktop voice input app plus local MCP/Skill integration. It can guide installation, check local readiness, and polish provided text. The future hosted service can be added after public HTTPS and customer-token flow are stable.

## 2. Form Fields

Use these as copy-ready draft values. Confirm the account, email, and contact fields at submission time.

| Field | Draft Value |
| --- | --- |
| Plugin display name | Voice Prompt |
| Plugin machine name | voice-prompt |
| Version | 0.7.1 |
| Category | Productivity |
| Author / organization | Voice Prompt contributors or Lisa Yin, depending on the form requirement |
| Source repository | https://github.com/Lisayinyy/VoicePrompt |
| Package source | `dist/minimax/voice-prompt-minimax-0.7.1.zip` |
| Target region | CN |
| Target client | MiniMax Code desktop |
| Short description | Turn spoken thoughts into clear AI prompt drafts while preserving intent, numbers, and constraints. |
| Chinese description | 将口述整理成清晰的 AI 提问草稿，保留原意、数字和限制；配合桌面应用使用快捷键语音输入、实时预览和发送前润色。 |
| Support contact | TODO: submission email |
| Maintainer proof | TODO: GitHub repository owner / submission account proof |
| Privacy / data policy URL | https://github.com/Lisayinyy/VoicePrompt/blob/main/minimax/data-and-permissions.md |
| Installation guide URL | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md |
| Public material index | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-marketplace-public-materials.md |
| Clean-machine test report | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-clean-machine-test-report.md |
| Frontend/backend integration plan | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/frontend-backend-integration-plan.md |
| Website URL | Pending live deployment; GitHub Pages fallback target is https://lisayinyy.github.io/VoicePrompt/ and Sites target remains https://voice-prompt.lisayyyin.chatgpt.site |

## 3. Example Queries

Keep examples accurate. `@Voice Prompt` can call plugin tools or Skill instructions; it is not the microphone shortcut.

1. 检查 Voice Prompt 是否已准备好语音输入
2. 整理这段口述：嗯，请检查登录页，不要修改数据库，保留版本 2.0
3. 帮我完成 Voice Prompt 首次安装，并开启录音后自动润色

If MiniMax asks for English examples:

1. Check whether Voice Prompt is ready for voice input
2. Refine this spoken request: um, review the login page, do not change the database, keep version 2.0
3. Help me set up Voice Prompt and enable polish after recording

## 3A. Frontend / Backend / Desktop Integration Status

The plugin submission depends on three external pieces that are not proven by ZIP validation alone: public website, hosted polish API, and clean desktop install. Track them in [Frontend, Backend, and MiniMax Marketplace Integration Plan](frontend-backend-integration-plan.md).

Current submission boundary:

- The 0.7.1 ZIP is a local MCP + Skill candidate.
- Full voice capture and input insertion require the macOS desktop app.
- Hosted AI polish requires the HTTPS backend, customer token flow, and real provider validation.
- The public website is required as a stable product, download, privacy, and support reference before marketplace submission.
- Remote MCP/App Connector support is not claimed until a Streamable HTTP MCP endpoint is implemented and accepted by MiniMax.

## 4. Package Checklist

Run from the repository root before submitting a new candidate:

```sh
npm run pack:minimax
python3 scripts/pack-minimax.py --validate dist/minimax/voice-prompt-minimax-0.7.1.zip
```

Required package evidence:

| Evidence | Current Path / Value |
| --- | --- |
| Candidate ZIP | `dist/minimax/voice-prompt-minimax-0.7.1.zip` |
| SHA-256 file | `dist/minimax/voice-prompt-minimax-0.7.1.zip.sha256` |
| Validation report | `dist/minimax/voice-prompt-minimax-0.7.1.validation.json` |
| Current SHA-256 | `acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072` |
| ZIP size | 101,178 bytes |
| Unpacked size | 97,622 bytes |
| Files / entries | 32 files / 32 ZIP entries |
| Local preflight | Passed |
| Marketplace review | Not submitted |
| Manifest source | `minimax/.minimax-plugin/plugin.json` |
| MiniMax guide README | `minimax/README.md` |
| Data and permission statement | `minimax/data-and-permissions.md` |
| Installation statement | `minimax/installation.md` |
| Asset rights statement | `minimax/ASSET-RIGHTS.md` |
| Public material index | `docs/minimax-marketplace-public-materials.md` |
| Clean-machine test report | `docs/minimax-clean-machine-test-report.md` |

Do not submit older connector archives such as `voice-prompt-connector-0.7.0.zip`. Do not submit the raw `minimax/` template directory unless it has been packaged with all runtime dependencies.

Latest local build command:

```sh
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin npm run pack:minimax
```

Local validation only proves the package shape and internal references. It does not prove MiniMax marketplace approval, public listing, clean-machine installation, or hosted cloud polish readiness.

## 5. Product Boundary For Review

Voice Prompt has two layers:

| Layer | What It Does | Marketplace Claim |
| --- | --- | --- |
| Desktop app | Global shortcut, recording, local ASR, live preview, optional AI polish, input-field injection | Required for full voice input experience |
| MiniMax plugin | Checks readiness, guides setup, exposes local MCP tools, refines provided text | Helps MiniMax Code connect to the desktop workflow |

Important wording:

- The plugin does not silently install a desktop app, model, or system permissions during import.
- Microphone and Accessibility permissions are granted by the user in macOS.
- Local ASR runs on the user's Mac when configured.
- Cloud polish sends transcript text to the configured model service.
- The first marketplace candidate does not promise publisher-funded unlimited polish.

## 6. Data And Permission Statement

Draft submission wording:

Voice Prompt records audio only through the companion macOS desktop app after the user starts recording. Local ASR converts audio to text on the user's device. When AI polish is enabled, the transcript text and optional terms are sent to the configured model service for rewriting. Voice Prompt does not automatically send raw audio for cloud polish. The user reviews the final text before sending.

Required macOS permissions:

| Permission | Reason |
| --- | --- |
| Microphone | Capture speech after the shortcut starts recording |
| Accessibility | Fill the final text into the focused input field |
| Network | Download model files and optionally call AI polish services |
| Local disk | Store app files, model files, configuration, and customer token file if used |

## 7. Public HTTPS Preparation

Before claiming public hosted polish, finish these items:

| Item | Required Evidence |
| --- | --- |
| DNS | `api.voiceprompt.work` points to the intended server |
| HTTPS | Valid certificate, host match, no disabled TLS verification |
| Service health | Public `GET /healthz` returns Voice Prompt identity |
| Auth | Unauthorized and wrong-token requests return `401` |
| Ready check | Tokened `GET /readyz` distinguishes model-ready from model-not-configured |
| Polish | Tokened `POST /voice/prepare` preserves numbers, negations, and constraints |
| Quota | Per-user and global limits are enforced |
| Privacy | Public docs explain what text is sent and what is retained |

Current backend is REST for desktop clients. If MiniMax requires a hosted Streamable HTTP MCP App, add a separate MCP adapter instead of presenting `/voice/prepare` as a marketplace MCP endpoint.

## 8. First User Journey To Verify

Before final submission, test on a Mac that does not have the developer's private config:

1. Install or import the Voice Prompt MiniMax plugin.
2. Ask `@Voice Prompt` to complete first-time setup.
3. Download and open the desktop app.
4. Grant Microphone and Accessibility permissions.
5. Download or prepare the local ASR model.
6. Click the MiniMax Code input field.
7. Press the configured shortcut to start recording.
8. Speak a Chinese request and an English request.
9. Stop recording and confirm the polished text appears in the input field.
10. Confirm it does not auto-send without the user's action.

Record the macOS version, MiniMax Code version, Voice Prompt app version, plugin version, ASR model, polish provider, pass/fail result, and failure reason.

## 9. Submission Risks

| Risk | Current Handling |
| --- | --- |
| Local desktop dependency may need platform approval | Ask MiniMax whether local MCP + companion desktop app is accepted |
| Public cloud polish requires auth and quota | Keep first candidate scoped; add hosted polish after HTTPS and token flow are verified |
| Desktop app is not notarized | Disclose beta limitation; do not market as frictionless public install yet |
| User may confuse `@Voice Prompt` with the microphone shortcut | State clearly that `@` calls the plugin and shortcut starts recording |
| Publisher API quota terms may not allow third-party resale | Confirm terms before offering shared paid polish |

## 10. What To Do Next

Immediate next actions:

1. Confirm whether the form should use personal developer name or Voice Prompt contributors.
2. Decide whether the first submission is local MCP + Skill only, or whether to wait for hosted MCP.
3. Complete the public website deployment and replace the pending website URL with a verified live URL.
4. Run one clean-machine installation test and capture evidence.
5. Submit the form only after the selected package and support docs match the actual user journey.
