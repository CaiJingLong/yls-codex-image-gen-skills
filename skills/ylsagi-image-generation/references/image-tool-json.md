# Image Tool JSON Reference

Use this reference when a request needs explicit image tool parameters through `--tool-json`.

The ylsagi script sends a Responses request with this default image tool configuration:

```json
{"type":"image_generation","model":"gpt-image-2","moderation":"low"}
```

`--tool-json` merges extra fields into that image tool object. Pass only fields you intentionally need.

## Common Examples

Landscape image:

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/2026/04/25/143000-product-hero.txt \
  --output output/2026/04/25/143000-product-hero \
  --tool-json '{"size":"1536x1024","quality":"high"}'
```

Fast square draft:

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/2026/04/25/143500-icon-draft.txt \
  --output output/2026/04/25/143500-icon-draft \
  --tool-json '{"size":"1024x1024","quality":"low"}'
```

Default moderation:

```bash
/Users/cai/.bun/bin/bun "$SKILL_DIR/scripts/generate-image-via-responses.mjs" \
  --prompt-file output/2026/04/25/144000-poster.txt \
  --output output/2026/04/25/144000-poster \
  --tool-json '{"moderation":"auto"}'
```

## Quality

For `gpt-image-2`, use:

- `low`: quick drafts, thumbnails, early prompt exploration
- `medium`: normal final images
- `high`: final assets, product images, identity-sensitive edits, dense text, diagrams, UI mockups
- `auto`: allow the model/service to choose

Prefer `medium`, `high`, or `auto` when visible text must be legible.

## Size

Popular `gpt-image-2` sizes:

- `1024x1024`: fast square draft
- `1536x1024`: landscape
- `1024x1536`: portrait
- `2048x2048`: large square
- `2048x1152`: 16:9 landscape
- `3840x2160`: 4K-style landscape
- `2160x3840`: 4K-style portrait
- `auto`: default

`gpt-image-2` custom size constraints:

- maximum edge length must be `<= 3840`
- both edges must be multiples of `16`
- long-to-short ratio must be `<= 3:1`
- total pixels must be between `655360` and `8294400`

Square images are usually fastest.

## Transparent Background Limits

Do not assume `gpt-image-2` supports model-native `background=transparent`. For transparent-background requests, prompt for a flat chroma-key background first and handle alpha extraction only as background removal, never as content correction.

If the user explicitly requires true/native transparency or the subject is complex, explain the limitation before choosing a different model or workflow.

## Moderation

This skill defaults to `moderation: "low"`. That is not policy bypass and does not disable safety filtering. If the user asks for OpenAI's default strictness, pass `{"moderation":"auto"}`.

## Unsupported or Risky Fields

Do not add fields just because they exist in another image workflow. In particular:

- Do not pass `input_fidelity` with `gpt-image-2`.
- Do not pass a mask field through `--tool-json` unless the script and gateway explicitly support it.
- Do not retry unsupported parameters by silently switching models unless the user approved that model/workflow change.
