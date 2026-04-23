#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL = "https://code.ylsagi.com/codex";
const DEFAULT_OUTER_MODEL = "gpt-5.4";
const DEFAULT_IMAGE_MODEL = "gpt-image-2";
const DEFAULT_IMAGE_MODERATION = "low";
const DEFAULT_CODEX_HOME = path.join(os.homedir(), ".codex");
const DEFAULT_CODEX_AUTH_FILE = "auth.json";
const DEFAULT_SKILL_DIR_HINT = "${CODEX_HOME:-$HOME/.codex}/skills/ylsagi-image-generation";
const HELP_TEXT = `Usage:
  bun "${DEFAULT_SKILL_DIR_HINT}/scripts/generate-image-via-responses.mjs" \\
    --prompt "A red paper-cut style dragon poster" \\
    --output output/dragon

  node "${DEFAULT_SKILL_DIR_HINT}/scripts/generate-image-via-responses.mjs" \\
    --prompt "A red paper-cut style dragon poster" \\
    --output output/dragon

Options:
  --prompt <text>         Required. Prompt sent to the Responses API.
  --prompt-file <path>    Optional. Read the prompt from a local UTF-8 text file.
  --output <path>         Required. Output path. Extension is inferred when omitted.
  --reference <value>     Optional. Repeatable. Supports local file paths, http(s) URLs,
                          data URLs, and file IDs such as file-123 or file_123.
                          Codex composer image attachments can be passed here using
                          their absolute local file paths from the thread context.
  --api-key <token>       Optional. Overrides environment lookup.
  --api-key-env <name>    Optional. Default: OPENAI_API_KEY
  --base-url <url>        Optional. Default: ${DEFAULT_BASE_URL}
  --outer-model <name>    Optional. Default: ${DEFAULT_OUTER_MODEL}
  --image-model <name>    Optional. Default: ${DEFAULT_IMAGE_MODEL}
  --tool-json <json>      Optional. Extra image_generation tool fields as JSON.
                          Default tool config includes moderation: "${DEFAULT_IMAGE_MODERATION}".
                          If --api-key and OPENAI_API_KEY are both missing, the script
                          prefers Codex auth at ~/.codex/auth.json (or $CODEX_HOME/auth.json)
                          before falling back to OPENAI_API_KEY.
                          Runtime: Bun or Node.js 18+.
  --help                  Show this help message.
`;

export function buildRequestBody({
  prompt,
  outerModel = DEFAULT_OUTER_MODEL,
  imageModel = DEFAULT_IMAGE_MODEL,
  toolOverrides = {},
  references = [],
}) {
  const input =
    references.length > 0
      ? [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              ...references.map((reference) =>
                reference.type === "file_id"
                  ? {
                      type: "input_image",
                      file_id: reference.value,
                    }
                  : {
                      type: "input_image",
                      image_url: reference.value,
                    },
              ),
            ],
          },
        ]
      : prompt;

  return {
    model: outerModel,
    input,
    stream: true,
    tools: [
      {
        type: "image_generation",
        model: imageModel,
        moderation: DEFAULT_IMAGE_MODERATION,
        ...toolOverrides,
      },
    ],
  };
}

export function resolveCodexAuthPath(env = process.env) {
  const codexHome =
    typeof env?.CODEX_HOME === "string" && env.CODEX_HOME.trim() !== ""
      ? env.CODEX_HOME.trim()
      : DEFAULT_CODEX_HOME;
  return path.join(codexHome, DEFAULT_CODEX_AUTH_FILE);
}

export async function resolveApiKey({
  apiKey,
  apiKeyEnv = "OPENAI_API_KEY",
  env = process.env,
  readFileImpl = readFile,
} = {}) {
  if (typeof apiKey === "string" && apiKey.trim() !== "") {
    return apiKey.trim();
  }

  const authPath = resolveCodexAuthPath(env);
  try {
    const authText = await readFileImpl(authPath, "utf8");
    let authJson;
    try {
      authJson = JSON.parse(authText);
    } catch (error) {
      throw new Error(`Failed to parse Codex auth file at ${authPath}: ${error.message}`);
    }

    const authApiKey = authJson?.OPENAI_API_KEY;
    if (typeof authApiKey === "string" && authApiKey.trim() !== "") {
      return authApiKey.trim();
    }

    throw new Error(
      `Codex auth file at ${authPath} does not contain OPENAI_API_KEY. Pass --api-key or export ${apiKeyEnv}.`,
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      // Fall through to the environment variable when Codex auth is unavailable.
    } else if (error?.code) {
      throw new Error(`Failed to read Codex auth file at ${authPath}: ${error.message}`);
    } else {
      throw error;
    }
  }

  const envApiKey = env?.[apiKeyEnv];
  if (typeof envApiKey === "string" && envApiKey.trim() !== "") {
    return envApiKey.trim();
  }

  throw new Error(
    `Missing API key. Pass --api-key, sign in through Codex so ${authPath} contains OPENAI_API_KEY, or export ${apiKeyEnv}.`,
  );
}

