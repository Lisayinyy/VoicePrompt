# Voice Prompt · MiniMax Version Boundary

日期：2026-09-12  
状态：提交前版本边界说明；用于解释仓库通用版本、桌面 beta 版本和 MiniMax 投稿包版本的关系。

## 1. 当前提交版本

MiniMax Code 插件市场本次提交版本是：

```text
0.7.1
```

以以下文件为准：

```text
minimax/.minimax-plugin/plugin.json
```

候选 ZIP 内的 `.minimax-plugin/plugin.json` 也必须显示：

```json
"version": "0.7.1"
```

## 2. 为什么仓库里仍有 0.7.0

仓库根 `package.json`、通用 `plugin/` connector、桌面 beta 安装包仍保留 0.7.0 系列版本，这是历史桌面/通用 connector 版本，不是本次 MiniMax 专用投稿包版本。

本次不要把以下文件当作 MiniMax 投稿版本依据：

- `package.json`
- `plugin.json`
- `plugin/package.json`
- `plugin/plugin.json`
- `dist/voice-prompt-connector-0.7.0.zip`
- `dist/voice-prompt-setup-0.7.0.zip`
- `dist/voice-prompt-desktop-0.7.0-macos-arm64.zip`

## 3. 审核回复建议

如果审核问为什么仓库里看到 0.7.0：

```text
Voice Prompt 仓库中保留 0.7.0 桌面 beta 和通用 connector 的历史版本号。本次 MiniMax Code 插件市场投稿使用独立的 MiniMax 专用包，版本为 0.7.1。审核请以 minimax/.minimax-plugin/plugin.json 和上传 ZIP 内的 .minimax-plugin/plugin.json 为准。
```

## 4. 提交前校验

提交前必须确认：

```sh
unzip -p dist/minimax/voice-prompt-minimax-0.7.1.zip .minimax-plugin/plugin.json
```

返回内容里应该包含：

```json
"name": "voice-prompt",
"version": "0.7.1"
```
