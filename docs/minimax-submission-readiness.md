# Voice Prompt · MiniMax 正式投稿准备清单

核验日期：2026-09-11
状态：已生成 0.7.1 本地 MCP + Skill 投稿候选包，未提交表单、未联系平台、未创建 provider
参考代码：`69a1c57`；本文列出的 ZIP 信息为本次读取本地现有文件的结果

本次遵循用户指定的 [MiniMax Plugin 开发与上架指南](https://vrfi1sk8a0.feishu.cn/wiki/QlTLwbAGNiACwLkWI85cFxHzn4L) 和其引用的 [MiniMax App（MCP Server）接入规范](https://vrfi1sk8a0.feishu.cn/wiki/HPtLwSJnHi2KMWkgUtfcWnk8nDc)，页面均显示 9 月 8 日修改。提交前再次核对页面和实际校验规则。

## 本次实施进展

下文差距表保留旧版 0.7.0 审计基线；包结构、包装版本、原创图标和依赖文档已经通过独立 MiniMax 打包流程修正。当前产物与待填表字段见 [投稿交付说明](minimax-submission.md)。它是用于平台评估的本地 MCP + Skill 候选包，尚未开放发布者共享云端额度；不能用它替代正式域名、身份接入、公证和新设备测试。

新增的隔离测试实际解包 ZIP、使用空 HOME/缺失个人配置启动 MCP，验证 initialize、5 个工具发现、首次安装诊断、无服务时明确失败；另验证无运行时提示，以及拒绝 hooks、路径穿越、重复 JSON key 和缺失运行依赖。全套 55 项测试通过。这些是本地测试，不是 MiniMax 平台校验回执。

## 用户确认的内测边界（2026-09-11）

先满足平台明确要求，不把付费 Apple Developer 会员或公证自行扩大为 MiniMax 投稿硬条件。当前指南未明确要求该会员；Developer ID 是桌面分发签名概念，与个人/公司作为插件作者的身份不是一件事。内测可以披露 ad-hoc 包限制并先做实际安装验证，不能承诺在默认 Gatekeeper 或公司管控环境下畅通安装。正式共享润色仍需 HTTPS、客户鉴权及平台适用分类确认。

## 一、先确定投稿路线

我们的产品仍是桌面语音输入工具：快捷键、录音、本地 Qwen ASR、预览、润色、填回输入框。这里的 **MiniMax App 是平台 Connector 管理的远程 MCP**，与 macOS 桌面 App 不同，两者可以同时存在。

建议首发范围为 **CN / 桌面端 MiniMax Code**；区域与启用端分别在表单选择，不写进 manifest。OMP 继续使用独立兼容产物。当前没有验证云端 MiniMax Agent 的本地录音/输入能力，不应同时勾选云端并宣传相同体验。

| 路线 | 适用情况 | 前置工作 |
| --- | --- | --- |
| Skill + 本地 MCP | 连接已安装桌面服务；不需要 MiniMax 代管用户授权 | 包结构修正、依赖与数据流声明；云端客户鉴权如何归类需平台确认 |
| Skill + App/Connector，可按需再组合本地 MCP | MiniMax 统一管理云端工具连接与凭据 | 提供真正的 HTTPS Streamable HTTP MCP、完成联调、平台确认 provider |

**接入分类是当前第一个待确认项。** 指南要求涉及鉴权或用户身份时先联系 MiniMax 评估；不能将“凭据不在 ZIP 里”视作无需评估。现有 HTTPS REST 后端可以继续准备，但不足以直接满足 App MCP 接入规范。

## 二、已查明的差距

| 检查项 | 现有结果 | 准备动作 |
| --- | --- | --- |
| 投稿入口 | 仓库根与 `plugin/` 均无 `.minimax-plugin/plugin.json` | 新建独立 MiniMax V1 投稿目录；不改 OMP/通用格式的加载约定 |
| ZIP 根层级 | `voice-prompt-connector-0.7.0.zip` 根为 `voice-prompt/`，缺少所需根入口 | 专用打包流程直接以内容为 ZIP 根，不使用当前 `--keepParent` 方式 |
| 本机 manifest | 有 `darkIcon` 与 `hooks: []` | 投稿 manifest 完全删除字段，不能置空或 null |
| MCP 配置 | 本机 V1 使用 `sh` + 相对 `./mcp-launch.sh`，timeout 180000 ms | 保留显式解释器；重新验证发行环境、所有依赖和合理超时 |
| 版本 | 当前标为 `0.7.0`，本机已有后续变化 | 生成正式投稿包时升 SemVer；冻结版本、commit、ZIP SHA-256 |
| 图标 | 本机图标由安装器从 MiniMax 内置素材池复制 | 核实分发授权，或制作我们拥有权利的正式方形图标；不能直接认为内置素材可公开再分发 |
| 云端入口 | 目前是 REST `/voice/prepare`，开发者用 SSH 隧道 | 正式域名/TLS；App 路线还需新增标准 MCP endpoint |
| 客户身份 | 有单独客户令牌验证，领取/轮换/到期流程未完成 | 按平台确认的 Connector 或桌面流程补齐 |
| 安装体验 | 桌面安装包、模型与权限均独立于插件 | 提供可重复的首次使用路径，另一台无开发者配置的 Mac 验证 |
| 发布状态 | 本机安装与 GitHub 更新已发生，不等于已有 Marketplace submission | 提交前核实 CN 是否已有同名插件，决定新插件或更新；更新提供维护权证明 |

本次检查的 connector ZIP：53,722 bytes，69 个 entries，61 个普通文件，解包总大小 100,179 bytes。体积小并不代表包合格；入口和根层级已不满足此指南。未运行平台私有校验器，不宣称已通过其安全检查。

## 三、投稿包的目标形态

拟在独立 staging 或发布子目录准备以下结构，当前不创建虚假 provider 或发布可安装半成品：

```text
voice-prompt/
  .minimax-plugin/
    plugin.json
  icon.png
  README.md
  LICENSE
  voice-prompt.mcp.json       # 采用本地 MCP 时
  mcp-launch.sh
  server.mjs
  lib/
  skills/
    voice-prompt/
      SKILL.md
      references/
        setup.md
```

ZIP 内从 `.minimax-plugin/` 开始，外部 `voice-prompt/` 不进入归档。App 路线待平台确认后才添加对应 `.app.json`，只写 `schemaVersion` 和已确认的 `provider`，不自行编造值。实际文件集合以运行依赖和 Skill 引用的闭包为准，上图不是可直接投递的完整成品。

Manifest 使用 `schemaVersion: 1`；产品机器名保持 `voice-prompt`；展示名 Voice Prompt，分类建议 Productivity；最多 3 条示例；`apps`、`mcpServers`、`skills` 显式列出能力或保留空数组。正式版本号、作者及图标权利在打包时定稿。`deliveryTargets`、`installationPolicy`、`listed` 和排序信息不写入 manifest。

包体按指南约束：ZIP ≤64 MiB，entries ≤2,048，普通文件 ≤1,024，单文件 ≤16 MiB，解包普通文件合计 ≤64 MiB；路径总长 ≤512 bytes、单段 ≤128 bytes、深度 ≤16。路径仅用允许的 ASCII 字符与 `/`；检查大小写冲突、保留名、绝对路径、穿越、反斜杠、链接、特殊文件、LFS 指针与 submodule。JSON 为 UTF-8 无 BOM 的 object，检查重复 key 和引用完整性。源 ZIP 只用未加密 STORE/DEFLATE。

指南禁止安装生命周期脚本（例如 `preinstall/install/postinstall`）、平台二进制或依赖可执行位的文件；允许普通可移植 Skill/MCP 脚本通过明确解释器运行。不能将所有 `.sh` 文件等同于禁止，也不能借可移植脚本承诺导入自动安装。桌面应用和模型另行分发，声明网络、磁盘、权限及受支持系统，并让平台确认首次安装配套方式。

## 四、给 MiniMax 技术接口人的材料草案

以下是待讨论的材料，不含凭据，尚未发送。

> Voice Prompt 是桌面语音输入产品，本地录音和 Qwen ASR，云端仅做文字润色。我们希望首发 CN / MiniMax Code 桌面端，保留快捷键与发送前填入体验。现有本地 MCP 可查询状态、查看模型、处理明确给定的转录文字/文件；云端 REST 润色后端已做开发者私有测试。
>
> 请确认：桌面应用独立持有客户令牌、普通本地 MCP 连接该应用的组合，是否符合普通 MCP 投稿范围；若统一云端鉴权需要 App/Connector，请确认推荐路线及测试接入流程。

需要平台明确的问题：

1. 能否采用无需用户填写凭据的平台托管模式？该模式如何认证平台请求、区分用户并执行配额？不能预设能拿到 MiniMax 用户 ID 或 Token Plan 额度。
2. 若用 Token App，是否接受我们的 Voice Prompt 客户令牌，而非用户 MiniMax Key？哪些 CN 测试/生产环境需要联调？
3. Connector 不会读回已保存凭据：桌面 App 独立直连润色应如何授权，才能避免误导用户以为在 MiniMax 连接一次就自动完成桌面授权？
4. 快捷键属于桌面应用能力：平台是否接受这样的配套应用依赖与首次安装指南？需要哪些下载签名、权限与兼容证明？
5. 确认 MCP 协议版本、会话行为、工具超时和测试 endpoint 要求。provider 以平台最终返回为准。

若首版选择 Token App，提交的配置说明可以是：字段名 `VOICE_PROMPT_TOKEN`，展示名“Voice Prompt 访问令牌”，必填；Header 模板 `Authorization: Bearer ${VOICE_PROMPT_TOKEN}`；静态 HTTPS 领取链接待正式域名确定。这只是给 Connector 管理方的映射说明，不写进 Plugin 的 headers，也不包含真实 Token。测试凭据单独生成、限额、可轮换，经约定安全渠道提供，生产 Key 不进表单或包。

如果产品要求用户完全不手填令牌，可评估标准 OAuth 或平台托管方式；不要为省一步配置而公开无鉴权的付费润色接口。OAuth 需预注册公开客户端或 DCR、PKCE S256、刷新与撤销；这超出现有后端能力，需在选型后排期。

## 五、App 路线的服务验收要求

配套规范要求 HTTPS Streamable HTTP，App 不连接本地 stdio。现有 REST 政策层可复用，但需要新的 MCP 适配层和平台兼容验证。

- endpoint 不重定向；CN/US 按实际目标分别验证 DNS、证书链、SNI、TLS 和可达性
- `initialize`、`tools/list`（含分页兼容）、`tools/call` 与 session 建立/关闭完整；平台可能为发现与每次调用创建新 session
- 工具发现不调用付费模型、不改变数据；连接试验应在平台 10 秒窗口内完成真实 `tools/list`
- 云端工具仅处理已提交的文字及云端服务状态/配额；不暴露开发者本机路径、文件转录、录音或输入框控制能力
- 401/403 表示凭据或权限问题，429 表示限流，5xx 表示暂时故障；业务失败按工具契约用 `isError`，不泄露秘密
- 不兼容工具 schema 变更先协调；API Key 表单/必填/Header 映射变更也需要连接迁移安排
- 提供成功、鉴权失败、限流、故障、断开重连示例；OAuth 路线另测刷新和撤销
- MiniMax 测试接入 → 联调 → 目标区域验证 → 确认稳定 provider → 生产灰度 App → 发布引用它的 Plugin

当前工具输出中 `fallback=true` 表示 AI 未完成，应明确保留原文的结果；新增云端 MCP 适配层需要正确区分原文回退、业务错误和传输错误，不能只把 REST HTTP 200 翻译为润色成功。

## 六、正式投稿材料

| 材料 | 内容 | 状态 |
| --- | --- | --- |
| 基础展示 | Voice Prompt、正式图标、作者、简介、Productivity、不超过 3 条示例 | 文案可起草；图标权利待定 |
| 目标与操作 | CN / 桌面端建议；新插件或更新根据已有记录核实 | 待确认历史记录 |
| 包来源 | 合格 ZIP，或公开 GitHub 根 URL + 固定 commit/tag + Plugin 子目录 | 现有产物不能直接使用 |
| 维护权 | 仓库归属、原投稿账号/记录、更新维护权证明 | 更新时核实 |
| 使用说明 | 安装依赖、模型下载、权限、快捷键、@行为、失败回退 | 已有素材，需统一新路线 |
| 服务说明 | 测试/正式 endpoint、transport、限流、timeout、错误码、请求响应大小、支持联系人 | 正式域名与接入材料待齐 |
| 数据与费用 | 文字上传范围、供应商、保存策略、内测配额、超额行为 | 需按最终服务定稿 |
| 权利声明 | 源码、图标、文案、模型及引用材料的分发权利 | 逐项复核 |
| 测试证据 | 新设备录音→识别→润色→真实填入；MCP/Connector 用例；区域网络 | 尚不能用本机测试替代 |

建议示例保持可验证，不将 @ 描述成录音开关：

1. “检查 Voice Prompt 是否已准备好语音输入”——用于包含本地 MCP 的版本
2. “整理这段口述：嗯，请检查登录页，不要修改数据库，保留版本 2.0”
3. “教我开启录音后自动润色，并把结果填回 MiniMax Code 输入框”

如果最终只上 App 云端能力，替换依赖本地状态工具的示例，不让 Agent 把服务器环境误当成用户电脑。

## 七、分阶段准备与停止条件

1. **现在完成的准备**：读两份指定指南、核对现有源码/ZIP/本机 manifest、修订 HTTPS 方案、形成差距表与平台问题草案。
2. **无需等待路线确认可做**：正式域名/主体资料、HTTPS 与备案核实、原创图标和文案、桌面签名/安装测试、配额与隐私说明草案。
3. **路线确认后再做**：普通 MCP 专用包，或远程 MCP + Connector 联调；用户授权/邀请码流程；新版发布包和对应 Skill。
4. **准备齐全后投稿**：表单选择操作/区域/启用端，提交 ZIP 或 GitHub 固定来源，保存 submission_id、邮箱和原飞书账号对应关系。
5. **核对真正发布结果**：脚本校验 → 平台生成 Release MR → 人工审核 → owner 合入 → Pipeline 分发 → 实际 CN 桌面市场可见性 → 新用户安装测试。

不会因本地检查通过就宣称已收录。指南明确区分“已发布”与当前市场可见性；查询需要原飞书账号、submission_id 和提交邮箱匹配。若已有 CN 插件但首次去 US，需要拆分更新/新插件提交。AI 预审当前未启用，不应把它写成必经等待步骤。

本次未发送技术沟通消息、未填写上传表单、未改动工作中的本机插件。已将无需等待平台确认的包装工作落成候选交付物。正式提交前仍需明确 MiniMax 对鉴权与 App/普通 MCP 分类的意见，而不是把候选包标成已审核产品。
