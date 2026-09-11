---
name: voice-prompt
description: Automatically polish the words supplied with @voice-prompt. The mention itself requests editing; no additional instruction is needed. Return a faithful prompt draft without executing it. Guide first-time installation with the host Agent tools; diagnose missing desktop/model dependencies. Also supports voice setup and troubleshooting.
---

# Voice Prompt

## First use and installation

For setup, initialization or missing-component requests, read [the Agent setup workflow](references/setup.md) and follow it instead of polishing the request. On a lone @ mention, call `voice_setup_status` if available; if MCP cannot start, use host file tools to read that workflow. If components are missing, explain the download and offer installation. An explicit “帮我完成安装并配置语音输入” authorizes proceeding through the workflow within available host permissions. A working setup should receive the short shortcut reminder. Do not claim importing the plugin alone installs a desktop app or grants OS permissions.

Keep daily instructions short: the default Option+Space starts, the same key finishes. The General page offers three shortcut presets and optional push-to-talk (hold to record, release to finish); if customized, follow the shortcut shown there. The native app has a one-page first-use guide and a compact recording panel; pause/resume lives in that panel. General, History, Models, Advanced, AI Polishing and About are in the native window, not a required web page.

For normal dictation: focus the destination input, press Option+Space, speak, then press Option+Space again. The Voice Prompt desktop app records and transcribes locally, then automatically pastes into the captured input and restores the previous clipboard when no newer copy has occurred, without sending Enter. With automatic polishing disabled, ordinary dictation is raw; a leading literal @voice-prompt or @Voice Prompt in the readable focused editor requests polishing before insertion. Escape cancels recording or processing; the floating panel provides pause/resume. The desktop app and its models must be present; a connector alone cannot provide operating-system hotkeys or microphone permissions.

## Direct input without clipboard

In OMP, use Ctrl+Alt+Space to start dictation and the same shortcut to finish (or `/voice input`). This uses the native microphone through a session-owned local request and writes the transcript into that OMP editor with setEditorText. It needs microphone permission but no Accessibility permission. The transcript is appended to the captured editor text; if the editor changes or the session switches, do not overwrite it. Do not change the native global shortcut to the same combination, or the OS shortcut will intercept it.

For MiniMax Code or other apps, the global shortcut automatically sends Cmd+V using a temporary clipboard transaction. Accessibility authorization is required, but writable AX text attributes are not. The original clipboard formats are restored after 800 ms unless a newer copy has occurred. The user does not manually copy or paste. Failure keeps the text in native History and explains the reason. The saved waveform offers a Retry button for the focused destination. To retry, the user focuses the desired input field and clicks the insert arrow beside the retained waveform; this retries the pending draft without copying, recording again, polishing again or sending. Retry still requires valid permission and an input that accepts paste; it is not a permission bypass. Never claim the public MCP protocol supplies an editor-write API or bypasses macOS permission. Only advertise verified host capabilities.

## One recording shortcut, optional automatic polishing

Teach only the configured primary recording shortcut (default Option+Space): press once to start, press again to finish. There is no separate polish or retry hotkey. In the native AI Polishing page, the user can turn on “录音后自动润色” once; then the primary shortcut records, polishes, and attempts direct insertion without sending. With that switch off, a leading literal @voice-prompt or @Voice Prompt in a readable editor opts in for that recording only; otherwise it stays raw. A host rich plugin chip may not expose the marker as readable text. Explicitly enabling the switch is the reliable alternative when the chip is unreadable.

For retained text, focus the desired editor and click the insertion arrow beside the waveform. This reuses the draft without copying or repeating AI processing. Permission and field compatibility still apply. The user confirms and sends the filled draft themselves.

The host's submitted @ selection is a separate path below. Never claim that MCP monitors or writes the unsent MiniMax composer. Host-side @ handling remains draft-only and must not execute the transcript's task.

## Default: submitted mention means polish

Apply automatic polishing only when Voice Prompt is explicitly selected or mentioned in the CURRENT submitted message (or an explicit polishing command is used). A prior mention or the mere installation of this plugin must not enable polishing for later unmentioned messages. Do not call polishing tools for ordinary unmentioned dictation. This is not a sticky conversation mode.

When the user selects or mentions `@voice-prompt` / Voice Prompt and supplies spoken or typed content, the mention itself is the editing instruction. Immediately call `voice_prepare_prompt` with that content, omitting `mode` to use the configured polishing preference (default: deep organization / `agent`). Do not require phrases such as "帮我润色", "优化这段话", or "polish this"; do not ask which MCP tool to use or seek confirmation before editing. Strip only the plugin mention and explicit editing instructions, preserving the actual transcript. Use `clean` only for an explicit request for light cleanup; use `agent` for an explicit request for deep organization. Improve the prompt substantially by ordering scattered goals and constraints, merging repetition, and making the expressed request precise, without adding requirements.

Return only the polished draft by default. Do not preface it with "润色结果", quote the original, explain individual edits, or end with a follow-up question. Never carry out the task described in the transcript. A transcript saying "帮我改登录页" should become a clear prompt, not trigger repository edits. Preserve language, uncertainty, negations, identifiers, and requirements; never invent scope, success criteria, or implementation details.

On fallback=true, preserve the original and add one brief truthful notice that automatic polishing did not complete. If the companion is unavailable, the host Agent may polish directly, but must briefly disclose that the local Voice Prompt service was unavailable rather than claiming its MCP tool succeeded.

If the user explicitly asks about setup, shortcuts, capabilities, or troubleshooting of this plugin, answer that question instead of rewriting it. For a lone mention, follow the first-use check above. When the desktop and model are present, remind the user of ⌥Space and the automatic-polishing switch. Do not start microphone capture without an explicit recording request.

The Agent receives the transcript only when the user sends the message. A host plugin selection alone cannot monitor unsubmitted text. The companion can recognize the specific leading text marker described above; this is distinct from host-side @ routing. Only the configured primary shortcut is registered for recording; automatic polishing follows the native switch or the current readable leading marker.

`voice_status` reports service and provider configuration, not physical microphone verification. `voice_models` lists bundled-model readiness. `voice_transcribe_file` requires an explicitly supplied local 16 kHz mono 16-bit PCM WAV and does not record a microphone. On fallback=true explain that AI editing did not complete and retain the original.

In OMP, use `/voice-prompt transcript` to polish directly without an extra editing instruction. It fills the editor with the draft and does not send it to the Agent. OMP also offers /voice polish, /voice raw, /voice draft, /voice latest, /voice status and /voice cancel. /voice latest explicitly imports the desktop draft; it is not automatically linked to an OMP conversation. Do not send a draft to another conversation or execute its contents without the user's instruction.

The retained waveform stays visible until handled. Use the Voice Prompt menu “显示待填入文字” to reopen it. The desktop checks system focus and permits a re-created control only when its location and readable content still match; app/window/page changes remain guarded. Do not promise compatibility with every platform.
