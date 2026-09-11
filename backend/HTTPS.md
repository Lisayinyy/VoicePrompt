# 正式域名 HTTPS 实施与验收

日期：2026-09-11。当前交付的是配置、检查工具与本地集成测试；尚未修改公网 DNS、申请公共证书或开放服务器接口。

## 已准备的文件

- `backend/Caddyfile.template`：只允许 GET `/healthz`、POST `/voice/prepare`；后端保持回环监听；限制请求体 64 KiB；强制 Host/SNI 一致；无自动重试和访问日志配置
- `scripts/render-caddy.mjs`：验证域名并生成新配置，拒绝占位域名、IP、URL、通配符和配置注入，不覆盖已有文件
- `scripts/verify-https.mjs`：公网 DNS、证书可信性/有效期、路由和鉴权检查；可选择执行一次带独立客户令牌的真实润色检查
- `scripts/verify-caddy-local.mjs`：真实 Caddy + 本地测试证书 + 真实业务后端 + 合成模型的隔离测试，不调用生产模型

方案依据：[Caddy 自动 HTTPS](https://caddyserver.com/docs/automatic-https)、[反向代理](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)、[请求体限制](https://caddyserver.com/docs/caddyfile/directives/request_body)。Caddy 自动管理证书不等于免除域名控制权、DNS、端口和运营/备案前置条件。

## 实施前输入

1. 实际持有的正式域名、DNS 管理权限、运营主体与广州节点适用的备案/接入状态
2. 核实服务器公网地址、仍有效的资源期限及只监听回环的业务进程
3. 对外共享润色的上游额度许可、每客户鉴权领取/撤销方式
4. 维护者恢复路径：备份当前代理配置和服务配置，保留 SSH 管理连接

这几个输入尚未齐备，因此不把当前测试域名写入真实服务器配置。

## 生成与安装

先将 `VOICE_PROMPT_DOMAIN` 设置为实际持有的 API 主机名，例如自己的 `api` 子域名。变量只包含主机名，不带 scheme、端口或路径。然后在源码目录运行：

```sh
node scripts/render-caddy.mjs "$VOICE_PROMPT_DOMAIN" ./Caddyfile.ready
caddy validate --config ./Caddyfile.ready --adapter caddyfile
```

使用官方稳定版 Caddy，按官方发行信息核验下载包校验值及适用的签名。当前本地验证版本为 v2.11.4；官方该版本 checksums 使用 SHA-512，不应按 SHA-256 对比。

DNS 的 A 记录指向核实后的服务器公网地址；没有验证 IPv6 就不发布 AAAA。放行 TCP 80/443，保持 8787 与 2019 不对公网开放。SSH 来源限制需要避免断掉当前管理会话。

域名及备案条件就绪后，备份现有 `/etc/caddy/Caddyfile`，将已验证的配置安装为该文件，再用官方 systemd 服务启动/重载。不要把 Node 模型 Key、客户 Token 或发布者 SSH Key 放入 Caddyfile。代理把客户 Authorization 传给回环后端验证；模型 Key 仍仅在后端配置中。

配置的 40 秒响应头超时高于当前 30 秒上游调用超时。没有自动重试可能已计费的 POST。HTTP 自动跳转仅用于普通导航，业务客户端必须从一开始使用 HTTPS，不能先把凭据发至 HTTP。

证书数据目录随官方服务持久保存并备份；确认自动续期过程和到期告警。最初不设置 includeSubDomains 或 preload，避免牵连其他未迁移的子域名。定期维护与续期演练需另行安排，当前未建立无人值守监控承诺。

## 公网验收

从服务器外的电脑运行，保持系统 TLS 验证开启：

```sh
node scripts/verify-https.mjs "https://$VOICE_PROMPT_DOMAIN"
```

该模式检查：DNS 存在；证书可信、主机名匹配、至少 14 天有效期；健康服务身份正确；`/readyz` 与未知路径返回 404；无令牌/错误令牌访问润色返回 401。不会调用计费模型。

之后给测试者单独创建限额、可撤销的 **Voice Prompt 客户令牌**，保存为本人拥有的 0600 私有文件，再执行：

```sh
node scripts/verify-https.mjs "https://$VOICE_PROMPT_DOMAIN" --client-token-file "$VOICE_PROMPT_TEST_TOKEN_FILE"
```

该模式会额外调用一次合成中文样本，消耗一次测试额度；验证协议、`fallback=false`、数字 2.0 与数据库限制。不自动重试。结果只打印检查状态、耗时、TLS 和 DNS，不打印原文、回复或令牌。客户令牌不是 MiniMax 模型 Key。不要传入服务端模型密钥文件。

首次失败必须保留失败记录，排查后再独立复测，不能反复运行直到成功后删掉失败记录。公网 HTTP 重定向、安全组、后端端口暴露、续期、重启恢复、内地/香港网络质量和桌面输入均需另行验证；本工具的成功报告不替代这些项目，也不宣称 HTTPS REST 已成为 MCP。

## 本地测试证据

在 2026-09-11 使用官方 Caddy v2.11.4 macOS arm64 发行包，匹配官方 SHA-512 后运行：

```sh
node scripts/verify-caddy-local.mjs /absolute/path/to/verified/caddy
```

实际通过：测试 CA 范围内可信 TLS、不受信任证书被拒、健康路由、隐藏管理路径、缺失/错误令牌拒绝、唯一合法请求调用合成模型、超大请求 413、不允许的方法 404、Host/SNI 不一致 421。

测试只监听临时回环端口，使用临时目录、合成客户和模型，结束后停止进程并删除文件。测试 CA 只传给测试 HTTP 客户端，没有导入系统信任库；测试配置关闭自动公共证书管理，不能作为公共证书或续期证据。

## 回退

重载前失败不触碰现有配置；重载后错误，恢复备份 Caddyfile 并验证/重载，检查旧服务仍然可达。不要通过关闭 TLS 校验、公开 Node 明文端口或给同事分发发布者 SSH 密钥来回退。云端不可用时继续本地转写并保留草稿，明确提示润色没有完成。
