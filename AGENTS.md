# 仓库工作流约束

## 仓库目标

这个仓库只用于保存生图结果及其对应的原始 prompt 纯文本。

允许提交的内容只有两类：

- `output/` 下的生图图片与同名 prompt 文本
- 仓库级约束文件，如 `AGENTS.md`、`.gitattributes`、`.gitignore`

与生图归档无关的代码、依赖、脚本、实验文件、调研文档、构建产物，不要放进这个仓库。

## 输出目录规则

所有生成图片都必须放在 `output/YYYY/MM/DD/` 下。

不要把生成图片放在其他目录，除非用户明确要求。

为避免同一天内重名，文件名建议使用 `HHMMSS` 或 `HHMMSS-简短标识` 作为 stem。

## 生成结果保留与命名规则

任何时间生成的图片都需要保留，不要因为你主观判断“这一版有问题”就覆盖、删除、替换之前已经生成出的图片。

如果同一条或高度相近的 prompt 连续生成了多个版本，用文件名明确保留版本号，便于用户横向对比。默认使用 `-v1`、`-v2`、`-v3` 这样的后缀。

示例：

- `output/2026/04/23/115500-ai-era-humans-v1.png`
- `output/2026/04/23/115500-ai-era-humans-v1.txt`
- `output/2026/04/23/115500-ai-era-humans-v2.png`
- `output/2026/04/23/115500-ai-era-humans-v2.txt`

如果用户明确说明需要并行生图、一次产出多张供对比，可以满足，但同时生成的数量上限是 `4` 张。

并行对比图的文件命名必须体现它们属于同一批次，并能一眼区分该批次内的第几张。推荐使用“同一个批次 stem + 序号”命名，例如：

- `output/2026/04/23/120000-ai-era-humans-batch1-01.png`
- `output/2026/04/23/120000-ai-era-humans-batch1-01.txt`
- `output/2026/04/23/120000-ai-era-humans-batch1-02.png`
- `output/2026/04/23/120000-ai-era-humans-batch1-02.txt`
- `output/2026/04/23/120000-ai-era-humans-batch1-03.png`
- `output/2026/04/23/120000-ai-era-humans-batch1-03.txt`

如果同一批次之后又继续生成新一批对比图，则继续递增批次标识，例如 `batch2`、`batch3`。

## Prompt 伴随文件规则

每一张生成图片都必须在同一目录下保留一个同名 `.txt` 文件，名称除扩展名外必须完全一致。

示例：

- `output/2026/04/23/091530-cat.png`
- `output/2026/04/23/091530-cat.txt`

这个 `.txt` 文件只保存提交给生图 skill 或接口的原始 prompt 纯文本。

不要在 `.txt` 里混入这些内容：

- 解释说明
- Markdown 包装
- JSON
- 日志
- 参数摘要
- 复盘笔记

如果一次请求产出多张图片，每张图片都各自保留一份同名 `.txt`。

## 禁止的本地纠偏流程

无论何时，都不要使用本地 OCR、文字识别脚本、Tesseract、视觉识别脚本等手段，去校验图片里的文案是否正确，并据此作为主要验收或纠偏流程。

无论何时，也不要对已经生成出的图片做本地覆盖、补字、抹字、贴气泡、重排文字、局部涂改、二次合成等后处理来“修正”结果。

这条禁令覆盖但不限于以下做法：

- 先生成图片，再用本地 OCR 检查文字
- 先生成图片，再用 Pillow、ImageMagick、Canvas、SVG、PS 动作、PPT、截图标注等方式覆盖文字
- 先生成无字图，再在本地补标题、对白、字幕条、奖牌字样、海报文案
- 通过局部覆盖或重新贴图来修正模型生成错误的字

如果画面文字不准确、版式不对、内容缺失，唯一允许的纠偏方式是：

- 直接修改 prompt
- 重新调用生图接口生成
- 在多张结果中选择保留的最终版本

不要把本地 OCR 或本地图片覆盖当作生图工作流的一部分。

## Git LFS 规则

所有二进制图片文件必须通过 Git LFS 管理，不要以普通 Git blob 提交图片。

Prompt 文本 `.txt` 必须按普通文本文件提交，不使用 Git LFS。

如果新增了新的二进制图片格式，需要先把它加入 `.gitattributes`，再提交图片。

## Git 提交流程规则

`git lfs` 文件和普通文件都通过正常的 `git add` 暂存，不需要单独使用另一套 add 命令。

也就是说，只要图片扩展名已经被 `.gitattributes` 配置为 LFS，执行 `git add` 时，图片会按 Git LFS 方式进入索引，普通文本文件则按普通 Git 方式进入索引。

但是这个仓库默认不要使用 `git add .`，因为它很容易把无关文件一起暂存进去，不符合这个仓库“只保存生图归档”的目标。

默认提交流程如下：

1. 先检查变更：
   `git status --short`
2. 显式暂存需要的文件，不要贪方便全量暂存：
   - 仓库规则文件示例：
     `git add AGENTS.md .gitattributes .gitignore`
   - 生图归档示例：
     `git add output/YYYY/MM/DD/<stem>.<ext> output/YYYY/MM/DD/<stem>.txt`
3. 再次检查暂存结果：
   `git status --short`
4. 确认图片路径命中了 LFS 规则：
   `git check-attr filter -- output/YYYY/MM/DD/<stem>.<ext>`
   结果应为 `filter: lfs`
5. 再执行提交：
   `git commit`

只有在 `git status --short` 明确显示仓库里不存在任何无关变更时，才允许使用 `git add .`。

## 提交前检查

提交前确认以下几点：

- 图片路径位于 `output/YYYY/MM/DD/`
- 图片文件已被 Git LFS 跟踪
- 同名 `.txt` 文件存在
- `.txt` 内容是原始 prompt 纯文本
- 仓库中没有混入与生图归档无关的文件
