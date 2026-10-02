#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const sharp = require('sharp');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5180/threejs-character-viewer.html';
const output = path.resolve(process.env.CHARACTER_AUDIT_OUTPUT || 'screenshots/cangshan-character-viewer');
const auditView = process.env.CHARACTER_AUDIT_VIEW || 'side';
const auditModel = process.env.CHARACTER_AUDIT_MODEL || 'proportion-v2';
if (!['front', 'threequarter', 'side', 'back'].includes(auditView)) {
  throw new Error(`Unsupported CHARACTER_AUDIT_VIEW: ${auditView}`);
}
if (!['proportion-v2', 'pants', 'island-rig', 'island-rig-zelda', 'island-rig-zelda-review-v2', 'island-rig-zelda-review-v3', 'island-rig-zelda-review-v4', 'island-rig-zelda-review-v5', 'island-rig-zelda-review-v6', 'island-rig-zelda-review-v7', 'island-rig-zelda-review-v8', 'island-rig-zelda-review-v9', 'island-rig-zelda-review-v10', 'island-rig-zelda-review-v11', 'island-rig-zelda-review-v12', 'island-rig-zelda-review-v13', 'island-rig-zelda-review-v14', 'island-rig-zelda-review-v15', 'island-rig-zelda-review-v16', 'island-rig-zelda-review-v17', 'island-rig-zelda-review-v18', 'island-rig-zelda-review-v19'].includes(auditModel)) {
  throw new Error(`Unsupported CHARACTER_AUDIT_MODEL: ${auditModel}`);
}
const gameSource = await fs.readFile(path.resolve('threejs/game.js'), 'utf8');
const walkSpeedMatch = gameSource.match(/walkSpeed:\s*([0-9]*\.?[0-9]+)/);
if (!walkSpeedMatch) throw new Error('Could not read CONFIG.walkSpeed from threejs/game.js');
const gameWalkSpeedMps = Number(walkSpeedMatch[1]);
const walkReferenceMatch = gameSource.match(/walkCycleReferenceSpeed:\s*([0-9]*\.?[0-9]+)/);
if (!walkReferenceMatch) throw new Error('Could not read CONFIG.walkCycleReferenceSpeed from threejs/game.js');
const walkCycleReferenceSpeedMps = Number(walkReferenceMatch[1]);
const frameCount = Number(process.env.CHARACTER_AUDIT_FRAMES || 21);
if (!Number.isInteger(frameCount) || frameCount < 5 || frameCount > 42) {
  throw new Error(`CHARACTER_AUDIT_FRAMES must be an integer from 5 to 42, received ${frameCount}`);
}
const phases = Array.from({ length: frameCount }, (_, index) => index / frameCount);
const keyPoses = [
  { phase: 0.000, name: 'Contact · R' },
  { phase: 0.125, name: 'Down · R' },
  { phase: 0.250, name: 'Passing · R' },
  { phase: 0.375, name: 'Up · R' },
  { phase: 0.500, name: 'Contact · L' },
  { phase: 0.625, name: 'Down · L' },
  { phase: 0.750, name: 'Passing · L' },
  { phase: 0.875, name: 'Up · L' }
];
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
const auditUrl = new URL(baseUrl);
if (auditModel === 'pants' || auditModel === 'island-rig' || auditModel === 'island-rig-zelda' || auditModel === 'island-rig-zelda-review-v2' || auditModel === 'island-rig-zelda-review-v3' || auditModel === 'island-rig-zelda-review-v4' || auditModel === 'island-rig-zelda-review-v5' || auditModel === 'island-rig-zelda-review-v6' || auditModel === 'island-rig-zelda-review-v7' || auditModel === 'island-rig-zelda-review-v8' || auditModel === 'island-rig-zelda-review-v9' || auditModel === 'island-rig-zelda-review-v10' || auditModel === 'island-rig-zelda-review-v11' || auditModel === 'island-rig-zelda-review-v12' || auditModel === 'island-rig-zelda-review-v13' || auditModel === 'island-rig-zelda-review-v14' || auditModel === 'island-rig-zelda-review-v15' || auditModel === 'island-rig-zelda-review-v16' || auditModel === 'island-rig-zelda-review-v17' || auditModel === 'island-rig-zelda-review-v18' || auditModel === 'island-rig-zelda-review-v19') {
  auditUrl.searchParams.set('model', auditModel);
}
await page.goto(auditUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__characterViewer?.ready, null, { timeout: 60000 });
const clips = await page.evaluate(() => window.__characterViewer.clips);
await page.evaluate((view) => window.__characterViewer.setView(view), auditView);
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
  .composite(crops).png().toFile(path.join(output, `walk-cycle-contact-${phases.length}f-${auditView}.png`));

