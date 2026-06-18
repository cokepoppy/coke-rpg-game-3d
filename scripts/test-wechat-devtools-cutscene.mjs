import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectPath = path.join(root, "wechat-minigame");
const scenarioPath = path.join(projectPath, "js", "simulatorScenario.js");
const cliPath = "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
const auditFilename = "cutscene-simulator-audit.json";
const timeoutMs = Number(process.env.WECHAT_SIMULATOR_TIMEOUT_MS || 60000);
const enabledScenario = `// Generated temporarily by the simulator cutscene test.\nconst SIMULATOR_SCENARIO = Object.freeze({ cutscene: "daoistTeaching" });\n\nmodule.exports = { SIMULATOR_SCENARIO };\n`;

const originalScenario = await fs.readFile(scenarioPath, "utf8");
const startedAt = Date.now();

try {
  await fs.writeFile(scenarioPath, enabledScenario, "utf8");
  await openDeveloperTools();

  const result = await waitForAudit(startedAt, timeoutMs);
  console.log(JSON.stringify(result, null, 2));

  const audit = result.snapshot.audit || {};
  const simulatorVisualWindow = result.snapshot.event === "simulator-visual-window"
    && audit.videoCapabilities?.created
    && audit.simulatorEventBridgeUnobservable;
  if (!simulatorVisualWindow && (!audit.playEvent || audit.timeUpdates < 1 || audit.fallback || audit.error)) {
    process.exitCode = 1;
  }
} finally {
  await fs.writeFile(scenarioPath, originalScenario, "utf8");
}

async function openDeveloperTools() {
  await execFileAsync(cliPath, [
    "open",
    "--project", projectPath,
    "--lang", "zh"
  ], {
    env: { ...process.env, NO_PROXY: "*", no_proxy: "*" },
    timeout: 30000,
    maxBuffer: 1024 * 1024
  });
}

async function waitForAudit(minimumMtime, limitMs) {
  const deadline = Date.now() + limitMs;
  while (Date.now() < deadline) {
    const files = await findAuditFiles();
    for (const file of files) {
      const stat = await fs.stat(file);
      if (stat.mtimeMs < minimumMtime) continue;
      const snapshot = JSON.parse(await fs.readFile(file, "utf8"));
      if (isTerminal(snapshot)) return { file, snapshot };
    }
    await sleep(500);
  }
  throw new Error(`No terminal cutscene audit received from the WeChat simulator within ${limitMs}ms`);
}

function isTerminal(snapshot) {
  if (["error", "watchdog", "fallback", "finish", "simulator-visual-window"].includes(snapshot.event)) return true;
  return snapshot.event === "first-frame" && snapshot.audit?.timeUpdates > 0;
}

async function findAuditFiles() {
  const supportRoot = path.join(os.homedir(), "Library", "Application Support", "微信开发者工具");
  const profiles = await safeReadDir(supportRoot);
  const results = [];
  for (const profile of profiles) {
    if (!profile.isDirectory()) continue;
    await collectMatches(path.join(supportRoot, profile.name, "WeappSimulator"), results, 6);
  }
  return results;
}

async function collectMatches(directory, results, depth) {
  if (depth < 0) return;
  for (const entry of await safeReadDir(directory)) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectMatches(target, results, depth - 1);
    if (entry.isFile() && entry.name === auditFilename) results.push(target);
  }
}

async function safeReadDir(directory) {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
