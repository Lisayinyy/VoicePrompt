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

Ran from the local development machine and the Tencent Cloud server on 2026-09-12.

Public checks:

```sh
dig +short api.voiceprompt.work A
curl -I -L --max-time 15 'https://api.voiceprompt.work/healthz'
curl -I -L --max-time 15 'http://api.voiceprompt.work/healthz'
node scripts/verify-https.mjs 'https://api.voiceprompt.work'
```

Server checks over SSH as `ubuntu@106.52.92.17` using the existing deployment key:

```sh
systemctl is-active voice-prompt
systemctl is-active voice-prompt-caddy
ss -ltnp
curl -sS --max-time 5 http://127.0.0.1:8787/healthz
sudo /opt/voice-prompt-caddy/caddy validate --config /etc/voice-prompt-caddy/Caddyfile.pending --adapter caddyfile
sudo systemd-analyze verify /etc/systemd/system/voice-prompt-caddy.service
```

Observed result:

| Check | Result |
| --- | --- |
| DNS A record | `api.voiceprompt.work` resolves to `106.52.92.17` |
| HTTPS `/healthz` | Timed out; no verified public HTTPS response |
| HTTP `/healthz` | Empty reply from server |
| `scripts/verify-https.mjs` | Failed with `ECONNRESET` |
| Backend service | `voice-prompt` is active |
| Backend loopback health | `http://127.0.0.1:8787/healthz` returns `{"status":"ok","service":"voice-prompt"}` |
| Caddy service | `voice-prompt-caddy` is inactive |
| Listening ports | SSH 22 and backend loopback 8787 are listening; 80/443 are not listening |
| Pending Caddy config | `/etc/voice-prompt-caddy/Caddyfile.pending` validates successfully |
| Caddy systemd unit | `systemd-analyze verify` passes |

Interpretation: the backend process itself is healthy on the server, and the pending Caddy configuration is valid. The public API is not live because the HTTPS reverse proxy is not installed as the active Caddyfile or started, and ports 80/443 are not listening. Do not use `api.voiceprompt.work` as MiniMax marketplace evidence, do not switch beta desktop clients to this URL, and do not claim hosted cloud polish is live.

## Next Actions

1. Confirm Tencent Cloud ICP/备案/resource requirements for a Guangzhou mainland server before exposing a public API on this domain.
2. Confirm Tencent Cloud security group and Ubuntu firewall allow TCP 80 and 443 without weakening SSH access.
3. Install the validated pending file as `/etc/voice-prompt-caddy/Caddyfile`, preserving a rollback copy if an active file appears.
4. Start `voice-prompt-caddy` and verify Caddy can obtain a public certificate.
5. Confirm the backend still listens only on `127.0.0.1:8787` and that Caddy is the only public entry point.
6. Re-run `node scripts/verify-https.mjs 'https://api.voiceprompt.work'`.
7. Create a limited beta customer token and run the authenticated verification once.
8. Record latency, status, model name, fallback status, and quota behavior without logging private prompt text or secrets.

## Submission Boundary

For the current MiniMax Code submission preparation, use the verified public website:

https://lisayinyy.github.io/VoicePrompt/

Hosted polish remains pending until the target endpoints above pass. The first marketplace package should continue to describe hosted polish as a planned or configurable capability unless the HTTPS API is verified before submission.
