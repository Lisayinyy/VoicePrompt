# Voice Prompt 内测后端

该服务为桌面应用的 `prompt-ai` provider 提供 `/voice/prepare`，录音和 ASR 仍在用户电脑完成。服务只接收文字，复用保真润色策略，不执行用户口述的任务。

## 部署边界

- Node.js 22+，单实例单进程，用 systemd 启动并自动恢复
- 只监听 `127.0.0.1:8787`，不会以明文 HTTP 将口述文本暴露到公网
- `/healthz` 只代表进程健康；需要客户令牌的 `/readyz` 用于区分模型是否配置，两者都不能替代实际润色验证
- 默认 `VOICE_MODEL_ENABLED=false`，没有有效服务端 API Key 时不会调用模型
- 公网发布前配置自有域名、HTTPS、适用的备案，并确认模型 API 额度及对外服务使用权限
- 当前不是公开用户注册、购买积分或完整计费系统

## 额度与身份验证

`/etc/voice-prompt/clients.json` 存放客户列表，每项包含 `id`、`tokenHash`（独立高熵客户令牌的 SHA-256）、`dailyLimit`，可用 `enabled:false` 停用。原始客户令牌仅交给对应客户，MiniMax Key 只放服务端环境文件。修改配置后重启服务。

默认每客户每天 100 次、每分钟 6 次，最多 2 个并发请求且每客户最多 1 个；全服务每天 1,000 次、每月 10,000 次。每日和月度按中国时区计数。这些是保守内测上限，不是套餐承诺或货币预算。请求在调用上游前计入额度，上游失败也计数，防止重复失败产生无上限支出。

额度文件保存于 `/var/lib/voice-prompt/usage.json`，包含日期和次数，不包含录音、原文、润色结果或密钥。计数在重启后保留；文件损坏时服务拒绝启动，不能静默重置额度。暂不支持多进程或多服务器共享计数。

正式域名配置、执行顺序与验收工具见 [HTTPS 实施手册](HTTPS.md)。

## 安装及验证

将仓库中的 `backend/`、`plugin/lib/worker-voice.mjs`、`plugin/lib/voice-policy.mjs` 放到 `/opt/voice-prompt`，下载官方 Node.js Linux x64 包并核对官方 SHA-256，再以 root 执行 `backend/install.sh`（传入 `NODE_ARCHIVE` 和 `NODE_SHA256`）。环境文件和客户列表在更新时保留。

配置 API Key 前只做无模型的健康、鉴权和未就绪测试。通过 SSH 隧道进行私有测试，随后再配置正式 HTTPS 地址。不要把 `/healthz` 成功描述为润色已上线。

接入 API Key 后先以合成中英文文本验证：去除口头禅、保留数字和否定限制、失败保留原文、未经授权请求被拒绝、额度超限不再调用上游。完成之后才切换桌面端默认服务。

桌面端可配置 `provider: "prompt-ai"`、`baseUrl` 和 `apiKeyFile`。后者是当前用户拥有、权限 `0600` 的绝对路径文本文件，只保存对应客户令牌，不保存服务端 MiniMax Key；这样从 Finder 重启也能认证。不接受符号链接或其他用户可读的文件。未指定文件时仍支持 `apiKeyEnv` 环境变量。

开发者可用 SSH 将本机回环端口转发到服务器 `127.0.0.1:8787`，用于本人私有测试。该路径依赖开发者 SSH 密钥，不是给同事分发的连接方式；正式客户端应使用 HTTPS 和各自的客户令牌。

MiniMax 端点和型号可在环境文件中配置；初始候选为官方 OpenAI 兼容端点与 MiniMax-M3，并关闭思考以减少润色延迟。实际可用性和额度需用被授权的账户实测。[官方接口说明](https://platform.minimaxi.com/docs/api-reference/text-openai-api)
