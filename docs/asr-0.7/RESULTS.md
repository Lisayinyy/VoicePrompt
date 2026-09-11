# Voice Prompt 0.7.0 本地测试交付

## 已实施并安装

- Qwen3-ASR 1.7B 8-bit，MLX Audio 0.5.3，本机 Apple M2 Pro / 16GB
- 已固定并校验模型 revision 与 SHA-256；录音不上传，未购买云服务器
- 默认选择 Qwen，语言自动；通用页和模型页可以指定中文 / English
- 配置中的词汇表在识别阶段前置，包含 Voice Prompt、MiniMax Code、OMP、MCP、Codex、ChatGPT、Prompt AI
- Qwen 接收完整录音，绕开旧的 25 秒独立分段；应用仍限制单次五分钟
- 应用启动与录音开始时预加载；连续复用，空闲 30 分钟卸载；取消/超时终止识别
- 保留 SenseVoice，模型页可切回；没有静默云端或旧模型回退
- 现有自动润色、快捷键、输入框写入策略保持；用户确认后发送

## 本机核对

- 桌面包、MiniMax 插件、OMP 插件及 lock 均为 0.7.0
- 三处安装的 ASR 代码 SHA-256 与工作区逐文件一致
- 两处 MCP 启动器实际返回 speechModel=qwen3-asr-1.7b、speechEngine=mlx-local
- 新启动的 OMP RPC 会话注册了 voice-prompt 扩展命令，未触发 AI 任务
- GitHub 源码目录 35 项 Node 回归检查通过（包含仓库包装与文档链接检查），Swift 原生编译和 codesign 校验通过
- 升级时保留已有内存草稿，不额外保存个人录音
- 麦克风和辅助功能均已在新版应用内确认“已允许”；重新建立了匹配新版应用的授权记录。真实麦克风到 MiniMax 输入框的日常口述体验留给用户测试

## 实测数据

以下只包含本地语音识别，不包含录音、AI 润色与写入时间。

| 样本 | 耗时 | 说明 |
| --- | --- | --- |
| 第一次冷启动 + 4.2 秒中文 | 28.05 秒 | 初始化明显较慢 |
| 再启动进程 + 4.2 秒中文 | 15.57 秒 | 因此增加了预加载 |
| 独立预加载 | 11.85 秒 | 不录麦克风，使用程序生成的静音准备运行环境 |
| 预加载后 4.2 秒中文 | 0.44 秒 | 同一进程复用 |
| 已安装应用 4.2 秒中文 | 1.19 秒 | 自动语言、当前词汇表；另一次为 3.93 秒，不能承诺每次低于一秒 |
| 已安装应用 15.05 秒英文 | 1.09 秒 | 自动语言、当前词汇表 |
| 60.2 秒英文压力样本 | 4.12 秒 | 由同一段公开音频重复四次，四段均返回；不是自然长口述准确率测试 |
| 1 秒数字静音 | 返回空字符串 | 未生成虚构文字 |

MLX 报告的峰值分配约 3.2–3.7GB，非整个应用的内存总量。

公开中文和英文样本只证明链路可运行，不能证明真实口述准确率已经优于 SenseVoice 或达到 Codex。还需要用户日常自然口述测试。

## 用户测试

1. 在 Voice Prompt → 模型确认 Qwen · 精准测试版
2. 中文可先选择「中文」，英文选择「English」；也可保持自动
3. MiniMax Code 输入框用原快捷键 Option + Space，按一次开始，再按一次结束
4. OMP 专用入口 Ctrl + Alt + Space 使用编辑器接口，不依赖辅助功能写入权限
5. 重点测试名称、数字、否定和一分钟自然口述；历史页可对照识别原文与润色结果
6. 需要对比时切回 SenseVoice · 原版

启动应用后模型需约十余秒预加载；空闲超过 30 分钟后再次录音，可能仍有加载等待。

## 下一阶段

- 0.7.1：用用户错误样本调整词汇和语言策略，必要时加入 0.6B 或 Fun-ASR 的同音频对照
- 0.8：验证质量后再做录音中增量识别，缩短结束后的等待
- 正式分发：稳定签名、公证和模型安装引导。当前 Qwen 环境已在这台 Mac 配好，但并未打进便携 connector ZIP，也未发布新的 GitHub Release

原始报告：benchmark.json、long-and-restart.json、prewarm.json、installed-service.json、installed-warm.json、node-tests.txt。
公开音频来自 Qwen 官方示例：
- https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen3-ASR-Repo/asr_zh.wav
- https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen3-ASR-Repo/asr_en.wav
