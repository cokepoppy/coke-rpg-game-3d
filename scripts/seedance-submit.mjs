#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";

const ORIGIN = "https://www.seedance2ai.io";
const TERMINAL_SUCCESS = new Set(["completed", "complete", "succeeded", "success"]);
const TERMINAL_FAILURE = new Set(["failed", "error", "cancelled", "canceled"]);

function parseArgs(argv) {
  const options = {
    execute: false,
    prompt: "",
    input: "",
    duration: "5",
    resolution: "720p",
    aspectRatio: "9:16",
    qualityTier: "standard",
    channel: "standard",
    generateAudio: true,
    fixedLens: false,
    poll: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      index += 1;
      if (!argv[index]) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };

    if (arg === "--execute") options.execute = true;
    else if (arg === "--poll") options.poll = true;
    else if (arg === "--no-audio") options.generateAudio = false;
    else if (arg === "--fixed-lens") options.fixedLens = true;
    else if (arg === "--prompt") options.prompt = value();
    else if (arg === "--input") options.input = value();
    else if (arg === "--duration") options.duration = value();
    else if (arg === "--resolution") options.resolution = value();
    else if (arg === "--aspect-ratio") options.aspectRatio = value();
    else if (arg === "--quality-tier") options.qualityTier = value();
    else if (arg === "--channel") options.channel = value();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function usage() {
  return `Usage:
  node scripts/seedance-submit.mjs --prompt <text> [--input <file>] [options]

Defaults to a safe dry run. Add --execute to upload and submit a paid task.

Options:
  --input <file>             Media reference; sets media-to-video mode
  --duration <4-15>          Default: 5
  --resolution <720p|1080p> Default: 720p
  --aspect-ratio <ratio>     Default: 9:16
  --quality-tier <tier>      standard or pro
  --channel <mode>           standard, real, or wild
  --no-audio                 Disable generated audio
  --fixed-lens               Request a fixed camera
  --poll                     Poll until a terminal status after submission
  --execute                  Perform network requests and spend credits

Execution requires SEEDANCE_BEARER_TOKEN in the environment.`;
}

function assertChoice(name, value, choices) {
  if (!choices.includes(value)) {
    throw new Error(`${name} must be one of: ${choices.join(", ")}`);
  }
}

function mimeType(filePath) {
  const types = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
  };
  const type = types[extname(filePath).toLowerCase()];
  if (!type) throw new Error(`Unsupported input extension: ${extname(filePath)}`);
  return type;
}

function uniqueKey(filePath) {
  const ext = extname(filePath).toLowerCase();
  const stem = basename(filePath, ext).replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60);
  return `${stem || "media"}-${Date.now()}${ext}`;
}

async function apiJson(path, token, init = {}) {
  const response = await fetch(`${ORIGIN}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.error || body.message || `${path} failed (${response.status})`);
  }
  return body;
}

async function uploadMedia(filePath, token) {
  const absolutePath = resolve(filePath);
  const info = await stat(absolutePath);
  if (!info.isFile()) throw new Error(`Input is not a file: ${absolutePath}`);
  if (info.size > 50 * 1024 * 1024) throw new Error("Input exceeds the observed 50 MB limit");

  const type = mimeType(absolutePath);
  const sts = await apiJson("/api/s3/sts", token, {
    method: "POST",
    body: JSON.stringify({
      key: uniqueKey(absolutePath),
      fileType: type,
      prefix: "/seedance-media",
    }),
  });
  const { putUrl, completedUrl } = sts.data || {};
  if (!putUrl || !completedUrl) throw new Error("STS response is missing upload URLs");

  const upload = await fetch(putUrl, {
    method: "PUT",
    headers: { "Content-Type": type },
    body: await readFile(absolutePath),
  });
  if (!upload.ok) throw new Error(`Object upload failed (${upload.status})`);
  return completedUrl;
}

function createPayload(options, mediaUrl) {
  const hasMedia = Boolean(mediaUrl);
  return {
    mode: hasMedia ? "media-to-video" : "text-to-video",
    quality_tier: options.qualityTier,
    prompt: options.prompt,
    aspect_ratio: options.aspectRatio,
    duration: options.duration,
    resolution: options.resolution,
    ...(hasMedia
      ? { media_urls: [mediaUrl], media_durations: [null] }
      : {}),
    generate_audio: options.generateAudio,
    fixed_lens: options.fixedLens,
    channel: options.channel,
  };
}

function publicPayload(payload) {
  return {
    ...payload,
    ...(payload.media_urls ? { media_urls: ["<uploaded-media-url>"] } : {}),
  };
}

async function pollStatus(id, requestId, token) {
  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    const query = requestId ? `?requestId=${encodeURIComponent(requestId)}` : "";
    const result = await apiJson(`/api/seedance/status/${encodeURIComponent(id)}${query}`, token);
    const status = String(result.status || result.data?.status || "").toLowerCase();
    console.log(JSON.stringify({ id, status: status || "unknown" }));
    if (TERMINAL_SUCCESS.has(status)) return result;
    if (TERMINAL_FAILURE.has(status)) throw new Error(`Generation ended with status: ${status}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000));
  }
  throw new Error("Status polling timed out after 15 minutes");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.prompt.trim().length < 3) throw new Error("Prompt must contain at least 3 characters");
  assertChoice("quality tier", options.qualityTier, ["standard", "pro"]);
  assertChoice("channel", options.channel, ["standard", "real", "wild"]);
  assertChoice("resolution", options.resolution, ["720p", "1080p"]);
  assertChoice("aspect ratio", options.aspectRatio, ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]);
  const duration = Number(options.duration);
  if (!Number.isInteger(duration) || duration < 4 || duration > 15) {
    throw new Error("duration must be an integer from 4 through 15");
  }

  if (!options.execute) {
    console.log(JSON.stringify({ dryRun: true, endpoint: "/api/seedance/submit", payload: publicPayload(createPayload(options, options.input ? "<uploaded-media-url>" : "")) }, null, 2));
    return;
  }

  const token = process.env.SEEDANCE_BEARER_TOKEN;
  if (!token) throw new Error("SEEDANCE_BEARER_TOKEN is required with --execute");
  const mediaUrl = options.input ? await uploadMedia(options.input, token) : "";
  const result = await apiJson("/api/seedance/submit", token, {
    method: "POST",
    body: JSON.stringify(createPayload(options, mediaUrl)),
  });
  const id = result.id || result.data?.id;
  const requestId = result.requestId || result.data?.requestId;
  console.log(JSON.stringify({ submitted: true, id, requestId, creditsUsed: result.credits_used }, null, 2));
  if (options.poll) {
    if (!id) throw new Error("Submit response did not include a task id");
    const terminal = await pollStatus(id, requestId, token);
    console.log(JSON.stringify({ completed: true, result: terminal }, null, 2));
  }
}

main().catch((error) => {
  console.error(`Seedance automation failed: ${error.message}`);
  process.exitCode = 1;
});
