#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const sharp = require('sharp');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5180/threejs-character-viewer.html';
const output = path.resolve(process.env.CHARACTER_AUDIT_OUTPUT || 'screenshots/cangshan-character-viewer');
const gameSource = await fs.readFile(path.resolve('threejs/game.js'), 'utf8');
const walkSpeedMatch = gameSource.match(/walkSpeed:\s*([0-9]*\.?[0-9]+)/);
if (!walkSpeedMatch) throw new Error('Could not read CONFIG.walkSpeed from threejs/game.js');
const gameWalkSpeedMps = Number(walkSpeedMatch[1]);
const frameCount = 21; // 0.875 s × 24 fps; the last frame closes onto frame 1.
const phases = Array.from({ length: frameCount }, (_, index) => index / frameCount);
const viewport = { width: 1600, height: 900 };
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: process.env.DEMO_HEADLESS !== '0',
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader']
});
const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__characterViewer?.ready, null, { timeout: 60000 });
const clips = await page.evaluate(() => window.__characterViewer.clips);
await page.evaluate(() => window.__characterViewer.setView('side'));
await page.evaluate(() => window.__characterViewer.setClip('Idle'));
await page.evaluate(() => window.__characterViewer.setPhase(0));
await page.waitForTimeout(180);
await page.evaluate(() => window.__characterViewer.setGroundVisible(false));
await page.waitForTimeout(80);
await page.screenshot({ path: path.join(output, 'idle-no-ground.png') });
await page.evaluate(() => window.__characterViewer.setGroundVisible(true));
await page.evaluate(() => window.__characterViewer.setClip('Walk'));
await page.evaluate(() => window.__characterViewer.setPhase(0));
await page.waitForTimeout(180);
await page.evaluate(() => window.__characterViewer.setGroundVisible(false));
await page.waitForTimeout(80);
await page.screenshot({ path: path.join(output, 'walk-no-ground.png') });
await page.evaluate(() => window.__characterViewer.setGroundVisible(true));
await page.evaluate(() => window.__characterViewer.setClip('Walk'));
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(output, 'viewer.png') });

const crops = [];
const gaitSamples = [];
for (let index = 0; index < phases.length; index += 1) {
  const phase = phases[index];
  const name = `walk-frame-${String(index + 1).padStart(2, '0')}.png`;
  await page.evaluate((value) => window.__characterViewer.setPhase(value), phase);
  await page.waitForTimeout(100);
  gaitSamples.push({ phase, bones: await page.evaluate(() => window.__characterViewer.sampleBones()) });
  const file = path.join(output, name);
  await page.screenshot({ path: file });
  const thumbnail = await sharp(file).extract({ left: 320, top: 74, width: 1000, height: 780 })
    .resize({ width: 200, height: 156, fit: 'cover' }).png().toBuffer();
  const label = Buffer.from(`<svg width="200" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111820"/><text x="8" y="17" font-size="12" fill="#e4d2a2" font-family="Arial,sans-serif">Frame ${index + 1} · ${(phase * 100).toFixed(1)}%</text></svg>`);
  const x = (index % 7) * 200;
  const y = Math.floor(index / 7) * 180;
  crops.push({ input: thumbnail, left: x, top: y });
  crops.push({ input: label, left: x, top: y + 156 });
}
await sharp({ create: { width: 1400, height: 540, channels: 4, background: '#0f151b' } })
  .composite(crops).png().toFile(path.join(output, 'walk-cycle-contact-21f-side.png'));
await page.close();
await browser.close();
const correlation = (left, right) => {
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const leftMean = mean(left);
  const rightMean = mean(right);
  const covariance = left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0);
  const leftVariance = left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0);
  const rightVariance = right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0);
  return covariance / Math.sqrt(leftVariance * rightVariance);
};
const range = (values) => values.length
  ? { min: Math.min(...values), max: Math.max(...values), span: Math.max(...values) - Math.min(...values) }
  : null;
const stepDistance = gameWalkSpeedMps * (clips.find((clip) => clip.name === 'Walk')?.duration || 0);
const rightPlantSamples = gaitSamples.filter(({ phase }) => phase <= 0.38);
const leftPlantSamples = gaitSamples.filter(({ phase }) => phase >= 0.52 && phase <= 0.88);
const rightPlantWorldZ = rightPlantSamples.map(({ phase, bones }) => bones.footR.z + stepDistance * phase);
const leftPlantWorldZ = leftPlantSamples.map(({ phase, bones }) => bones.footL.z + stepDistance * (phase - 0.5));
const gaitAnalysis = {
  forwardAxis: 'z',
  assumedGameWalkSpeedMps: gameWalkSpeedMps,
  stepDistancePerCycleM: stepDistance,
  boneNames: Object.keys(gaitSamples[0]?.bones || {}),
  pelvisWorldRange: Object.fromEntries(['x', 'y', 'z'].map((axis) => {
    const values = gaitSamples.map(({ bones }) => bones.pelvis?.[axis]).filter(Number.isFinite);
    return [axis, values.length ? { min: Math.min(...values), max: Math.max(...values), span: Math.max(...values) - Math.min(...values) } : null];
  })),
  rootWorldRange: Object.fromEntries(['x', 'y', 'z'].map((axis) => {
    const values = gaitSamples.map(({ bones }) => bones.root?.[axis]).filter(Number.isFinite);
    return [axis, values.length ? { min: Math.min(...values), max: Math.max(...values), span: Math.max(...values) - Math.min(...values) } : null];
  })),
  footHeightRange: Object.fromEntries(['L', 'R'].map((side) => {
    const values = gaitSamples.map(({ bones }) => bones[`foot${side}`]?.y).filter(Number.isFinite);
    return [side, values.length ? { min: Math.min(...values), max: Math.max(...values), span: Math.max(...values) - Math.min(...values) } : null];
  })),
  plantedFootAudit: {
    rightFootDuringFirstStance: {
      ankleHeight: range(rightPlantSamples.map(({ bones }) => bones.footR.y)),
      worldForwardDriftAtWalkSpeed: range(rightPlantWorldZ)
    },
    leftFootDuringSecondStance: {
      ankleHeight: range(leftPlantSamples.map(({ bones }) => bones.footL.y)),
      worldForwardDriftAtWalkSpeed: range(leftPlantWorldZ)
    }
  },
  sameSideArmLegCorrelation: Object.fromEntries(['L', 'R'].map((side) => [
    side,
    correlation(
      gaitSamples.map(({ bones }) => bones[`hand${side}`].z),
      gaitSamples.map(({ bones }) => bones[`foot${side}`].z)
    )
  ])),
  leftRightArmCorrelation: correlation(
    gaitSamples.map(({ bones }) => bones.handL.z),
    gaitSamples.map(({ bones }) => bones.handR.z)
  )
};
gaitAnalysis.passesOppositeArmSwing = Object.values(gaitAnalysis.sameSideArmLegCorrelation)
  .every((value) => Number.isFinite(value) && value < -0.25) &&
  Number.isFinite(gaitAnalysis.leftRightArmCorrelation) && gaitAnalysis.leftRightArmCorrelation < -0.25;
const audit = { baseUrl, clips, phases, gaitSamples, gaitAnalysis, output, pageErrors };
await fs.writeFile(path.join(output, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit, null, 2));
if (!gaitAnalysis.passesOppositeArmSwing) {
  throw new Error('Walk audit failed: each hand must oppose its same-side foot, and the hands must oppose each other.');
}
if (pageErrors.length) throw new Error(`Viewer browser errors: ${pageErrors.join('; ')}`);