function parseSseBlock(block) {
  let event = "message";
  const dataLines = [];

  for (const rawLine of block.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  return {
    event,
    data: dataLines.join("\n"),
  };
}

function parseEventPayload(parsedEvent) {
  if (!parsedEvent?.data || parsedEvent.data === "[DONE]") {
    return null;
  }

  try {
    return JSON.parse(parsedEvent.data);
  } catch {
    return null;
  }
}

function extractImageResultFromEvent(parsedEvent) {
  const payload = parseEventPayload(parsedEvent);
  if (!payload) {
    return null;
  }

  const eventType = payload?.type ?? parsedEvent.event;
  const item = payload?.item;
  if (
    eventType === "response.output_item.done" &&
    item?.type === "image_generation_call" &&
    typeof item.result === "string" &&
    item.result.trim() !== ""
  ) {
    return item.result;
  }

  return null;
}

function formatGatewayErrorMessage(errorPayload) {
  const errorType =
    typeof errorPayload?.type === "string" && errorPayload.type.trim() !== ""
      ? errorPayload.type.trim()
      : "unknown_error";
  const errorCode =
    typeof errorPayload?.code === "string" && errorPayload.code.trim() !== ""
      ? errorPayload.code.trim()
      : "unknown_code";
  const errorMessage =
    typeof errorPayload?.message === "string" && errorPayload.message.trim() !== ""
      ? errorPayload.message.trim()
      : "No error message returned by the gateway.";

  const lines = [`Gateway image generation failed (${errorType}/${errorCode}): ${errorMessage}`];

  return lines.join("\n");
}

function extractGatewayErrorFromEvent(parsedEvent) {
  const payload = parseEventPayload(parsedEvent);
  if (!payload) {
    return null;
  }

  if (payload?.type === "error" && payload?.error) {
    return payload.error;
  }

  if (payload?.type === "response.failed" && payload?.response?.error) {
    return payload.response.error;
  }

  return null;
}

export async function collectImageResultFromSse(stream) {
  if (!stream) {
    throw new Error("Response body is empty.");
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffered = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffered += decoder.decode(value, { stream: true }).replace(/\r/g, "");

      let boundary = buffered.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffered.slice(0, boundary);
        buffered = buffered.slice(boundary + 2);
        const parsedEvent = parseSseBlock(block);
        const gatewayError = extractGatewayErrorFromEvent(parsedEvent);
        if (gatewayError) {
          throw new Error(formatGatewayErrorMessage(gatewayError));
        }
        const imageResult = extractImageResultFromEvent(parsedEvent);
        if (imageResult) {
          try {
            await reader.cancel();
          } catch {
            // Ignore cancellation errors after the image payload is already captured.
          }
          return imageResult;
        }
        boundary = buffered.indexOf("\n\n");
      }
    }

    buffered += decoder.decode().replace(/\r/g, "");
    if (buffered.trim()) {
      const parsedEvent = parseSseBlock(buffered);
      const gatewayError = extractGatewayErrorFromEvent(parsedEvent);
      if (gatewayError) {
        throw new Error(formatGatewayErrorMessage(gatewayError));
      }
      const imageResult = extractImageResultFromEvent(parsedEvent);
      if (imageResult) {
        return imageResult;
      }
    }
  } finally {
    reader.releaseLock();
  }

  throw new Error("No image_generation_call result found in streamed SSE events.");
}

export function decodeImageResult(result) {
  const trimmed = result.trim();
  const dataUrlMatch = trimmed.match(/^data:.*?;base64,(.+)$/);
  const rawBase64 = dataUrlMatch ? dataUrlMatch[1] : trimmed;
  return Buffer.from(rawBase64, "base64");
}

export function detectImageExtension(buffer) {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return ".png";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return ".webp";
  }

  if (buffer.length >= 6) {
    const header = buffer.toString("ascii", 0, 6);
    if (header === "GIF87a" || header === "GIF89a") {
      return ".gif";
    }
  }

  return ".bin";
}

