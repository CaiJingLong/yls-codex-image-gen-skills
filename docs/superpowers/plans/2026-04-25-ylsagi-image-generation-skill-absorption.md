# Ylsagi Image Generation Skill Absorption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Absorb the useful behavior rules from the built-in `imagegen` skill into `ylsagi-image-generation` while keeping ylsagi Responses gateway generation and local archival as the only execution path.

**Architecture:** Keep `SKILL.md` as the short operational workflow and navigation layer. Move prompt guidance, image tool parameters, and reusable prompt templates into `references/` so the skill stays concise and loads details only when needed. Do not copy the built-in `image_gen` default mode or Python Image API CLI; the JavaScript ylsagi Responses script remains the execution surface.

**Tech Stack:** Markdown skill documentation, `agents/openai.yaml`, ylsagi Responses gateway via `skills/ylsagi-image-generation/scripts/generate-image-via-responses.mjs`, Bun test runner at `/Users/cai/.bun/bin/bun`, shell commands prefixed with `rtk`.

---

## File Structure

- Modify: `skills/ylsagi-image-generation/SKILL.md`
  - Responsibility: core usage workflow, ylsagi-specific command examples, output archival rules, prompt-file requirement, reference map, and high-level decision rules.
- Create: `skills/ylsagi-image-generation/references/prompting.md`
  - Responsibility: prompt schema, specificity policy, image-role semantics, text-in-image rules, edit invariants, transparent-background prompting, and result review.
- Create: `skills/ylsagi-image-generation/references/image-tool-json.md`
  - Responsibility: `--tool-json` guidance for `gpt-image-2`, quality choices, size constraints, moderation behavior, and transparent-background limits.
- Create: `skills/ylsagi-image-generation/references/sample-prompts.md`
  - Responsibility: copy/paste prompt recipes for common generation and edit cases.
- Modify: `skills/ylsagi-image-generation/agents/openai.yaml`
  - Responsibility: keep UI metadata aligned with the expanded skill scope.
- Delete if present: `skills/ylsagi-image-generation/.DS_Store`
  - Responsibility: remove unrelated local metadata from the skill directory.
- Do not modify: `skills/ylsagi-image-generation/scripts/generate-image-via-responses.mjs`
  - Rationale: current request is documentation/workflow absorption, not script behavior change.
- Do not modify: `skills/ylsagi-image-generation/scripts/generate-image-via-responses.test.mjs`
  - Rationale: no runtime logic changes are planned; run existing tests as regression coverage.

## Implementation Notes

- This repository has a project rule that generated image archives live under `output/YYYY/MM/DD/` and every image must have a same-stem `.txt` raw prompt file. The updated skill must make that the default workflow.
- Use `/Users/cai/.bun/bin/bun` in command examples and tests for this repository.
- Use `rtk` in shell commands.
- Do not introduce the built-in `image_gen` tool as a default path.
- Do not copy or depend on the built-in `scripts/image_gen.py` CLI.
- Do not introduce local post-processing for fixing in-image text, layout, or content. Transparent-background alpha handling may be documented only as a background-removal workflow and must not be framed as a content-correction workflow.

---

### Task 1: Add Prompting Reference

**Files:**
- Create: `skills/ylsagi-image-generation/references/prompting.md`

- [ ] **Step 1: Verify the prompting reference does not already exist**

Run:

```bash
rtk test ! -f skills/ylsagi-image-generation/references/prompting.md
```

Expected: command exits `0`.

- [ ] **Step 2: Create `references/prompting.md`**

Use this exact patch:

