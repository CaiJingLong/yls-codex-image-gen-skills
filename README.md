# yls-codex-image-gen-skills

这个仓库用于分发一套给 Codex 使用的生图工具与配套约束。

包含两个主要部分：

- `skills/ylsagi-image-generation/`：通过 ylsagi Responses 网关生成图片并保存到本地文件的 skill
- `AGENTS.md`：适合放在生图项目根目录的提示词，用来约束输出目录、命名、prompt 文本留存、Git LFS 和禁止本地后处理纠偏

其中 `generate-image-via-responses.mjs` 可以直接用 `bun` 或 `node` 执行；如果使用 Node.js，建议版本为 `18+`。

## 安装 skill

推荐把仓库克隆到独立目录，再把 skill 软链接到 `~/.codex/skills/`，这样后续更新只需要 `git pull`。

```bash
mkdir -p ~/.codex/repos
git clone https://github.com/CaiJingLong/yls-codex-image-gen-skills.git ~/.codex/repos/yls-codex-image-gen-skills

mkdir -p ~/.codex/skills
ln -s ~/.codex/repos/yls-codex-image-gen-skills/skills/ylsagi-image-generation ~/.codex/skills/ylsagi-image-generation
```

如果本地已经存在同名链接或目录，请先自行处理后再创建软链接。

后续更新：

```bash
git -C ~/.codex/repos/yls-codex-image-gen-skills pull
```

## 使用 AGENTS.md

如果你有一个专门存放生图结果的项目仓库，可以把本仓库根目录的 `AGENTS.md` 复制过去：

```bash
cp ~/.codex/repos/yls-codex-image-gen-skills/AGENTS.md /path/to/your-image-project/AGENTS.md
```

这个文件的作用是让 Codex 在该项目里遵守统一的生图归档规则，例如：

- 所有输出图片放在 `output/YYYY/MM/DD/`
- 每张图片都保留同名 `.txt` prompt 文件
- 图片文件通过 Git LFS 管理
- 不使用本地 OCR、补字、覆盖、二次合成来“修图纠偏”

## 配合使用

推荐方式：

1. 安装 `ylsagi-image-generation` skill
2. 把 `AGENTS.md` 放到你的生图项目根目录
3. 在该项目中直接让 Codex 生成图片

这样 skill 负责生成图片，`AGENTS.md` 负责约束归档与流程，两者职责分离，组合使用更稳定。
