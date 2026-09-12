# Voice Prompt · MiniMax Code Submission Packet

Date: 2026-09-12
Status: pre-submit packet assembled; formal marketplace form not submitted

This is the single-page packet to use when filling the MiniMax Code plugin marketplace form. It points to the exact local upload artifact and the public links that are safe to share with reviewers.

## 1. Upload Artifact

Use this local ZIP in the MiniMax form upload field:

```text
dist/minimax/voice-prompt-minimax-0.7.1.zip
```

Artifact evidence:

| Field | Value |
| --- | --- |
| Version | 0.7.1 |
| SHA-256 | `acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072` |
| ZIP size | 101,178 bytes |
| Unpacked size | 97,622 bytes |
| Files / ZIP entries | 32 / 32 |
| Local preflight | Passed |
| Automated isolated clean preflight | Passed |
| Marketplace review | Not submitted |

Do not upload these older or incomplete artifacts:

- `dist/voice-prompt-connector-0.7.0.zip`
- `dist/voice-prompt-setup-0.7.0.zip`
- the raw `minimax/` directory
- the raw repository root


## 1A. Local Submission Bundle

Generate a local folder containing the upload ZIP, checksum, validation report, form copy, and review references:

```sh
node scripts/make-minimax-submission-bundle.mjs
```

Current output folder:

```text
dist/submission/voice-prompt-minimax-0.7.1
```

The bundle is ignored by Git because it contains the local upload ZIP. Use it for manual form upload, not as a public source directory.

## 2. Copy-Paste Form Content

Use the Chinese form copy here:

https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-form-copy-zh.md

Core fields:

| Field | Value |
| --- | --- |
| Plugin display name | Voice Prompt |
| Machine name | voice-prompt |
| Category | Productivity / 效率工具 |
| Target region | CN |
| Target client | MiniMax Code desktop |
| Source repository | https://github.com/Lisayinyy/VoicePrompt |
| Public website | https://lisayinyy.github.io/VoicePrompt/ |
| Submission route | Local MCP + Skill candidate |
| Hosted cloud polish | Do not claim for 0.7.1 |

Still to fill manually in the form:

- submitter account email;
- support email;
- author display name: choose `Lisa Yin` or `Voice Prompt contributors`;
- whether MiniMax has an existing CN record for `voice-prompt`; if yes, follow update flow rather than new-plugin flow.

## 3. Public Review Links

| Purpose | URL |
| --- | --- |
| Public website | https://lisayinyy.github.io/VoicePrompt/ |
| Source repository | https://github.com/Lisayinyy/VoicePrompt |
| Public material index | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-marketplace-public-materials.md |
| Submission template | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-marketplace-submission-template.md |
| Chinese form copy | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-form-copy-zh.md |
| Installation guide | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md |
| Data and permissions | https://github.com/Lisayinyy/VoicePrompt/blob/main/minimax/data-and-permissions.md |
| Asset rights | https://github.com/Lisayinyy/VoicePrompt/blob/main/minimax/ASSET-RIGHTS.md |
| Clean-machine report | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-clean-machine-test-report.md |
| Automated clean preflight | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-clean-preflight-report.json |
| Backend public API status | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/backend-public-api-status.md |
| Public link check | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-public-link-check.json |
| Submission record template | https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-submission-record-template.md |

## 4. Claims That Are Safe For This Submission

Safe to claim:

- The ZIP is a MiniMax V1 local MCP + Skill candidate.
- The plugin can guide first-time setup and expose local MCP tools.
- The desktop app is required for global shortcut, microphone recording, preview, and input insertion.
- Local ASR can run on the user's Mac after setup.
- AI polish is configurable, but publisher-funded hosted polish is not part of this 0.7.1 marketplace candidate.
- The user reviews inserted text before sending; Voice Prompt does not auto-submit prompts.

Do not claim yet:

- MiniMax marketplace approval is complete.
- A submission ID exists.
- `api.voiceprompt.work` is a working public HTTPS polish API.
- Voice Prompt is a hosted Streamable HTTP MCP Connector.
- The imported plugin silently installs the desktop app, model, or macOS permissions.
- Clean-machine physical install is complete.
- Desktop app is notarized for frictionless public macOS distribution.

## 5. Verification Commands Before Upload

Run from the repository root immediately before submission:

```sh
python3 scripts/pack-minimax.py --validate dist/minimax/voice-prompt-minimax-0.7.1.zip
node scripts/verify-minimax-clean-preflight.mjs
node scripts/make-minimax-submission-bundle.mjs
node scripts/verify-minimax-public-links.mjs
npm test
```

Expected current results:

- package validation: `localPreflight` is `passed`;
- clean preflight: `status` is `passed`;
- public link check: 11 public links passed;
- test suite: 48 tests passed.

## 6. Final Human Checks

Before clicking submit:

1. Confirm the form is using the ZIP upload route, not a GitHub subdirectory route.
2. Confirm the author and support email are correct.
3. Confirm the form target is CN and MiniMax Code desktop.
4. Confirm all public links open without login.
5. Confirm the form description does not promise hosted cloud polish or automatic install.
6. Save the returned submission ID, submitter email, target region, target client, and any generated Release/MR link after submission.