````bash
apply_patch <<'PATCH'
*** Begin Patch
*** Add File: skills/ylsagi-image-generation/references/prompting.md
+# Prompting Guidance
+
+Use this reference when a request needs more than a short one-line prompt: reference images, edits, visible text, transparent-background assets, multiple variants, or careful output constraints.
+
+## Decision Rules
+
+Classify the task before writing the prompt:
+
+- New image: the user asks for a fresh image and provides no image to preserve.
+- Reference generation: the user provides images for style, composition, material, mood, or subject guidance but does not ask to modify those exact images.
+- Edit intent: the user asks to change an existing image, preserve part of it, replace a background, remove or add an object, localize text, or keep identity/composition unchanged.
+
+If the request is for a simple deterministic SVG, icon tweak, diagram, HTML/CSS layout, or canvas graphic, do not use this skill unless the user explicitly wants a raster image.
+
+## Prompt Schema
+
+Use only the lines that help. Keep short requests short.
+
+```text
+Use case: <taxonomy slug>
+Asset type: <where the image will be used>
+Primary request: <the user's main request>
+Input images: <Image 1: role; Image 2: role>
+Scene/backdrop: <environment or visual setting>
+Subject: <main subject>
+Style/medium: <photo, illustration, 3D render, UI mockup, diagram>
+Composition/framing: <crop, camera angle, orientation, spacing>
+Lighting/mood: <lighting and mood>
+Color palette: <palette notes if needed>
+Materials/textures: <surface details if needed>
+Text (verbatim): "<exact text to render>"
+Constraints: <must keep, must include, must avoid>
+Avoid: <negative constraints>
+```
+
+`Input images`, `Use case`, and `Asset type` are prompt scaffolding, not script flags.
+
+## Specificity Policy
+
+If the user prompt is already specific, normalize it into a clear spec without adding new creative requirements.
+
+If the prompt is generic, add only details that materially improve output quality:
+
+- intended use or polish level
+- composition and framing
+- practical layout guidance
+- scene concreteness that supports the user's request
+- material or lighting details when relevant
+
+Do not add:
+
+- extra characters, props, brands, slogans, or story beats that are not implied
+- arbitrary left/right placement unless the output context supports it
+- unrelated palettes, themes, or decorative elements
+
+## Use-Case Slugs
+
+Use these slugs consistently in prompts:
+
+Generate:
+
+- `photorealistic-natural`
+- `product-mockup`
+- `ui-mockup`
+- `infographic-diagram`
+- `ads-marketing`
+- `logo-brand`
+- `illustration-story`
+- `stylized-concept`
+
+Edit or reference-heavy work:
+
+- `precise-object-edit`
+- `background-extraction`
+- `style-transfer`
+- `compositing`
+
+## Input Image Roles
+
+Label every input image by index and role:
+
+```text
+Input images: Image 1 is the edit target; Image 2 is the material reference; Image 3 is the lighting reference.
+```
+
+Reference generation examples:
+
+```text
+Use Image 1 only as a style reference for brush texture and color mood. Do not copy its subject or composition exactly.
+```
+
+```text
+Use Images 1-3 as product material references. Create a new original campaign image rather than a collage.
+```
+
+Edit intent examples:
+
+```text
+Image 1 is the edit target. Change only the background to a clean studio setting. Keep the product shape, label text, camera angle, crop, and lighting direction unchanged.
+```
+
+```text
+Image 1 is the edit target. Remove only the small object on the table. Preserve the table texture, shadows, perspective, and every other visible element.
+```
+
+## Edit Invariants
+
+For edits, repeat invariants in every iteration. Use concrete language:
+
+```text
+Change only <targeted area>.
+Keep <identity/product/body/pose/layout/text/crop/lighting/background> unchanged.
+No extra objects, no extra text, no watermark.
+```
+
+Do not promise pixel-perfect edits. If an edit requires exact masks or deterministic geometry, explain that generated edits are prompt-guided and may need iterations.
+
+## Text In Images
+
+Visible text must be generated by the image service directly.
+
+Use this structure:
+
+```text
+Text (verbatim): "春日新品"
+Render the exact Chinese text above. Do not translate, rewrite, romanize, replace with pinyin, add extra characters, or omit characters.
+Place it as a large clean headline at the top center in bold modern Chinese typography.
+```
+
+For English or mixed text:
+
+```text
+Text (verbatim): "Yours to Create."
+Render the tagline exactly once, with no extra words, no misspellings, and no watermark.
+```
+
+For rare words or brand-like strings, spell out the characters:
+
+```text
+Text (verbatim): "QIRIN"
+Render the letters exactly: Q I R I N.
+```
+
+Never generate a text-free image and then add text locally with Pillow, ImageMagick, Canvas, SVG, screenshots, PowerPoint, or manual compositing.
+
+## Transparent Backgrounds
+
+For simple opaque subjects, prompt for a removable chroma-key background:
+
+```text
+Use case: background-extraction
+Primary request: <subject>
+Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal
+Constraints: background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; keep the subject fully separated with crisp edges and generous padding; do not use #00ff00 anywhere in the subject; no cast shadow, no contact shadow, no reflection, no watermark, and no text unless explicitly requested.
+```
+
+Use `#ff00ff` instead of `#00ff00` when the subject itself is green. Do not treat local alpha extraction as permission to fix content, text, or layout after generation.
+
+Ask before promising transparent-background output for complex subjects such as hair, fur, smoke, glass, liquids, translucent materials, reflective objects, or soft shadows.
+
+## Result Review
+
+After generation, inspect the output visually for:
+
+- subject correctness
+- style and medium
+- composition and intended use
+- visible text accuracy
+- input image roles
+- edit invariants
+- avoid constraints
+
+If the result fails, keep the generated file, revise the prompt with one targeted change, generate a new version, and save it with a new versioned filename.
*** End Patch
PATCH
````

