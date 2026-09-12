# Voice Prompt Frontend, Backend, and MiniMax Marketplace Integration Plan

Date: 2026-09-12
Status: execution plan for MiniMax Code marketplace readiness

This document turns the marketplace goal into an implementation checklist. It separates the public website, desktop app, local MCP plugin, and cloud polish backend so that submission materials do not overclaim what is already live.

## 1. Product Chain To Ship

The intended user path for the first MiniMax Code listing is:

1. User sees Voice Prompt in MiniMax Code marketplace.
2. User imports the Voice Prompt plugin.
3. `@Voice Prompt` explains setup and checks local readiness.
4. User installs the macOS desktop app and grants Microphone and Accessibility permissions.
5. User presses the global shortcut, speaks, and sees local ASR preview.
6. If polish is enabled, the desktop app sends text, not audio, to the Voice Prompt HTTPS backend.
7. The backend authenticates the customer token, applies quota, calls the configured model provider, and returns the polished prompt.
8. The desktop app inserts the final text into MiniMax Code, OMP, ChatGPT, or another focused text field.
9. The user confirms and sends manually.

This means Voice Prompt is not only an MCP package. The marketplace plugin is the agent-facing control and setup layer. The desktop app provides voice capture and insertion. The backend provides hosted AI polish.

## 2. Components And Current State

| Component | Current State | Marketplace Meaning | Next Action |
| --- | --- | --- | --- |
| Public website | React/Vite site is deployed through GitHub Pages; Sites deployment is optional and still blocked | Needed as product home, download, privacy, and support reference | Keep GitHub Pages current for marketplace; repair Sites only if specifically required |
| MiniMax plugin ZIP | `dist/minimax/voice-prompt-minimax-0.7.1.zip` validates locally | Candidate upload package, not marketplace-approved | Keep as current candidate until clean-machine test or code changes require a version bump |
| Local MCP | Stdio tools expose setup/status/models/prompt prep/file transcription | Lets MiniMax Code call `@Voice Prompt`; cannot record microphone by itself | Keep claims precise: `@` checks or refines supplied text; shortcut records through desktop app |
| Desktop app | Required for hotkey, recording, preview, and input injection | Required companion for full voice input | Verify install and permissions on a clean Mac |
| Backend REST API | Node service implements `/healthz`, `/readyz`, `/voice/prepare`; designed for loopback behind HTTPS | Enables hosted AI polish after token setup | Finish domain/TLS, token distribution, and real model validation |
| Remote MCP/App route | Not implemented | Future Connector route if MiniMax requires managed cloud connection | Do not claim remote MCP support until Streamable HTTP MCP exists and is accepted |

## 3. Frontend And Backend Integration Scope

The public website should not directly record audio or call `/voice/prepare` in the first release. It should do three practical jobs:

- explain the product clearly;
- host download, setup, privacy, and data links;
- provide a support path for beta users.

The desktop app should be the client of the backend. This keeps microphone access, ASR, prompt preview, and insertion on the user's Mac, while using the cloud only for text polish.

The backend should expose only the minimal public API:

| Endpoint | Public | Purpose | Validation Required |
| --- | --- | --- | --- |
| `GET /healthz` | Yes | Process health only | Returns service identity, no secrets |
| `GET /readyz` | Authenticated | Confirms token and model readiness | 401 for missing/bad token, 503 if model unavailable |
| `POST /voice/prepare` | Authenticated | Refines already-transcribed text | Preserves numbers, negations, paths, and constraints; returns fallback clearly on failure |

Do not expose local desktop service ports, Node plaintext port `8787`, Caddy admin, raw logs, model keys, customer token files, or transcript storage.

## 4. What Has To Be Done Before Submission

### A. Public references

- Publish the website at a stable HTTPS URL.
- Confirm the download link points to the correct macOS package or a release page.
- Confirm privacy/data pages are public and return HTTP 200.
- Remove MiniMax-only wording from the website so the product also makes sense for OMP, ChatGPT, and other text fields.

### B. Cloud polish

- Enable `api.voiceprompt.work` only after DNS, Caddy, and Tencent Cloud security groups are correct.
- Verify `GET /healthz` over HTTPS from outside the server.
- Create at least one beta customer token that is not the MiniMax model API key.
- Verify `GET /readyz` and one real `POST /voice/prepare` with a synthetic Chinese prompt.
- Record latency, fallback status, model name, and quota behavior without logging the private prompt body.

### C. Desktop app configuration

- Add a first-run setup path for `prompt-ai` hosted polish: base URL plus customer token file.
- Make failure states clear: no token, token invalid, quota exhausted, model unavailable, network offline.
- Keep local ASR usable when cloud polish is disabled.
- Confirm final text is inserted into the focused field and never automatically sent.

### D. MiniMax plugin submission

- Use the current ZIP only if no plugin files changed.
- If setup docs, manifest, or packaged code changes, bump SemVer and rebuild the ZIP.
- Fill the marketplace form from `docs/minimax-marketplace-submission-template.md`.
- Attach or link the public materials index.
- Save the returned submission record, submission email, region, and any release/MR identifier.

### E. Clean-machine proof

- Use a Mac without the developer's existing Voice Prompt config.
- Import the MiniMax plugin.
- Install the desktop app from the public path.
- Grant permissions manually.
- Test one Chinese and one English voice input.
- Test `@Voice Prompt` setup/status behavior.
- Test cloud polish if the hosted backend is ready.
- Fill `docs/minimax-clean-machine-test-report.md` with actual evidence.

## 5. Submission Readiness Gates

| Gate | Required Evidence | Current Status |
| --- | --- | --- |
| Package shape | Local package validation JSON and SHA-256 | Ready for candidate 0.7.1; revalidated 2026-09-12 |
| Public docs | GitHub public links checked | Ready; public website included in link check |
| Product website | HTTPS page opens publicly | Ready via GitHub Pages: https://lisayinyy.github.io/VoicePrompt/; latest publish workflow succeeded; Sites remains optional and blocked by source push HTTP 400 |
| Hosted API | HTTPS `/healthz`, authenticated `/readyz`, real polish | Pending public TLS and token flow |
| Desktop install | Clean-machine macOS install and permission flow | Pending |
| Marketplace form | Submitted form and submission ID | Pending |
| Marketplace visibility | MiniMax Code market can install it from a fresh account | Pending after review |

## 6. Immediate Execution Order

1. Keep the verified GitHub Pages website current; repair Sites only if a Sites URL is required later.
2. Start the HTTPS backend only after domain/备案/resource constraints are acceptable.
3. Generate a beta customer token and test cloud polish through HTTPS.
4. Update the desktop app default setup to point beta users to the hosted API option.
5. Run clean-machine test and fill the report.
6. Rebuild ZIP only if plugin package files changed.
7. Submit to MiniMax Code and save the submission record.

## 7. Wording To Use Publicly

Use this boundary in marketplace and website copy:

> Voice Prompt turns speech into prompt drafts on your Mac. The desktop app records and transcribes locally, then optionally sends text to the Voice Prompt cloud polish service. The MiniMax Code plugin helps agents check setup and refine supplied text, while the final prompt is inserted into the input field for you to review before sending.

Avoid these claims until proven:

- imported plugin silently installs the app or model;
- MiniMax Code automatically shares a user's subscription quota with Voice Prompt;
- Voice Prompt is a remote MCP Connector;
- website voice input works in the browser;
- marketplace approval is complete;
- HTTPS REST backend is the same as MCP protocol support.
