#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const sharp = require('sharp');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5180/threejs-character-viewer.html';
const output = path.resolve(process.env.CHARACTER_AUDIT_OUTPUT || 'screenshots/cangshan-character-viewer');
const phases = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
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
  const name = `walk-phase-${String(index + 1).padStart(2, '0')}.png`;
  await page.evaluate((value) => window.__characterViewer.setPhase(value), phase);
  await page.waitForTimeout(100);
  gaitSamples.push({ phase, bones: await page.evaluate(() => window.__characterViewer.sampleBones()) });
  const file = path.join(output, name);
  await page.screenshot({ path: file });
  const thumbnail = await sharp(file).extract({ left: 320, top: 74, width: 1000, height: 780 })
    .resize({ width: 360, height: 281, fit: 'cover' }).png().toBuffer();
  const label = Buffer.from(`<svg width="360" height="30" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111820"/><text x="12" y="20" font-size="13" fill="#e4d2a2" font-family="Arial,sans-serif">Walk phase ${index + 1} · ${(phase * 100).toFixed(0)}%</text></svg>`);
  const x = (index % 4) * 360;
  const y = Math.floor(index / 4) * 311;
  crops.push({ input: thumbnail, left: x, top: y });
  crops.push({ input: label, left: x, top: y + 281 });
}
await sharp({ create: { width: 1440, height: 622, channels: 4, background: '#0f151b' } })
  .composite(crops).png().toFile(path.join(output, 'walk-cycle-contact.png'));
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
const gaitAnalysis = {
  forwardAxis: 'z',
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