- [ ] **Step 3: Verify required sections exist**

Run:

```bash
rtk rg --no-line-number "^## (Decision Rules|Prompt Schema|Specificity Policy|Use-Case Slugs|Input Image Roles|Edit Invariants|Text In Images|Transparent Backgrounds|Result Review)" skills/ylsagi-image-generation/references/prompting.md
```

Expected output:

```text
## Decision Rules
## Prompt Schema
## Specificity Policy
## Use-Case Slugs
## Input Image Roles
## Edit Invariants
## Text In Images
## Transparent Backgrounds
## Result Review
```

- [ ] **Step 4: Commit the prompting reference**

Run:

```bash
rtk git add skills/ylsagi-image-generation/references/prompting.md
rtk git commit -m "docs: 添加生图提示词参考"
```

Expected: commit succeeds.

---

### Task 2: Add Image Tool JSON Reference

**Files:**
- Create: `skills/ylsagi-image-generation/references/image-tool-json.md`

- [ ] **Step 1: Verify the tool JSON reference does not already exist**

Run:

```bash
rtk test ! -f skills/ylsagi-image-generation/references/image-tool-json.md
```

Expected: command exits `0`.

- [ ] **Step 2: Create `references/image-tool-json.md`**

Use this exact patch:

````bash
apply_patch <<'PATCH'
*** Begin Patch
*** Add File: skills/ylsagi-image-generation/references/image-tool-json.md
+# Image Tool JSON Reference
+
+Use this reference when a request needs explicit image tool parameters through `--tool-json`.
+
+The ylsagi script sends a Responses request with this default image tool configuration:
+
+```json
+{"type":"image_generation","model":"gpt-image-2","moderation":"low"}
+```
+
+`--tool-json` merges extra fields into that image tool object. Pass only fields you intentionally need.
+
+## Common Examples
+
+Landscape image:
+
+```bash
+/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
+  --prompt-file output/2026/04/25/143000-product-hero.txt \
+  --output output/2026/04/25/143000-product-hero \
+  --tool-json '{"size":"1536x1024","quality":"high"}'
+```
+
+Fast square draft:
+
+```bash
+/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
+  --prompt-file output/2026/04/25/143500-icon-draft.txt \
+  --output output/2026/04/25/143500-icon-draft \
+  --tool-json '{"size":"1024x1024","quality":"low"}'
+```
+
+Default moderation:
+
+```bash
+/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
+  --prompt-file output/2026/04/25/144000-poster.txt \
+  --output output/2026/04/25/144000-poster \
+  --tool-json '{"moderation":"auto"}'
+```
+
+## Quality
+
+For `gpt-image-2`, use:
+
+- `low`: quick drafts, thumbnails, early prompt exploration
+- `medium`: normal final images
+- `high`: final assets, product images, identity-sensitive edits, dense text, diagrams, UI mockups
+- `auto`: allow the model/service to choose
+
+Prefer `medium`, `high`, or `auto` when visible text must be legible.
+
+## Size
+
+Popular `gpt-image-2` sizes:
+
+- `1024x1024`: fast square draft
+- `1536x1024`: landscape
+- `1024x1536`: portrait
+- `2048x2048`: large square
+- `2048x1152`: 16:9 landscape
+- `3840x2160`: 4K-style landscape
+- `2160x3840`: 4K-style portrait
+- `auto`: default
+
+`gpt-image-2` custom size constraints:
+
+- maximum edge length must be `<= 3840`
+- both edges must be multiples of `16`
+- long-to-short ratio must be `<= 3:1`
+- total pixels must be between `655360` and `8294400`
+
+Square images are usually fastest.
+
+## Transparent Background Limits
+
+Do not assume `gpt-image-2` supports model-native `background=transparent`. For transparent-background requests, prompt for a flat chroma-key background first and handle alpha extraction only as background removal, never as content correction.
+
+If the user explicitly requires true/native transparency or the subject is complex, explain the limitation before choosing a different model or workflow.
+
+## Moderation
+
+This skill defaults to `moderation: "low"`. That is not policy bypass and does not disable safety filtering. If the user asks for OpenAI's default strictness, pass `{"moderation":"auto"}`.
+
+## Unsupported or Risky Fields
+
+Do not add fields just because they exist in another image workflow. In particular:
+
+- Do not pass `input_fidelity` with `gpt-image-2`.
+- Do not pass a mask field through `--tool-json` unless the script and gateway explicitly support it.
+- Do not retry unsupported parameters by silently switching models unless the user approved that model/workflow change.
*** End Patch
PATCH
````

