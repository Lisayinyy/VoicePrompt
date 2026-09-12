# Voice Prompt Backend Public API Status

Date: 2026-09-12
Status: not ready for marketplace evidence

This file records the current public API verification state for the hosted polish backend. It is separate from the public product website. The website can be ready while the API is still unavailable.

## Target Endpoints

| Endpoint | Purpose | Required Before Hosted Polish Claim |
| --- | --- | --- |
| `GET https://api.voiceprompt.work/healthz` | Public process health | HTTP 200 with Voice Prompt service identity |
| `GET https://api.voiceprompt.work/readyz` | Authenticated readiness | 401 without token; 200 or 503 with valid token depending on model config |
| `POST https://api.voiceprompt.work/voice/prepare` | Authenticated prompt polish | One synthetic Chinese prompt returns `fallback=false` before public claim |

## Current Verification

Ran from the local development machine on 2026-09-12:

```sh
curl -I -L --max-time 15 'https://api.voiceprompt.work/healthz'
curl -I -L --max-time 15 'http://api.voiceprompt.work/healthz'
node scripts/verify-https.mjs 'https://api.voiceprompt.work'
```

Observed result:

| Check | Result |
| --- | --- |
| HTTPS `/healthz` | Timed out after 15 seconds |
| HTTP `/healthz` | Empty reply from server |
| `scripts/verify-https.mjs` | Failed with `ECONNRESET` |

Interpretation: `api.voiceprompt.work` is not yet a working public HTTPS API. Do not use it as MiniMax marketplace evidence, do not switch beta desktop clients to this URL, and do not claim hosted cloud polish is live.

## Next Actions

1. Confirm Tencent Cloud security group and server firewall allow TCP 80 and 443.
2. Install the validated Caddyfile as `/etc/voice-prompt-caddy/Caddyfile` only after domain,备案/resource constraints, and rollback path are acceptable.
3. Start `voice-prompt-caddy` and verify Caddy can obtain a public certificate.
4. Confirm the backend still listens only on `127.0.0.1:8787`.
5. Re-run `node scripts/verify-https.mjs 'https://api.voiceprompt.work'`.
6. Create a limited beta customer token and run the authenticated verification once.
7. Record latency, status, model name, fallback status, and quota behavior without logging private prompt text or secrets.

## Submission Boundary

For the current MiniMax Code submission preparation, use the verified public website:

https://lisayinyy.github.io/VoicePrompt/

Hosted polish remains pending until the target endpoints above pass. The first marketplace package should continue to describe hosted polish as a planned or configurable capability unless the HTTPS API is verified before submission.
