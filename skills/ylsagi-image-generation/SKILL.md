---
name: ylsagi-image-generation
description: Use when generating images and saving the result to a local file through the ylsagi Responses gateway, including cases where Codex attachments should be used as reference images.
---

# Ylsagi Image Generation

这个 skill 默认通过 `https://code.ylsagi.com/codex/responses` 生成图片，并把结果落成本地文件。支持纯文本生图，也支持单张或多张参考图一起输入。

先约定脚本目录变量，后面的命令都默认复用它：

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/ylsagi-image-generation"
```

这个脚本本身可以用 `bun` 或 `node` 执行。下面示例默认写 `bun`；如果你的环境只有 Node.js，也可以把命令前缀等价替换成 `node`。建议 Node.js 版本至少为 `18+`。

## 默认命令

```bash
bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt "A cinematic tea brand poster with warm morning light" \
  --output output/tea-poster
```

等价的 `node` 写法：

```bash
node "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt "A cinematic tea brand poster with warm morning light" \
  --output output/tea-poster
```

长提示词或多段提示词，优先使用 `--prompt-file`，避免 shell quoting 或换行展开导致 `--prompt` 吃值失败：

```bash
bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/my-poster.prompt.txt \
  --output output/my-poster
```

带参考图时，追加可重复参数 `--reference`：

```bash
bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt "Turn this product photo into a clean studio ad with soft reflections" \
  --reference assets/product-shot.png \
  --output output/product-ad
```

需要多张参考图时，重复传入 `--reference` 即可：

```bash
bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt "Blend the materials, silhouette, and lighting cues from all references into one image" \
  --reference assets/ref-1.png \
  --reference assets/ref-2.png \
  --reference assets/ref-3.png \
  --output output/multi-ref-result
```

如果用户把图片直接拖进 Codex 输入框，这些图片也应该直接当参考图处理。只要线程上下文里已经给出了附件图片的本地绝对路径，就把这些路径原样传给 `--reference`，不要要求用户重新上传、转 base64，或先走 Files API：

```bash
bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt "Use the attached images as references and turn them into a premium skincare gift-set poster" \
  --reference /absolute/path/from-codex-attachment-1.png \
  --reference /absolute/path/from-codex-attachment-2.jpg \
  --output output/codex-attachment-poster
```

默认不需要手动 `export OPENAI_API_KEY`。脚本会按下面顺序取鉴权：

`--api-key` -> `$CODEX_HOME/auth.json` / `~/.codex/auth.json` -> `OPENAI_API_KEY`

## 与 superpowers 的边界

- 这个 skill 的目标是尽快产出图片文件，不是产出设计文档、实施计划或代码方案。
- 如果用户给出的提示词已经足够清晰，直接调用图片生成脚本，跳过所有 `superpowers` 环节。
- 如果提示词还不够清晰，最多只允许借用 `superpowers:brainstorming` 的前置澄清能力，用最少的问题补齐关键信息，例如主体、风格、构图、尺寸、画面文字、参考图。
- 这里的“借用脑暴”只限对话内收集需求，不要进入 `superpowers:brainstorming` 后续要求的 design 展示、设计文档、spec 自检、用户 review、`superpowers:writing-plans`、实施文档或任何代码实现流程。
- 一旦信息已经足够生成图片，就立刻停止脑暴并直接生成图片，不要继续扩展流程。
- 禁止为图片生成任务创建 `docs/superpowers/specs/...` 之类的文档，除非用户明确另行要求写文档。

## 默认约定

- 固定走 `POST /responses`
- 固定带 `stream: true`
- 外层模型默认 `gpt-5.4`
- 图片工具默认 `{"type":"image_generation","model":"gpt-image-2","moderation":"low"}`
- 支持多张参考图，多个 `--reference` 会按传入顺序转换为多个 `input_image`
- Codex 输入框里附带的图片，如果线程上下文已经暴露为本地绝对路径，也按普通本地参考图处理，直接传给 `--reference`
- 从 SSE 的 `response.output_item.done` 里提取最终图片
- 解码后按文件头自动落成 `.png` / `.jpg` / `.webp` / `.gif`

## 文字生成约束

- 图片里的标题、副标题、海报文案、UI 文案等文字，必须由图片生成服务直接生成。
- 如果 prompt 里包含中文文字，必须把中文原文逐字写进 prompt，要求模型按原样保留，不要翻译、不要改写、不要替换成拼音或英文。
- 禁止在生成完成后再用本地脚本、ImageMagick、PIL、Canvas、PPT、PS 动作或任何后处理方式给图片补文字、改文字、覆盖文字。
- 如果用户明确要求成品图带字，应该在 prompt 中直接说明具体文案、排版位置、字体气质和“verbatim / exact Chinese text”要求，而不是先出无字图再本地加字。

## 常用参数

需要额外图片参数时，用 `--tool-json`：

```bash
bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt "A flat illustration of a blue robot gardener" \
  --output output/robot-gardener \
  --tool-json '{"size":"1536x1024"}'
```

`--prompt` 和 `--prompt-file` 二选一，不要同时传。

默认 moderation 策略是 `low`。如果用户明确要回退到 OpenAI 文档里的默认严格度，可以显式传：

```bash
bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt "A flat illustration of a blue robot gardener" \
  --output output/robot-gardener \
  --tool-json '{"moderation":"auto"}'
```

参考图参数 `--reference` 明确支持多图，可重复传入；每传一次就会追加一张参考图。支持：

- 本地文件路径：自动转成 data URL 后发送
- Codex 输入框附件暴露出来的本地绝对路径：按普通本地文件路径处理
- `http(s)` URL / `data:` URL：原样透传
- `file-...` / `file_...`：按 OpenAI file ID 发送

## 常见失败

- `401 Unauthorized`：当前 Codex 鉴权无效、过期，或 `auth.json` 里没有可用的 `OPENAI_API_KEY`
- 即使默认使用 `moderation: "low"`，提示词和生成结果仍然会经过内容策略过滤；`low` 只是比 `auto` 更宽松，不是关闭过滤
- `moderation_blocked` / `image_generation_user_error`：表示请求被内容策略拦截；脚本默认只输出网关原始错误，不再额外拼接推断性原因或参考改写。是否以及如何改 prompt，需要由用户明确决定

## 脚本位置

- [generate-image-via-responses.mjs](./scripts/generate-image-via-responses.mjs)