- [ ] **Step 3: Verify required sections exist**

Run:

```bash
rtk rg --no-line-number "^## (Common Examples|Quality|Size|Transparent Background Limits|Moderation|Unsupported or Risky Fields)" skills/ylsagi-image-generation/references/image-tool-json.md
```

Expected output:

```text
## Common Examples
## Quality
## Size
## Transparent Background Limits
## Moderation
## Unsupported or Risky Fields
```

- [ ] **Step 4: Commit the tool JSON reference**

Run:

```bash
rtk git add skills/ylsagi-image-generation/references/image-tool-json.md
rtk git commit -m "docs: 添加图片工具参数参考"
```

Expected: commit succeeds.

---

### Task 3: Add Sample Prompt Recipes

**Files:**
- Create: `skills/ylsagi-image-generation/references/sample-prompts.md`

- [ ] **Step 1: Verify the sample prompts reference does not already exist**

Run:

```bash
rtk test ! -f skills/ylsagi-image-generation/references/sample-prompts.md
```

Expected: command exits `0`.

- [ ] **Step 2: Create `references/sample-prompts.md`**

Use this exact patch:

````bash
apply_patch <<'PATCH'
*** Begin Patch
*** Add File: skills/ylsagi-image-generation/references/sample-prompts.md
+# Sample Prompts
+
+Use these as copy/paste starting points. Keep user-provided requirements and remove lines that are not relevant.
+
+## Product Mockup
+
+```text
+Use case: product-mockup
+Asset type: landing page hero image
+Primary request: premium product photo of a matte ceramic coffee mug
+Scene/backdrop: clean warm-gray studio surface
+Subject: single mug with a clear silhouette and subtle reflection
+Style/medium: photorealistic product photography
+Composition/framing: 16:9 landscape, centered product, generous negative space
+Lighting/mood: softbox lighting, controlled highlights, refined but natural
+Materials/textures: matte ceramic, subtle surface grain
+Constraints: no logo, no text, no watermark
+```
+
+## UI Mockup
+
+```text
+Use case: ui-mockup
+Asset type: mobile app screen mockup
+Primary request: mobile home screen for a local farmers market app showing vendors and daily specials
+Style/medium: realistic product UI mockup, not concept art
+Composition/framing: vertical mobile screen, clear hierarchy, practical spacing
+Constraints: readable interface, clean typography, no unrelated logos, no watermark
+```
+
+## Infographic Diagram
+
+```text
+Use case: infographic-diagram
+Asset type: educational poster
+Primary request: simple infographic showing an automatic coffee machine flow
+Scene/backdrop: clean light background
+Subject: bean hopper -> grinder -> brew group -> boiler -> water tank -> drip tray
+Style/medium: clean vector-like infographic with callouts and arrows
+Composition/framing: vertical poster layout, top-to-bottom flow
+Text (verbatim): "Bean Hopper", "Grinder", "Brew Group", "Boiler", "Water Tank", "Drip Tray"
+Constraints: readable labels, strong contrast, no extra labels, no logo, no watermark
+```
+
+## Chinese Text Poster
+
+```text
+Use case: ads-marketing
+Asset type: square social poster
+Primary request: spring tea launch poster with fresh green tea leaves and soft morning light
+Style/medium: polished commercial poster
+Composition/framing: square layout, headline at top center, product scene below
+Text (verbatim): "春日新品"
+Constraints: render the exact Chinese text as written; do not translate, rewrite, romanize, replace with pinyin, add extra characters, or omit characters; no other text; no watermark
+```
+
+## Reference Image Generation
+
+```text
+Use case: style-transfer
+Asset type: original campaign image
+Primary request: create a new skincare gift-set poster using the attached images as visual references
+Input images: Image 1 is the product shape reference; Image 2 is the lighting and color mood reference
+Style/medium: premium product advertising photography
+Composition/framing: original composition, clean centered gift set, generous padding
+Lighting/mood: soft studio highlights inspired by Image 2
+Constraints: use the references for guidance only; do not make a collage; no unrelated logos; no watermark
+```
+
+## Precise Object Edit
+
+```text
+Use case: precise-object-edit
+Asset type: product photo edit
+Primary request: remove the small sticker from the lower right corner of the package
+Input images: Image 1 is the edit target
+Constraints: change only the sticker area; keep the product shape, label text, packaging texture, lighting, crop, perspective, and background unchanged; no extra text; no watermark
+```
+
+## Background Extraction
+
+```text
+Use case: background-extraction
+Asset type: transparent-background source image
+Primary request: clean cutout source image of a red hiking backpack
+Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal
+Subject: red hiking backpack, fully visible
+Style/medium: clean product photography
+Composition/framing: centered with generous padding on all sides
+Constraints: background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; do not use #00ff00 anywhere in the backpack; no cast shadow, no contact shadow, no reflection, no text, no watermark
+```
*** End Patch
PATCH
````

