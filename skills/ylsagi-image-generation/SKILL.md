---
name: ylsagi-image-generation
description: Use when generating or editing raster images through the ylsagi Responses gateway and saving each result as a local image plus same-stem raw prompt text, including Codex attachments or local/URL/file-ID images used as references or edit targets.
---

# Ylsagi Image Generation

这个 skill 默认通过 `https://code.ylsagi.com/codex/responses` 生成图片，并把结果落成本地文件。支持纯文本生图、参考图生成，以及把输入图片作为编辑目标的 prompt-guided 图片编辑。

这个 skill 的执行路径固定是 ylsagi Responses 网关和本目录的 JavaScript 脚本。不要把内置图片工具模式或 Python Image API CLI 当成默认路径。

## Script Location

先约定脚本目录变量，后面的命令都默认复用它：

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/ylsagi-image-generation"
```

在这个仓库里优先使用完整 Bun 路径：

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" --help
```

如果环境只有 Node.js，也可以把命令前缀替换成 `node`。建议 Node.js 版本至少为 `18+`。

## When To Use

- 生成新的 raster 图片：照片、插画、海报、产品图、网站 hero、游戏素材、UI mockup、信息图。
- 使用一张或多张图片作为风格、构图、材质、主体或光线参考。
- 对已有图片做 prompt-guided 编辑，例如换背景、移除物体、改画面风格、合成素材、生成透明背景源图。
- 需要把结果保存成本地图片文件，并保留同名原始 prompt 文本。

## When Not To Use

- 任务更适合确定性的 SVG、HTML/CSS、canvas、图表代码或现有矢量系统。
- 用户要求修改已有 SVG/icon/logo 源文件，而不是生成新的 bitmap。
- 用户只是要写设计文档、实施计划、代码方案或调研材料。

如果用户明确要求 raster 图片，不要用 SVG/HTML/CSS 占位图替代生图。

## Core Workflow

1. 判断任务是否适合 raster 生图。
2. 判断意图：新图生成、参考图生成，还是编辑已有图。
3. 判断输出策略：单张、同 prompt 多版本、多个不同资产，或最多 4 张的并行对比批次。
4. 整理 prompt。复杂任务先读取 `references/prompting.md`；常见模板读取 `references/sample-prompts.md`。
5. 为每张输出先写同 stem `.txt` prompt 文件，内容只保存要提交给接口的原始 prompt 纯文本。
6. 调用 `generate-image-via-responses.mjs`，优先使用 `--prompt-file` 和无扩展名 `--output` stem。
7. 检查结果：主体、风格、构图、文字、参考图角色、编辑 invariants、avoid 约束。
8. 如果结果不合适，保留旧图，修改 prompt 后生成新版本，不覆盖旧文件。

## Output Archive Rules

默认把所有生成结果放在：

```text
output/YYYY/MM/DD/
```

每张图片必须有同目录、同 stem 的 `.txt` prompt 文件：

```text
output/2026/04/25/143000-tea-poster.png
output/2026/04/25/143000-tea-poster.txt
```

`.txt` 只保存原始 prompt 纯文本。不要写 Markdown、JSON、日志、参数摘要或复盘。

命名规则：

- 单张图：`HHMMSS-short-name`
- 同一 prompt 或高度相近 prompt 连续重试：`HHMMSS-short-name-v1`、`-v2`、`-v3`
- 同批对比图：`HHMMSS-short-name-batch1-01`、`batch1-02`
- 一次并行对比最多 4 张

不要覆盖、删除或替换已经生成出的图片。图片文字、版式或内容不准确时，只能改 prompt 后重新生成，并保留旧版本。

如果图片之后要提交，先确认图片格式已命中 Git LFS 规则：

```bash
git check-attr filter -- output/YYYY/MM/DD/<stem>.<ext>
```

结果应为 `filter: lfs`。如果是 `filter: unspecified`，先把该图片格式加入仓库 `.gitattributes`，再暂存图片。

## Default Command

推荐先写 prompt 文件，再用 `--prompt-file` 生成，这样 `.txt` 与实际提交内容一致：

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/2026/04/25/143000-tea-poster.txt \
  --output output/2026/04/25/143000-tea-poster
```

短 prompt 也可以直接用 `--prompt`，但仍然必须另存同 stem `.txt`：

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt "A cinematic tea brand poster with warm morning light, no watermark" \
  --output output/2026/04/25/143500-tea-poster-v1
```

## Reference Images And Edit Targets

追加可重复参数 `--reference`：

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/2026/04/25/144000-product-ad.txt \
  --reference assets/product-shot.png \
  --output output/2026/04/25/144000-product-ad
```

需要多张参考图时，重复传入 `--reference`：

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/2026/04/25/144500-multi-ref-result.txt \
  --reference assets/ref-1.png \
  --reference assets/ref-2.png \
  --reference assets/ref-3.png \
  --output output/2026/04/25/144500-multi-ref-result
```

如果用户把图片直接拖进 Codex 输入框，只要线程上下文里给出了附件图片的本地绝对路径，就把这些路径原样传给 `--reference`。不要要求用户重新上传、转 base64，或先走 Files API。

在 prompt 中明确每张输入图的角色：

```text
Input images: Image 1 is the edit target; Image 2 is the lighting reference.
Constraints: change only the background; keep the product, label text, crop, perspective, and lighting direction unchanged.
```

如果用户只是要求参考风格、构图、材质或情绪，把图片写成 reference image。如果用户要求修改那张图本身，把图片写成 edit target，并反复声明必须保持不变的部分。

## Text In Images