// Animator-style pose sheets use a clean canvas crop and explicit key poses.
const poseSheetViews = ['front', 'side', 'threequarter'];
const canvas = page.locator('#character-canvas');
await page.evaluate(() => window.__characterViewer.setGroundVisible(false));
await page.addStyleTag({ content: '.viewer-topbar,.control-panel,.reference-panel,.viewer-hint{display:none!important}' });
for (const view of poseSheetViews) {
  await page.evaluate((value) => window.__characterViewer.setView(value), view);
  await page.evaluate(() => window.__characterViewer.setCameraDistance(4.65));
  await page.waitForTimeout(180);
  const sheetTiles = [];
  for (let index = 0; index < keyPoses.length; index += 1) {
    const { phase, name } = keyPoses[index];
    await page.evaluate((value) => window.__characterViewer.setPhase(value), phase);
    await page.waitForTimeout(75);
    const rawPath = path.join(output, `keypose-${view}-${String(index + 1).padStart(2, '0')}.png`);
    await canvas.screenshot({ path: rawPath });
    const tile = await sharp(rawPath).extract({ left: 500, top: 0, width: 600, height: 900 })
      .resize({ width: 320, height: 480, fit: 'contain', background: '#111a20' }).png().toBuffer();
    const label = Buffer.from(`<svg width="320" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111820"/><text x="10" y="22" font-size="15" fill="#e4d2a2" font-family="Arial,sans-serif">${name} · ${(phase * 100).toFixed(1)}%</text></svg>`);
    const x = (index % 4) * 320;
    const y = Math.floor(index / 4) * 512;
    sheetTiles.push({ input: tile, left: x, top: y });
    sheetTiles.push({ input: label, left: x, top: y + 480 });
  }
  await sharp({ create: { width: 1280, height: 1024, channels: 4, background: '#0f151b' } })
    .composite(sheetTiles).png().toFile(path.join(output, `walk-keyposes-${view}.png`));
}
await page.evaluate((value) => window.__characterViewer.setView(value), 'side');
await page.evaluate(() => window.__characterViewer.setRigVisible(true));
await page.waitForTimeout(120);
const rigTiles = [];
for (let index = 0; index < keyPoses.length; index += 1) {
  const { phase, name } = keyPoses[index];
  await page.evaluate((value) => window.__characterViewer.setPhase(value), phase);
  await page.waitForTimeout(75);
  const rawPath = path.join(output, `keypose-side-rig-${String(index + 1).padStart(2, '0')}.png`);
  await canvas.screenshot({ path: rawPath });
  const tile = await sharp(rawPath).extract({ left: 500, top: 0, width: 600, height: 900 })
    .resize({ width: 320, height: 480, fit: 'contain', background: '#111a20' }).png().toBuffer();
  const label = Buffer.from(`<svg width="320" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111820"/><text x="10" y="22" font-size="15" fill="#70e5d4" font-family="Arial,sans-serif">RIG · ${name}</text></svg>`);
  const x = (index % 4) * 320;
  const y = Math.floor(index / 4) * 512;
  rigTiles.push({ input: tile, left: x, top: y });
  rigTiles.push({ input: label, left: x, top: y + 480 });
}
await sharp({ create: { width: 1280, height: 1024, channels: 4, background: '#0f151b' } })
  .composite(rigTiles).png().toFile(path.join(output, 'walk-keyposes-side-rig.png'));
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
const visiblePixelChange = async (firstPath, secondPath) => {
  const options = { left: 500, top: 0, width: 600, height: 900 };
  const [first, second] = await Promise.all([
    sharp(firstPath).extract(options).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(secondPath).extract(options).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  ]);
  let changed = 0;
  const channels = first.info.channels;
  for (let pixel = 0; pixel < first.info.width * first.info.height; pixel += 1) {
    const offset = pixel * channels;
    if (Math.max(
      Math.abs(first.data[offset] - second.data[offset]),
      Math.abs(first.data[offset + 1] - second.data[offset + 1]),
      Math.abs(first.data[offset + 2] - second.data[offset + 2])
    ) > 18) changed += 1;
  }
  return changed / (first.info.width * first.info.height);
};
const visibleSilhouetteChange = Object.fromEntries(await Promise.all(['front', 'side', 'threequarter'].map(async (view) => {
  const at = (index) => path.join(output, `keypose-${view}-${String(index + 1).padStart(2, '0')}.png`);
  return [view, {
    contactToPassing: await visiblePixelChange(at(0), at(2)),
    contactToOppositeContact: await visiblePixelChange(at(0), at(4))
  }];
})));
const angleDegrees = (a, b, c) => {
  const left = [a.x - b.x, a.y - b.y, a.z - b.z];
  const right = [c.x - b.x, c.y - b.y, c.z - b.z];
  const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
  const length = Math.hypot(...left) * Math.hypot(...right);
  return Math.acos(Math.max(-1, Math.min(1, dot / length))) * 180 / Math.PI;
};
const walkClipDuration = clips.find((clip) => clip.name === 'Walk')?.duration || 0;
const walkPlaybackRate = gameWalkSpeedMps / walkCycleReferenceSpeedMps;
const stepDistance = gameWalkSpeedMps * walkClipDuration / walkPlaybackRate;
const runtimeCycleSeconds = walkClipDuration / walkPlaybackRate;
const stepsPerMinute = 120 / runtimeCycleSeconds;
const firstSupportSide = gaitSamples[0].bones.footL.z >= gaitSamples[0].bones.footR.z ? 'L' : 'R';
const secondSupportSide = firstSupportSide === 'L' ? 'R' : 'L';
const firstPlantSamples = gaitSamples.filter(({ phase }) => phase <= 0.38);
const secondPlantSamples = gaitSamples.filter(({ phase }) => phase >= 0.52 && phase <= 0.88);
const firstPlantWorldZ = firstPlantSamples.map(({ phase, bones }) => bones[`foot${firstSupportSide}`].z + stepDistance * phase);
const secondPlantWorldZ = secondPlantSamples.map(({ phase, bones }) => bones[`foot${secondSupportSide}`].z + stepDistance * (phase - 0.5));
const gaitAnalysis = {
  model: auditModel,
  view: auditView,
  forwardAxis: 'z',
  assumedGameWalkSpeedMps: gameWalkSpeedMps,
  walkPlaybackRate,
  walkCycleReferenceSpeedMps,
  runtimeCycleSeconds,
  stepsPerMinute,
  stepLengthAtGameSpeedM: gameWalkSpeedMps * runtimeCycleSeconds / 2,
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
  plantedFootAudit: Object.fromEntries([
    [`${firstSupportSide}FootDuringFirstStance`, {
      ankleHeight: range(firstPlantSamples.map(({ bones }) => bones[`foot${firstSupportSide}`].y)),
      worldForwardDriftAtWalkSpeed: range(firstPlantWorldZ)
    }],
    [`${secondSupportSide}FootDuringSecondStance`, {
      ankleHeight: range(secondPlantSamples.map(({ bones }) => bones[`foot${secondSupportSide}`].y)),
      worldForwardDriftAtWalkSpeed: range(secondPlantWorldZ)
    }]
  ]),
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
  ),
  kneeAngleDegrees: Object.fromEntries(['L', 'R'].map((side) => [side,
    range(gaitSamples.map(({ bones }) => angleDegrees(bones[`thigh${side}`], bones[`shin${side}`], bones[`foot${side}`])))
  ])),
  footLateralSeparationM: range(gaitSamples.map(({ bones }) => bones.footL.x - bones.footR.x)),
  handLateralSeparationM: range(gaitSamples.map(({ bones }) => bones.handL.x - bones.handR.x)),
  visibleSilhouetteChange,
  handForwardTravelM: Object.fromEntries(['L', 'R'].map((side) => [side,
    range(gaitSamples.map(({ bones }) => bones[`hand${side}`].z))
  ]))
};
gaitAnalysis.passesOppositeArmSwing = Object.values(gaitAnalysis.sameSideArmLegCorrelation)
  .every((value) => Number.isFinite(value) && value < -0.25) &&
  Number.isFinite(gaitAnalysis.leftRightArmCorrelation) && gaitAnalysis.leftRightArmCorrelation < -0.25;