- [ ] **Step 3: Verify required recipes exist**

Run:

```bash
rtk rg --no-line-number "^## (Product Mockup|UI Mockup|Infographic Diagram|Chinese Text Poster|Reference Image Generation|Precise Object Edit|Background Extraction)" skills/ylsagi-image-generation/references/sample-prompts.md
```

Expected output:

```text
## Product Mockup
## UI Mockup
## Infographic Diagram
## Chinese Text Poster
## Reference Image Generation
## Precise Object Edit
## Background Extraction
```

- [ ] **Step 4: Commit the sample prompts**

Run:

```bash
rtk git add skills/ylsagi-image-generation/references/sample-prompts.md
rtk git commit -m "docs: 添加常用生图提示词模板"
```

Expected: commit succeeds.

---

### Task 4: Rewrite Core Skill Workflow

**Files:**
- Modify: `skills/ylsagi-image-generation/SKILL.md`

- [ ] **Step 1: Verify the current skill lacks the new reference map**

Run:

```bash
rtk rg -n "references/(prompting|image-tool-json|sample-prompts).md" skills/ylsagi-image-generation/SKILL.md
```

Expected: command exits non-zero with no matches.

- [ ] **Step 2: Replace `SKILL.md` with the updated workflow**

Replace the entire file with this exact content:

````markdown
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

## Tool JSON

需要额外图片参数时，用 `--tool-json`。常见参数和限制见 `references/image-tool-json.md`。

示例：

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/2026/04/25/145000-robot-gardener.txt \
  --output output/2026/04/25/145000-robot-gardener \
  --tool-json '{"size":"1536x1024","quality":"high"}'
