# Voice Prompt Clean-Machine Test Report

Date: 2026-09-12
Status: pending execution

This report records the required clean-machine verification before submitting Voice Prompt to the MiniMax Code marketplace. It must be filled using a Mac that does not already have the developer's private Voice Prompt configuration, local service token, OMP account state, or unpublished runtime files.

Do not mark this report as passed until the full journey has been tested on the target machine. Local package validation and the developer's own Mac do not replace this test.

## Test Environment

| Field | Value |
| --- | --- |
| Tester | TODO |
| Device | TODO |
| Chip | Apple Silicon required |
| macOS version | TODO |
| MiniMax Code version | TODO |
| Voice Prompt desktop app version | TODO |
| Voice Prompt plugin version | 0.7.1 candidate |
| ASR model | TODO |
| AI polish provider | TODO |
| Network region | TODO |
| Test date | TODO |

## Package Under Test

| Evidence | Value |
| --- | --- |
| Candidate ZIP | `dist/minimax/voice-prompt-minimax-0.7.1.zip` |
| SHA-256 | `acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072` |
| Source commit | `a14cf42` or later |
| Submission route | Local MCP + Skill candidate |

## Verification Steps

| Step | Expected Result | Actual Result | Evidence / Notes |
| --- | --- | --- | --- |
| Import MiniMax plugin | Plugin appears in MiniMax Code and can be addressed as `@Voice Prompt` | TODO | TODO |
| Ask first-time setup | Agent reads bundled Skill and guides installation without developer private files | TODO | TODO |
| Download desktop package | Package downloads from public release source and checksum is verified | TODO | TODO |
| Install desktop app | App opens on target Mac; any macOS security warning is handled by the user | TODO | TODO |
| Prepare local runtime/model | Qwen local ASR model is available or the failure reason is clear | TODO | TODO |
| Grant Microphone | macOS Microphone permission is enabled for Voice Prompt | TODO | TODO |
| Grant Accessibility | macOS Accessibility permission is enabled and real text insertion can be tested | TODO | TODO |
| Check plugin readiness | `@Voice Prompt` reports status without leaking local secrets | TODO | TODO |
| Chinese voice input | A Chinese spoken request is recognized with acceptable accuracy | TODO | TODO |
| English voice input | An English spoken request is recognized with acceptable accuracy | TODO | TODO |
| AI polish | Filler words are removed while numbers, negations, paths, and constraints are preserved | TODO | TODO |
| Insert into MiniMax Code | Final text appears in the focused MiniMax Code input field | TODO | TODO |
| User confirmation | Text is not automatically sent; user remains in control | TODO | TODO |
| Failure path | Missing permission, offline state, or no AI quota shows a clear recoverable message | TODO | TODO |

## Pass Criteria

All of these must be true before using this report as marketplace evidence:

| Criterion | Status |
| --- | --- |
| Fresh install succeeds without developer-only files | TODO |
| Microphone and Accessibility permissions are completed by the user | TODO |
| At least one Chinese and one English voice input are tested | TODO |
| AI polish does not lose key constraints | TODO |
| Text is inserted into MiniMax Code input and not auto-sent | TODO |
| Failure states are understandable and recoverable | TODO |

## Known Limits To Disclose

- Current desktop package is a beta build and may require macOS security approval.
- Apple Silicon Mac and macOS 15+ are the first supported target.
- The first MiniMax marketplace candidate does not include publisher-funded shared cloud polish.
- AI service fees and data policies depend on the configured provider.
- This report is pending until a clean machine actually runs the full flow.

