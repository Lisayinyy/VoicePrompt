# Voice Prompt 0.7.0 内测指南

[返回首页](../README.md)

## 先确认环境

这次内测重点是本地语音识别效果。Qwen 方案需要 Apple Silicon Mac、macOS 15+；已在 M2 Pro / 16GB 上做本机样本验证，其他机型尚未验证。约 2.46 GB 模型之外还需要 Python/MLX 环境与缓存空间。桌面基础功能和 SenseVoice 仍以 macOS 13+ 为构建目标。

**仓库导入 ≠ 安装桌面语音输入。** 已提供内测桌面包和 Agent 安装工具包，首次可发送 `@Voice Prompt 帮我完成首次安装并开启录音后 AI 润色`，详见 [Agent 安装指南](agent-setup.md)。它仍不是任意同事导入即用的正式产品；以下保留开发者从源码构建方式。已经配置过的测试者可以直接看“开始测试”。Windows、Linux 和 Intel Mac 暂不在本次测试范围内。

## 首次准备（开发者）

1. 克隆仓库，按 [开发文档](development.md#构建独立桌面应用) 准备构建输入并生成 0.7.0 桌面 ZIP。
2. 退出旧版 Voice Prompt，使用 `node scripts/install.mjs --omp` 安装桌面端与 OMP 扩展。MiniMax 本地安装还可添加 `--mcode=/absolute/path/to/minimax-data`；必须先确认真实数据目录。也可启动桌面端后按 [MiniMax 导入步骤](installation.md#minimax-code) 从 Git 导入 connector。
3. 准备 [uv](https://docs.astral.sh/uv/)，在仓库根目录运行：

   ```sh
   uv run --python 3.12 python scripts/setup-local-asr.py
   ```

   脚本安装固定版本的 Python 依赖，下载固定 revision 的 Qwen 模型并检查权重 SHA-256。模型和运行环境位于 `~/.local/share/voice-prompt/`。此步骤需要联网；后续识别在本地离线运行。下载失败时不要选择 Qwen，重新运行准备步骤。

4. 打开 Voice Prompt，按 macOS 提示允许麦克风和辅助功能。应用为开发用 ad-hoc 签名，尚未公证；更新后可能需要重新确认授权。不要关闭系统整体安全保护。
5. 在“模型”选择 **Qwen · 精准测试版**，选择自动、中文或 English。新安装默认仍是 SenseVoice，准备脚本不会擅自切换配置。
6. 按 [AI 配置指南](installation.md#配置-ai-润色) 使用自己的 OMP 登录或模型服务；打开“录音后自动润色”。Qwen 只负责识别，不自带润色模型账号或额度。
7. 重新打开 OMP 会话；MiniMax Code 已经连接旧版 MCP 时，重新连接它，以加载新插件元数据。

只需尝试已有文字润色的开发者可跳过桌面和 Qwen 构建，使用 [纯源码文字服务](installation.md#纯源码文字服务)。这条路径不提供热键录音。

## 开始测试

| 场景 | 操作 | 预期结果 |
| --- | --- | --- |
| MiniMax Code / 普通输入框 | 点中输入框，按 Option + Space 开始，再按一次结束 | 识别；若开启自动润色，整理后尝试填入；不会自动发送 |
| OMP 会话录音 | Ctrl + Alt + Space 开始 / 结束 | 当前编辑区通过 OMP 接口收到原始转录 |
| OMP 润色 | Ctrl + Shift + V | 整理当前编辑区文字 |
| MiniMax 已有文字润色 | @Voice Prompt，附上文字并发送 | Agent 返回整理后的草稿；不是发送前自动监听输入框 |
| 对照旧模型 | 在模型页切回 SenseVoice | 后续录音使用旧识别模型 |
| 取消 | Esc | 取消录音或识别 |

首次加载可能需要十余秒，应用会提前预加载；模型空闲 30 分钟后释放，再次使用可能等待。单次录音最多五分钟。不要把 ASR 耗时当作含 AI 润色的整体完成时间。

## 怎样反馈才方便改进

分别试一段中文、一段英文，以及包含产品名、数字和否定限制的自然口述。对照历史中的识别原文与润色结果，区分“听错”与“改错”。

反馈格式：

```text
macOS / 芯片 / 内存：
平台：MiniMax Code / OMP / 其他
识别模型与语言：
我本来想说：
识别原文：
润色结果：
录音时长 / 停止后等待时间：
是否成功填入：
```

请去掉客户资料、密钥等私密内容。公开样本通过不能证明实际口述准确率；本次主要收集错词、漏句、错误润色和写入兼容问题。

## 公司群分享文案

> Voice Prompt 0.7 内测版更新了，新增 Qwen 本地语音识别，支持中文和英文，也可以开启 AI 润色，把口语整理成更清楚的 Prompt 后填回输入框，由自己确认发送
>
> 支持 MiniMax Code 和 OMP，欢迎 Apple Silicon Mac、macOS 15+ 的同事参与测试，重点想听听识别准确度、等待时间和填入体验的反馈
>
> 首次安装可让 MiniMax Code 的 Agent 按内置指南准备桌面应用和模型，需要允许工具操作并完成系统授权，步骤与代码在这里：https://github.com/Lisayinyy/VoicePrompt