```

`--prompt` 和 `--prompt-file` 二选一，不要同时传。

默认 moderation 策略是 `low`。如果用户明确要回退到 OpenAI 文档里的默认严格度，可以显式传：

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/2026/04/25/145500-poster.txt \
  --output output/2026/04/25/145500-poster \
  --tool-json '{"moderation":"auto"}'
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
- `references/image-tool-json.md`: `--tool-json`、`gpt-image-2` quality、size、moderation 和透明背景限制。
- `references/sample-prompts.md`: 常见任务的 copy/paste prompt 模板。
- `scripts/generate-image-via-responses.mjs`: ylsagi Responses 网关生图脚本。
````

- [ ] **Step 3: Verify core sections exist**

Run:

```bash
rtk rg --no-line-number "^## (When To Use|When Not To Use|Core Workflow|Output Archive Rules|Reference Images And Edit Targets|Text In Images|Transparent Backgrounds|Tool JSON|Reference Map)" skills/ylsagi-image-generation/SKILL.md
```

Expected output includes these headings:

```text
## When To Use
## When Not To Use
## Core Workflow
## Output Archive Rules
## Reference Images And Edit Targets
## Text In Images
## Transparent Backgrounds
## Tool JSON
## Reference Map
```

- [ ] **Step 4: Verify the skill still points at the ylsagi script**

Run:

```bash
rtk rg -n "generate-image-via-responses.mjs|https://code.ylsagi.com/codex/responses|gpt-5.4-mini|gpt-image-2" skills/ylsagi-image-generation/SKILL.md
```

Expected: matches for all four strings.

- [ ] **Step 5: Commit the core skill rewrite**

Run:

```bash
rtk git add skills/ylsagi-image-generation/SKILL.md
rtk git commit -m "docs: 更新 ylsagi 生图 skill 工作流"
```

Expected: commit succeeds.

---

### Task 5: Update Agent Metadata And Clean Local Metadata

**Files:**
- Modify: `skills/ylsagi-image-generation/agents/openai.yaml`
- Delete if present: `skills/ylsagi-image-generation/.DS_Store`

- [ ] **Step 1: Replace `agents/openai.yaml`**

Use this exact patch:

```bash
apply_patch <<'PATCH'
*** Begin Patch
*** Delete File: skills/ylsagi-image-generation/agents/openai.yaml
*** Add File: skills/ylsagi-image-generation/agents/openai.yaml
+interface:
+  display_name: "Ylsagi Image Generation"
+  short_description: "通过 ylsagi Responses 网关生成、参考图生成和编辑图片，并按项目规则落盘"
+  default_prompt: "Use $ylsagi-image-generation to generate or edit raster images through the ylsagi Responses gateway, use attachments as references when provided, and save each output with its prompt file."
+
+policy:
+  allow_implicit_invocation: true
*** End Patch
PATCH
```

- [ ] **Step 2: Remove `.DS_Store` if present**

Run:

```bash
rtk rm -f skills/ylsagi-image-generation/.DS_Store
```

Expected: command exits `0`.

- [ ] **Step 3: Verify metadata contains the expanded scope**

Run:

```bash
rtk rg --no-line-number "参考图生成和编辑图片|save each output with its prompt file|allow_implicit_invocation" skills/ylsagi-image-generation/agents/openai.yaml
```

Expected output:

```text
  short_description: "通过 ylsagi Responses 网关生成、参考图生成和编辑图片，并按项目规则落盘"
  default_prompt: "Use $ylsagi-image-generation to generate or edit raster images through the ylsagi Responses gateway, use attachments as references when provided, and save each output with its prompt file."
  allow_implicit_invocation: true
