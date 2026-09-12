# Voice Prompt · MiniMax Submit Preflight Latest Evidence

Generated at: 2026-09-12T05:25:13.141182+00:00

## Result

| Field | Value |
| --- | --- |
| Status | passed |
| Git head | `526dda2` |
| Upload ZIP | `dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip` |
| SHA-256 | `acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072` |
| Submission bundle | `dist/submission/voice-prompt-minimax-0.7.1` |
| Public links | 20 / 20 passed; 1 skipped self-report link |
| Clean preflight | passed |
| Final form fill | `docs/minimax-form-final-fill.md` |
| Human fields | `docs/minimax-submission-human-fields.md` |
| Runbook | `docs/minimax-submission-day-runbook.md` |

## Scope Boundary

Automated isolated package preflight only. This is not a physical clean-machine install, microphone permission test, ASR quality test, or MiniMax marketplace review.

This evidence does not prove MiniMax marketplace approval, official submission, publication, physical clean-machine installation, microphone permission, Accessibility permission, ASR quality, or marketplace visibility.

## Submitter Action Still Required

Before formal submission, fill the submitter/support email with:

```sh
npm run set:minimax-contact -- --submitter-email <提交邮箱> --support-email <支持邮箱> --author "Lisa Yin"
```

After formal submission, save the official ID with:

```sh
npm run record:minimax-submission -- --submission-id <ID> --submitter-email <EMAIL> --support-email <EMAIL> --author "Lisa Yin" --operation "new plugin"
```

## Step Results

| Step | Status | Elapsed ms | Command |
| --- | ---: | ---: | --- |
| Package validation | 0 | 238 | `python3 scripts/pack-minimax.py --validate dist/minimax/voice-prompt-minimax-0.7.1.zip` |
| Automated clean preflight | 0 | 401 | `/opt/homebrew/Cellar/node/25.8.0/bin/node scripts/verify-minimax-clean-preflight.mjs` |
| Build submission bundle | 0 | 761 | `/opt/homebrew/Cellar/node/25.8.0/bin/node scripts/make-minimax-submission-bundle.mjs` |
| Public link check | 0 | 12420 | `/opt/homebrew/Cellar/node/25.8.0/bin/node scripts/verify-minimax-public-links.mjs` |
| Test suite | 0 | 2089 | `npm test` |
