# yls-codex-image-gen-skills

这个仓库提供两样东西：

- `skills/ylsagi-image-generation/`：一个给 Codex 用的生图 skill，通过 ylsagi Responses 网关生成图片并落盘到本地文件。
- `AGENTS.md`：一个配合生图 skill 使用的项目级提示词，用来约束图片归档目录、命名、prompt 文本留存、Git LFS 和禁止本地 OCR / 补字 / 后处理纠偏。

## 安装 skill

Codex 的 skill 目录默认是 `~/.codex/skills/`，这个 skill 应安装到：

```text
~/.codex/skills/ylsagi-image-generation/
```

推荐做法不是直接把文件散拷进去，而是把这个仓库 `clone` 到一个独立目录，再把其中的 skill 软链接到 `~/.codex/skills/`。这样后续更新时只需要对仓库执行 `git pull`。

### GitHub Raw 地址

以下是这个仓库 `main` 分支对应的 Raw 地址。把当前内容推送到 GitHub 后，就可以直接用于安装：

- `https://raw.githubusercontent.com/CaiJingLong/yls-codex-image-gen-skills/main/skills/ylsagi-image-generation/SKILL.md`
- `https://raw.githubusercontent.com/CaiJingLong/yls-codex-image-gen-skills/main/skills/ylsagi-image-generation/agents/openai.yaml`
- `https://raw.githubusercontent.com/CaiJingLong/yls-codex-image-gen-skills/main/skills/ylsagi-image-generation/scripts/generate-image-via-responses.mjs`
- `https://raw.githubusercontent.com/CaiJingLong/yls-codex-image-gen-skills/main/skills/ylsagi-image-generation/scripts/generate-image-via-responses.test.mjs`

### 可以直接给 Codex 的一句话

```text
请把 https://github.com/CaiJingLong/yls-codex-image-gen-skills.git clone 到 ~/.codex/repos/yls-codex-image-gen-skills，并把 ~/.codex/repos/yls-codex-image-gen-skills/skills/ylsagi-image-generation 软链接到 ~/.codex/skills/ylsagi-image-generation。
```

### 手动安装（推荐：clone + 软链接）

```bash
mkdir -p ~/.codex/repos
git clone https://github.com/CaiJingLong/yls-codex-image-gen-skills.git ~/.codex/repos/yls-codex-image-gen-skills

mkdir -p ~/.codex/skills
ln -s ~/.codex/repos/yls-codex-image-gen-skills/skills/ylsagi-image-generation ~/.codex/skills/ylsagi-image-generation
```

后续更新：

```bash
git -C ~/.codex/repos/yls-codex-image-gen-skills pull
```

## 安装 AGENTS.md

如果你有一个专门存放生图结果的项目仓库，可以把这个文件放到仓库根目录：

- `https://raw.githubusercontent.com/CaiJingLong/yls-codex-image-gen-skills/main/AGENTS.md`

也可以直接给 Codex 一句话：

```text
请把 https://raw.githubusercontent.com/CaiJingLong/yls-codex-image-gen-skills/main/AGENTS.md 保存为当前项目根目录的 AGENTS.md。
```

## 怎么配合使用

推荐把两者分开理解：

- `ylsagi-image-generation` skill：负责真正调用接口生成图片，并把结果保存到本地。
- `AGENTS.md`：负责告诉 Codex 这个项目里的图片应该怎么存、prompt 文本怎么留、哪些本地纠偏手段禁止使用。

最简单的搭配方式是：

1. 把 skill 安装到 `~/.codex/skills/ylsagi-image-generation/`
2. 把 `AGENTS.md` 放到你的生图项目根目录
3. 直接让 Codex 在该项目里生成图片

例如：

```text
用 ylsagi-image-generation 生成一张复古电影海报风格的海边咖啡店宣传图，输出到 output/2026/04/23/153000-seaside-cafe-v1
```

这样 Codex 会同时拿到：

- skill 本身的生成能力
- 项目里的归档与流程约束

如果你的目标是“稳定生成图片并且把结果规范地存档”，这两个文件一起用会更顺手。