```

- [ ] **Step 4: Verify `.DS_Store` is absent**

Run:

```bash
rtk test ! -e skills/ylsagi-image-generation/.DS_Store
```

Expected: command exits `0`.

- [ ] **Step 5: Commit metadata cleanup**

Run:

```bash
rtk git add skills/ylsagi-image-generation/agents/openai.yaml
rtk git rm -f --ignore-unmatch skills/ylsagi-image-generation/.DS_Store
rtk git commit -m "chore: 更新 skill 元数据并清理杂项"
```

Expected: commit succeeds if `.DS_Store` was tracked or `agents/openai.yaml` changed. If Git reports `nothing to commit` because `.DS_Store` was untracked/ignored and metadata already matched, continue to Task 6.

---

### Task 6: Final Verification

**Files:**
- Verify: `skills/ylsagi-image-generation/SKILL.md`
- Verify: `skills/ylsagi-image-generation/references/prompting.md`
- Verify: `skills/ylsagi-image-generation/references/image-tool-json.md`
- Verify: `skills/ylsagi-image-generation/references/sample-prompts.md`
- Verify: `skills/ylsagi-image-generation/agents/openai.yaml`
- Test: `skills/ylsagi-image-generation/scripts/generate-image-via-responses.test.mjs`

- [ ] **Step 1: Run existing script tests**

Run:

```bash
rtk /Users/cai/.bun/bin/bun test skills/ylsagi-image-generation/scripts/generate-image-via-responses.test.mjs
```

Expected: all tests pass.

- [ ] **Step 2: Verify no Image API CLI path was introduced**

Run:

```bash
rtk rg -n "scripts/image_gen.py|output/imagegen|generate-batch|--input-fidelity" skills/ylsagi-image-generation
```

Expected: no matches.

- [ ] **Step 3: Verify prompt-file archival is documented**

Run:

```bash
rtk rg -n "same-stem raw prompt text|output/YYYY/MM/DD|--prompt-file|同 stem|不要覆盖" skills/ylsagi-image-generation/SKILL.md
```

Expected: matches for all required archival concepts.

- [ ] **Step 4: Verify references are linked from `SKILL.md`**

Run:

```bash
rtk rg --no-line-number "references/prompting.md|references/image-tool-json.md|references/sample-prompts.md" skills/ylsagi-image-generation/SKILL.md
```

Expected output:

```text
- `references/prompting.md`: 复杂 prompt、参考图角色、编辑 invariants、文字、透明背景和结果检查。
- `references/image-tool-json.md`: `--tool-json`、`gpt-image-2` quality、size、moderation 和透明背景限制。
- `references/sample-prompts.md`: 常见任务的 copy/paste prompt 模板。
```

- [ ] **Step 5: Verify repository status**

Run:

```bash
rtk git status --short
```

Expected after completing and committing Tasks 1-5:

```text
```

The output should be empty. If the plan file itself is still uncommitted, stage and commit it separately only if the user wants plan documents committed in this repository.

- [ ] **Step 6: Self-review against requirements**

Check these statements manually:

```text
SKILL.md keeps ylsagi Responses gateway as the only execution path.
SKILL.md does not make built-in image_gen the default.
SKILL.md does not introduce the Python Image API CLI.
Output paths default to output/YYYY/MM/DD/.
Every generated image requires a same-stem .txt prompt file.
Text must be generated by the image service, not added locally.
Reference images and edit targets are distinguished.
Prompt details live in references rather than bloating SKILL.md.
```

Expected: every statement is true.

---

## Plan Self-Review

Spec coverage:

- Usage boundaries are implemented in Task 4.
- Reference-vs-edit role rules are implemented in Tasks 1 and 4.
- Prompt schema, specificity policy, text rules, and edit invariants are implemented in Task 1.
- Use-case slugs and sample recipes are implemented in Tasks 1 and 3.
- `gpt-image-2` `--tool-json` guidance is implemented in Task 2.
- Output archive rules are implemented in Task 4.
- Agent metadata is implemented in Task 5.
- Runtime regression testing is implemented in Task 6.

Placeholder scan:

- The plan contains no placeholder markers, no open-ended implementation notes, and no deferred file contents.

Type and name consistency:

- Reference paths are consistently `references/prompting.md`, `references/image-tool-json.md`, and `references/sample-prompts.md`.
- Script path is consistently `scripts/generate-image-via-responses.mjs`.
- Commands consistently use `/Users/cai/.bun/bin/bun` and `rtk`.
