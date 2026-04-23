import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildRequestBody,
  collectImageResultFromSse,
  decodeImageResult,
  detectImageExtension,
  parseArgs,
  resolvePromptText,
  resolveReferences,
  resolveApiKey,
  resolveOutputPath,
} from "./generate-image-via-responses.mjs";

const encoder = new TextEncoder();

function streamFromChunks(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("collectImageResultFromSse", () => {
  test("extracts base64 from response.output_item.done chunks", async () => {
    const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO1m1x8AAAAASUVORK5CYII=";
    const stream = streamFromChunks([
      "event: response.output_item.done\n",
      "data: {\"type\":\"response.output_item.done\",\"item\":{\"type\":\"image_generation_",
      "call\",\"result\":\"",
      base64,
      "\"}}\n\n",
      "event: response.completed\n",
      "data: {\"type\":\"response.completed\"}\n\n",
    ]);

    await expect(collectImageResultFromSse(stream)).resolves.toBe(base64);
  });

  test("ignores response.completed without an image result", async () => {
    const stream = streamFromChunks([
      "event: response.completed\n",
      "data: {\"type\":\"response.completed\",\"response\":{\"id\":\"resp_123\"}}\n\n",
    ]);

    await expect(collectImageResultFromSse(stream)).rejects.toThrow(
      "No image_generation_call result found in streamed SSE events.",
    );
  });

  test("surfaces a moderation hint when the gateway blocks the request", async () => {
    const stream = streamFromChunks([
      "event: error\n",
      "data: {\"type\":\"error\",\"error\":{\"type\":\"image_generation_user_error\",\"code\":\"moderation_blocked\",\"message\":\"Your request was rejected by the safety system.\"}}\n\n",
    ]);

    try {
      await collectImageResultFromSse(stream);
      throw new Error("Expected collectImageResultFromSse to throw.");
    } catch (error) {
      expect(error.message).toContain("moderation_blocked");
      expect(error.message).toContain("真实人物");
      expect(error.message).toContain("不要直接使用真实人物姓名");
    }
  });
});

describe("decodeImageResult", () => {
  test("accepts raw base64 and data URLs", () => {
    const rawBase64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/";
    expect(decodeImageResult(rawBase64)).toEqual(Buffer.from(rawBase64, "base64"));
    expect(decodeImageResult(`data:image/jpeg;base64,${rawBase64}`)).toEqual(
      Buffer.from(rawBase64, "base64"),
    );
  });
});

describe("file helpers", () => {
  test("detects png and jpeg output types", () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

    expect(detectImageExtension(pngBytes)).toBe(".png");
    expect(detectImageExtension(jpegBytes)).toBe(".jpg");
  });

  test("appends an inferred extension when output path has none", () => {
    expect(resolveOutputPath("output/poster", ".png")).toBe("output/poster.png");
    expect(resolveOutputPath("output/poster.jpg", ".png")).toBe("output/poster.jpg");
  });
});

describe("parseArgs", () => {
  test("accepts repeated --reference values", () => {
    expect(
      parseArgs([
        "--prompt",
        "draw a lantern",
        "--output",
        "output/lantern",
        "--reference",
        "refs/a.png",
        "--reference",
        "https://example.com/ref.png",
      ]),
    ).toMatchObject({
      prompt: "draw a lantern",
      output: "output/lantern",
      references: ["refs/a.png", "https://example.com/ref.png"],
    });
  });

  test("accepts --prompt-file without --prompt", () => {
    expect(
      parseArgs([
        "--prompt-file",
        "output/prompt.txt",
        "--output",
        "output/lantern",
      ]),
    ).toMatchObject({
      promptFile: "output/prompt.txt",
      output: "output/lantern",
    });
  });

  test("rejects passing both --prompt and --prompt-file", () => {
    expect(() =>
      parseArgs([
        "--prompt",
        "draw a lantern",
        "--prompt-file",
        "output/prompt.txt",
        "--output",
        "output/lantern",
      ]),
    ).toThrow("Use either --prompt or --prompt-file, not both.");
  });
});