- 图片里的标题、副标题、海报文案、UI 文案等文字，必须由图片生成服务直接生成。
- 如果 prompt 里包含中文文字，必须把中文原文逐字写进 prompt，要求模型按原样保留，不要翻译、不要改写、不要替换成拼音或英文。
- 重要文字使用 `Text (verbatim): "..."`。
- 禁止在生成完成后再用本地脚本、ImageMagick、PIL、Canvas、PPT、PS 动作或任何后处理方式给图片补文字、改文字、覆盖文字。

示例：

```text
Text (verbatim): "春日新品"
Render the exact Chinese text above. Do not translate, rewrite, romanize, replace with pinyin, add extra characters, or omit characters.
```

## Transparent Backgrounds

简单不透明主体可以先生成纯色 chroma-key 背景源图，例如 `#00ff00` 或绿色主体时的 `#ff00ff`。prompt 必须要求背景纯色、无阴影、无渐变、无纹理、无地面、无反射、主体边缘清晰。

本地 alpha 移除只允许作为背景透明化技术处理，不允许用于补字、改字、修正文案、重排画面或覆盖内容。

复杂主体，例如头发、毛发、烟雾、玻璃、液体、半透明材质、强反光物体、软阴影，不要默认承诺透明抠图效果。先向用户说明风险，必要时改 prompt 重新生成或让用户确认替代方案。

## Image Tool Parameters

常用图片参数直接用显式参数传入。常见参数和限制见 `references/image-tool-json.md`。

示例：

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/2026/04/25/145000-robot-gardener.txt \
  --output output/2026/04/25/145000-robot-gardener \
  --size 1536x1024 \
  --quality high
```

`--prompt` 和 `--prompt-file` 二选一，不要同时传。

默认 moderation 策略是 `low`。如果用户明确要回退到 OpenAI 文档里的默认严格度，可以显式传：

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/2026/04/25/145500-poster.txt \
  --output output/2026/04/25/145500-poster \
  --moderation auto
```

支持的常用显式参数：

- `--size <value>`：设置 `image_generation.size`
- `--quality <value>`：设置 `image_generation.quality`
- `--moderation <value>`：设置 `image_generation.moderation`
- `--background <value>`：设置 `image_generation.background`，只在确认当前模型/网关支持时使用

非常规工具字段仍然可以用 `--tool-json` 兜底。显式参数会覆盖 `--tool-json` 里的同名字段：

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/2026/04/25/150000-experimental.txt \
  --output output/2026/04/25/150000-experimental \
  --tool-json '{"partial_images":2}' \
  --size 1536x1024
```

## Defaults

- 固定走 `POST /responses`
- 固定带 `stream: true`
- 外层模型默认 `gpt-5.4-mini`
- 图片工具默认 `{"type":"image_generation","model":"gpt-image-2","moderation":"low"}`
- 支持多张参考图，多个 `--reference` 会按传入顺序转换为多个 `input_image`
- Codex 输入框里附带的图片，如果线程上下文已经暴露为本地绝对路径，也按普通本地参考图处理，直接传给 `--reference`
- 从 SSE 的 `response.output_item.done` 里提取最终图片
- 解码后按文件头自动落成 `.png`、`.jpg`、`.webp` 或 `.gif`

默认不需要手动 `export OPENAI_API_KEY`。脚本会按下面顺序取鉴权：

```text
--api-key -> $CODEX_HOME/auth.json / ~/.codex/auth.json -> OPENAI_API_KEY
```

## Supported Reference Values

`--reference` 支持：

- 本地文件路径：自动转成 data URL 后发送
- Codex 输入框附件暴露出来的本地绝对路径：按普通本地文件路径处理
- `http(s)` URL / `data:` URL：原样透传
- `file-...` / `file_...`：按 OpenAI file ID 发送

## Common Failures

- `401 Unauthorized`：当前 Codex 鉴权无效、过期，或 `auth.json` 里没有可用的 `OPENAI_API_KEY`
- 即使默认使用 `moderation: "low"`，提示词和生成结果仍然会经过内容策略过滤；`low` 只是比 `auto` 更宽松，不是关闭过滤
- `moderation_blocked` / `image_generation_user_error`：表示请求被内容策略拦截；脚本默认只输出网关原始错误，不再额外拼接推断性原因或参考改写。是否以及如何改 prompt，需要由用户明确决定

## Superpowers Boundary

- 这个 skill 的目标是尽快产出图片文件，不是产出设计文档、实施计划或代码方案。
- 如果用户给出的提示词已经足够清晰，直接调用图片生成脚本，跳过所有 `superpowers` 环节。
- 如果提示词还不够清晰，最多只允许借用 `superpowers:brainstorming` 的前置澄清能力，用最少的问题补齐关键信息，例如主体、风格、构图、尺寸、画面文字、参考图。
- 这里的“借用脑暴”只限对话内收集需求，不要进入 `superpowers:brainstorming` 后续要求的 design 展示、设计文档、spec 自检、用户 review、`superpowers:writing-plans`、实施文档或任何代码实现流程。
- 一旦信息已经足够生成图片，就立刻停止脑暴并直接生成图片，不要继续扩展流程。
- 禁止为图片生成任务创建 `docs/superpowers/specs/...` 之类的文档，除非用户明确另行要求写文档。

## Reference Map

- `references/prompting.md`: 复杂 prompt、参考图角色、编辑 invariants、文字、透明背景和结果检查。
- `references/image-tool-json.md`: 显式图片参数、`--tool-json` 兜底、`gpt-image-2` quality、size、moderation 和透明背景限制。
- `references/sample-prompts.md`: 常见任务的 copy/paste prompt 模板。
- `scripts/generate-image-via-responses.mjs`: ylsagi Responses 网关生图脚本。