const audit = { baseUrl, clips, phases, gaitSamples, gaitAnalysis, output, pageErrors };
await fs.writeFile(path.join(output, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({
  output,
  model: auditModel,
  framesSampled: phases.length,
  keyPoseViews: [...poseSheetViews, 'side-rig'],
  gaitAnalysis,
  pageErrors
}, null, 2));
if (!gaitAnalysis.passesOppositeArmSwing) {
  throw new Error('Walk audit failed: each hand must oppose its same-side foot, and the hands must oppose each other.');
}
if (gaitAnalysis.stepsPerMinute > 165 || gaitAnalysis.stepsPerMinute < 95) {
  throw new Error(`Walk audit failed: gait cadence ${gaitAnalysis.stepsPerMinute.toFixed(1)} steps/min is outside the 95-165 brisk-walk review range.`);
}
const stanceFootDrifts = Object.values(gaitAnalysis.plantedFootAudit)
  .map((stance) => stance.worldForwardDriftAtWalkSpeed.span);
if (stanceFootDrifts.some((drift) => drift > 0.03)) {
  throw new Error(`Walk audit failed: stance foot drift exceeds 3 cm (${stanceFootDrifts.map((drift) => drift.toFixed(3)).join(', ')}).`);
}
if (gaitAnalysis.footLateralSeparationM.min < 0.20) {
  throw new Error(`Walk audit failed: the left and right feet cross or lose their lateral spacing (${gaitAnalysis.footLateralSeparationM.min.toFixed(3)} m).`);
}
if (gaitAnalysis.footLateralSeparationM.max > 0.27) {
  throw new Error(`Walk audit failed: the stance is too wide (${gaitAnalysis.footLateralSeparationM.max.toFixed(3)} m); review for a crab-like gait.`);
}
if (gaitAnalysis.handLateralSeparationM.max > 0.78) {
  throw new Error(`Walk audit failed: the relaxed arm spread remains too wide (${gaitAnalysis.handLateralSeparationM.max.toFixed(3)} m).`);
}
if (gaitAnalysis.visibleSilhouetteChange.side.contactToPassing < 0.005) {
  throw new Error(`Walk audit failed: the side-view mesh barely changes between contact and passing (${(gaitAnalysis.visibleSilhouetteChange.side.contactToPassing * 100).toFixed(2)}% pixels).`);
}
if (pageErrors.length) throw new Error(`Viewer browser errors: ${pageErrors.join('; ')}`);