describe("buildRequestBody", () => {
  test("defaults image moderation to low", () => {
    expect(
      buildRequestBody({
        prompt: "draw a small paper lantern",
      }),
    ).toEqual({
      model: "gpt-5.4",
      input: "draw a small paper lantern",
      stream: true,
      tools: [
        {
          type: "image_generation",
          model: "gpt-image-2",
          moderation: "low",
        },
      ],
    });
  });

  test("allows tool overrides to switch moderation back to auto", () => {
    expect(
      buildRequestBody({
        prompt: "draw a small paper lantern",
        toolOverrides: { moderation: "auto" },
      }),
    ).toEqual({
      model: "gpt-5.4",
      input: "draw a small paper lantern",
      stream: true,
      tools: [
        {
          type: "image_generation",
          model: "gpt-image-2",
          moderation: "auto",
        },
      ],
    });
  });

  test("builds multimodal input when reference images are provided", () => {
    expect(
      buildRequestBody({
        prompt: "combine these objects into a still life",
        references: [
          { type: "image_url", value: "data:image/png;base64,AAA=" },
          { type: "file_id", value: "file-123" },
        ],
        toolOverrides: { size: "1536x1024" },
      }),
    ).toEqual({
      model: "gpt-5.4",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "combine these objects into a still life" },
            { type: "input_image", image_url: "data:image/png;base64,AAA=" },
            { type: "input_image", file_id: "file-123" },
          ],
        },
      ],
      stream: true,
      tools: [
        {
          type: "image_generation",
          model: "gpt-image-2",
          moderation: "low",
          size: "1536x1024",
        },
      ],
    });
  });
});

describe("resolveReferences", () => {
  test("converts a local image path into a data URL reference", async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yls-ref-"));
    const imagePath = path.join(tempDir, "ref.png");
    writeFileSync(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    try {
      await expect(resolveReferences([imagePath])).resolves.toEqual([
        {
          type: "image_url",
          value: "data:image/png;base64,iVBORw0KGgo=",
        },
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("resolveApiKey", () => {
  test("prefers Codex auth.json over OPENAI_API_KEY when no explicit key is passed", async () => {
    const codexHome = mkdtempSync(path.join(os.tmpdir(), "codex-auth-"));
    writeFileSync(path.join(codexHome, "auth.json"), JSON.stringify({ OPENAI_API_KEY: "yls-auth-file" }));

    try {
      await expect(
        resolveApiKey({
          apiKeyEnv: "OPENAI_API_KEY",
          env: {
            OPENAI_API_KEY: "yls-from-env",
            CODEX_HOME: codexHome,
          },
        }),
      ).resolves.toBe("yls-auth-file");
    } finally {
      rmSync(codexHome, { recursive: true, force: true });
    }
  });

  test("falls back to the current Codex auth.json when env key is missing", async () => {
    const codexHome = mkdtempSync(path.join(os.tmpdir(), "codex-auth-"));
    writeFileSync(path.join(codexHome, "auth.json"), JSON.stringify({ OPENAI_API_KEY: "yls-auth-file" }));

    try {
      await expect(
        resolveApiKey({
          apiKeyEnv: "OPENAI_API_KEY",
          env: {
            CODEX_HOME: codexHome,
          },
        }),
      ).resolves.toBe("yls-auth-file");
    } finally {
      rmSync(codexHome, { recursive: true, force: true });
    }
  });
});

describe("resolvePromptText", () => {
  test("loads prompt text from a file path", async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "yls-prompt-"));
    const promptPath = path.join(tempDir, "prompt.txt");
    writeFileSync(promptPath, "first line\nsecond line\n");

    try {
      await expect(resolvePromptText({ promptFile: promptPath })).resolves.toBe(
        "first line\nsecond line\n",
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