export function detectImageMediaType(buffer, filePath = "") {
  const detectedExtension = detectImageExtension(buffer);
  if (detectedExtension === ".png") {
    return "image/png";
  }
  if (detectedExtension === ".jpg") {
    return "image/jpeg";
  }
  if (detectedExtension === ".webp") {
    return "image/webp";
  }
  if (detectedExtension === ".gif") {
    return "image/gif";
  }

  switch (path.extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export function resolveOutputPath(outputPath, inferredExtension) {
  if (path.extname(outputPath)) {
    return outputPath;
  }
  return `${outputPath}${inferredExtension}`;
}

function isDataUrl(value) {
  return /^data:/i.test(value);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isFileId(value) {
  return !/[\\/]/.test(value) && /^file[-_][A-Za-z0-9]+$/i.test(value);
}

export async function resolveReferences(references = [], { readFileImpl = readFile } = {}) {
  const normalizedReferences = [];

  for (const reference of references) {
    const value = typeof reference === "string" ? reference.trim() : "";
    if (!value) {
      throw new Error("Reference values must be non-empty strings.");
    }

    if (isDataUrl(value) || isHttpUrl(value)) {
      normalizedReferences.push({
        type: "image_url",
        value,
      });
      continue;
    }

    if (isFileId(value)) {
      normalizedReferences.push({
        type: "file_id",
        value,
      });
      continue;
    }

    let imageBytes;
    try {
      imageBytes = await readFileImpl(value);
    } catch (error) {
      throw new Error(`Failed to read reference image at ${value}: ${error.message}`);
    }

    normalizedReferences.push({
      type: "image_url",
      value: `data:${detectImageMediaType(imageBytes, value)};base64,${imageBytes.toString("base64")}`,
    });
  }

  return normalizedReferences;
}

function parseToolOverrides(rawToolJson) {
  if (!rawToolJson) {
    return {};
  }

  let parsed;
  try {
    parsed = JSON.parse(rawToolJson);
  } catch (error) {
    throw new Error(`Invalid --tool-json payload: ${error.message}`);
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("--tool-json must be a JSON object.");
  }

  return parsed;
}

function takeOptionValue(argv, index, optionName) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${optionName}.`);
  }
  return value;
}

export async function resolvePromptText(options, { readFileImpl = readFile } = {}) {
  if (typeof options?.prompt === "string" && options.prompt !== "") {
    return options.prompt;
  }

  if (typeof options?.promptFile === "string" && options.promptFile !== "") {
    try {
      return await readFileImpl(options.promptFile, "utf8");
    } catch (error) {
      throw new Error(`Failed to read --prompt-file ${options.promptFile}: ${error.message}`);
    }
  }

  throw new Error("Either --prompt or --prompt-file is required.");
}

export function parseArgs(argv) {
  const options = {
    apiKeyEnv: "OPENAI_API_KEY",
    baseUrl: DEFAULT_BASE_URL,
    outerModel: DEFAULT_OUTER_MODEL,
    imageModel: DEFAULT_IMAGE_MODEL,
    references: [],
    toolOverrides: {},
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--prompt":
        options.prompt = takeOptionValue(argv, index, "--prompt");
        index += 1;
        break;
      case "--prompt-file":
        options.promptFile = takeOptionValue(argv, index, "--prompt-file");
        index += 1;
        break;
      case "--output":
        options.output = takeOptionValue(argv, index, "--output");
        index += 1;
        break;
      case "--reference":
        options.references.push(takeOptionValue(argv, index, "--reference"));
        index += 1;
        break;
      case "--api-key":
        options.apiKey = takeOptionValue(argv, index, "--api-key");
        index += 1;
        break;
      case "--api-key-env":
        options.apiKeyEnv = takeOptionValue(argv, index, "--api-key-env");
        index += 1;
        break;
      case "--base-url":
        options.baseUrl = takeOptionValue(argv, index, "--base-url");
        index += 1;
        break;
      case "--outer-model":
        options.outerModel = takeOptionValue(argv, index, "--outer-model");
        index += 1;
        break;
      case "--image-model":
        options.imageModel = takeOptionValue(argv, index, "--image-model");
        index += 1;
        break;
      case "--tool-json":
        options.toolOverrides = parseToolOverrides(takeOptionValue(argv, index, "--tool-json"));
        index += 1;
        break;
      case "--help":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.help) {
    return options;
  }

  if (options.prompt && options.promptFile) {
    throw new Error("Use either --prompt or --prompt-file, not both.");
  }

  if (!options.prompt && !options.promptFile) {
    throw new Error("Either --prompt or --prompt-file is required.");
  }

  if (!options.output) {
    throw new Error("--output is required.");
  }

  return options;
}

function buildResponsesUrl(baseUrl) {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("responses", normalized).toString();
}

export async function generateImageViaResponses(options) {
  const prompt = await resolvePromptText(options);
  const references = await resolveReferences(options.references);
  const requestBody = buildRequestBody({
    ...options,
    prompt,
    references,
  });
  const apiKey = await resolveApiKey(options);
  const response = await fetch(buildResponsesUrl(options.baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gateway request failed (${response.status} ${response.statusText}): ${errorText}`,
    );
  }

  const base64Result = await collectImageResultFromSse(response.body);
  const imageBytes = decodeImageResult(base64Result);
  const inferredExtension = detectImageExtension(imageBytes);
  const outputPath = resolveOutputPath(options.output, inferredExtension);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, imageBytes);

  return {
    outputPath,
    inferredExtension,
    byteLength: imageBytes.length,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }

  const result = await generateImageViaResponses(options);
  console.log(JSON.stringify(result, null, 2));
}

const entryFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (entryFile === invokedFile) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
