#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5180/threejs-rpg.html?demo=1';
const outputDir = path.join(root, 'assets/generated/videos');
const outputSuffix = process.env.DEMO_OUTPUT_SUFFIX || '';
if (outputSuffix && !/^[a-z0-9][a-z0-9-]*$/i.test(outputSuffix)) {
  throw new Error('DEMO_OUTPUT_SUFFIX must be a simple filename suffix (letters, digits, hyphens)');
}
const outputStem = `cangshan-3d-story-demo${outputSuffix ? `-${outputSuffix}` : ''}`;
const outputPath = path.join(outputDir, `${outputStem}.webm`);
const viewport = { width: 1600, height: 900 };
const headless = process.env.DEMO_HEADLESS === '1';
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cangshan-3d-demo-'));
await fs.mkdir(outputDir, { recursive: true });

const launchArgs = ['--autoplay-policy=no-user-gesture-required'];
if (headless) launchArgs.push('--use-gl=angle', '--use-angle=swiftshader');
const browser = await chromium.launch({
  headless,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: launchArgs
});
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  recordVideo: { dir: tempDir, size: viewport }
});
const page = await context.newPage();
const video = page.video();
const pageErrors = [];
const badResponses = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('favicon')) pageErrors.push(message.text());
});
page.on('response', (response) => {
  if (response.status() >= 400 && /\.glb|threejs-rpg|character/i.test(response.url())) {
    badResponses.push(`${response.status()} ${response.url()}`);
  }
});

let recordedPath = null;
let demoCompleted = false;
try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__cangshanDemo?.ready, null, { timeout: 60000 });
  await page.waitForFunction(() => {
    const state = window.__cangshanDemo?.state?.();
    return state?.heroLoaded && state?.heroineLoaded;
  }, null, { timeout: 60000 });
  const loadedModels = await page.evaluate(() => window.__cangshanDemo.state());
  const demoUrl = new URL(baseUrl);
  const usesImplicitDemoHero = demoUrl.searchParams.get('demo') === '1'
    && !demoUrl.searchParams.has('hero')
    && !demoUrl.searchParams.has('heroAsset');
  if (!loadedModels.heroClips.includes('Walk')) {
    throw new Error(`Demo hero GLB has no Walk clip: ${JSON.stringify(loadedModels)}`);
  }
  if (usesImplicitDemoHero && !loadedModels.heroAsset.endsWith('shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v19-game-ready.glb')) {
    throw new Error(`Automatic story demo did not load the approved v19 hero: ${JSON.stringify(loadedModels)}`);
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outputDir, `${outputStem}-cover.png`) });
  const startedAt = Date.now();
  let result;
  while (!result) {
    await page.waitForTimeout(2500);
    const progress = await page.evaluate(() => window.__cangshanDemo.state());
    console.log(`[cangshan-demo] ${Math.round((Date.now() - startedAt) / 1000)}s · ${progress.step} · ${progress.location}`);
    if (progress.step === 'complete' && !progress.running) {
      result = { complete: true, location: progress.location };
      break;
    }
    if (Date.now() - startedAt > 180000) throw new Error(`Demo timed out: ${JSON.stringify(progress)}`);
  }
  if (!result?.complete) throw new Error(`Demo stopped before the room return: ${JSON.stringify(result)}`);
  if (pageErrors.length) throw new Error(`Browser errors: ${pageErrors.join(' | ')}`);
  if (badResponses.length) throw new Error(`Failed responses: ${badResponses.join(' | ')}`);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(outputDir, `${outputStem}-end.png`) });
  demoCompleted = true;
  console.log(JSON.stringify({ baseUrl, outputPath, viewport, headless, result, loadedModels, pageErrors, badResponses }, null, 2));
} finally {
  await page.close().catch(() => {});
  await context.close().catch(() => {});
  recordedPath = await video.path().catch(() => null);
  if (recordedPath && demoCompleted) await fs.rename(recordedPath, outputPath);
  else if (recordedPath) await fs.rm(recordedPath, { force: true }).catch(() => {});
  await browser.close().catch(() => {});
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
}

if (!recordedPath || !demoCompleted) throw new Error('Chromium did not produce a complete demo video.');
console.log(`[cangshan-demo] 视频已保存：${outputPath}`);
