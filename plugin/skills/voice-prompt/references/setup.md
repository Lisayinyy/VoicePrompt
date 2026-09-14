# Agent-assisted first use

Use this workflow for “安装” with Voice Prompt selected, “帮我安装/初始化/配置 Voice Prompt”, or an explicit setup request. “第一次用” without an installation request calls for a readiness check and the short installation entrypoint. Setup is not text polishing. A lone @ mention permits a read-only readiness check; it does not authorize a multi-gigabyte installation. If missing, offer installation once. If the user has requested installation, proceed within the host's granted capabilities without repeatedly asking about each dependency.

Read the maintained setup instructions before acting:
https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md

The full procedure is also copied into the setup kit as docs/agent-setup.md. Never infer installation success from plugin import, tool registration, or a file's existence.

## Host tools, not an import hook

Use the host Agent's authorized shell/file tools for downloading and installing, and its available computer-control tools for app settings. Desktop-control permission does not imply shell permission or macOS microphone/Accessibility permission. If a required tool is unavailable, say exactly which step needs the user's help. Do not assume the host is named Copilot or that enabling one permission grants all tools.

Try voice_setup_status when available. Without a working MCP runtime, use the Agent's file/shell tools directly; this guide does not depend on MCP starting first. Check macOS version and Apple Silicon architecture before download. Unsupported machines must receive an accurate explanation rather than running the Mac installer.

## Concrete installation

Download the versioned setup kit from the release linked in docs/agent-setup.md; verify its SHA-256 from the published instructions, extract it outside the immutable plugin directory, inspect scripts/setup-colleague.sh, and run it with --check, then --install for an authorized setup request. Do not use an unversioned “latest” binary, execute an unchecked download, delete quarantine attributes, disable Gatekeeper, edit TCC databases, or request credentials in chat.

The helper downloads a verified desktop ZIP, installs under ~/Applications, preserves configuration/backups, uses a verified temporary uv executable to prepare Python 3.12 + locked dependencies, downloads and verifies the fixed Qwen revision, and selects Qwen. It needs macOS 15+ and several GB of free space. Do not auto-upgrade a working newer installation. If Voice Prompt is running and requires updating, save any pending text and quit it normally before retrying. Do not terminate MiniMax Code or its user's task.

## Finish the experience

Open Voice Prompt. Let the user complete native security, microphone and Accessibility prompts themselves. Use desktop tools to guide the page only when available; never click an approval on behalf of a person when authentication is required. An ad-hoc signed beta can be blocked; stop at the genuine OS requirement rather than claiming installation succeeded.

Check the AI provider without displaying private configuration. Preserve a working configuration. If missing, use a working OMP CLI belonging to this user, or ask which of their existing compatible providers they want to configure. Do not borrow the publisher's account, copy credentials from unrelated apps, invent host model access, or treat API configuration as a successful model request. Where no provider exists, label local dictation ready and AI polishing unavailable. Host Agent rewriting after sending @ is a separate fallback, not automatic pre-insertion polishing.

For the requested “speak → polish → fill” workflow, enable “录音后自动润色”, choose 深度整理, and keep Option+Space as the default unless customized. Do not overwrite shortcut/language preferences that the user chose. Reconnect the MCP after desktop installation if needed. OMP extension installation is optional and only for users who use OMP.

## Verify, then hand back

Check service version, selected Qwen model and language; verify an actual local ASR sample or ask the user for a short recording. Check a nonsensitive polishing example with fallback=false. Then have the user click a real target input and try Option+Space twice. Confirm whether text was actually inserted without sending. MCP status cannot prove microphone, permission or input-box compatibility.

Report these separately: desktop installed; model ready/inference tested; AI polishing tested; microphone confirmed; target input insertion confirmed. Mark anything not exercised as pending user test. Never describe “like the developer's machine” as verified before that end-to-end test.

## Short handback in the user's language

For Chinese users, keep the final setup result to: “桌面应用：…；语音模型：…；AI 润色：…；下一步：点击输入框，按 Option+空格开始，再按一次结束，检查后发送。” Report only observed success; distinguish “待本人授权/待录音测试” from completion. If no AI provider is configured, do not block working local dictation or imply the MiniMax subscription is automatically available. Offer the existing-text @ path as an optional alternative.

If the host has no local shell/file tools (for example a cloud task), explain that this session cannot install onto the user's Mac. Direct them to a local MiniMax Code desktop task with terminal tools and the same “@Voice Prompt 安装” request. Do not download a Mac app onto a remote Linux host and call it installed on the user's computer.

## MiniMax Code: speech recognized but not inserted

Read `voice_setup_status.inputDiagnostics` first. Only `status: recent-desktop-report` describes the currently running desktop process; an absent/stale report is not evidence that permission is granted or denied. Desktop 0.7.1 build 24 or later reports this. The marketplace version and the desktop build are different: older packages may still download desktop build 22.

- `accessibilityGranted: false`: direct the user to macOS Privacy & Security → Accessibility → the currently installed Voice Prompt app. Permission for MiniMax Code, another voice app, or a previous app copy does not prove this process is authorized. After granting, return to Voice Prompt to recheck; if still false, quit and reopen Voice Prompt. Do not reset system permissions or bypass authorization.
- `autoInsert: false`: explain that automatic insertion is disabled and enable it only when the user requests auto-fill.
- `insertionState: blocked`: use `failureReason` to distinguish changed app/window/editor, disabled insertion and other failures. Keep the draft, ask them to focus the intended MiniMax composer and use the insert arrow. Never overwrite an edited composer.
- `unconfirmed` means the paste event was attempted but no readback confirmed it. Ask whether text actually appeared before retrying, to avoid duplicates.
- `confirmed` means the desktop read back the expected text. No Enter is sent.

For an unconfigured AI service, test raw dictation first: missing polishing credentials do not prevent raw input delivery. Do not ask for API keys to fix an insertion problem. This diagnostic contains no transcript or credentials. A different Mac's successful microphone/insertion test cannot be inferred from the publisher's machine.
