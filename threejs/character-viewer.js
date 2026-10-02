import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#character-canvas');
const status = document.querySelector('#model-status');
const detail = document.querySelector('#model-detail');
const clipList = document.querySelector('#clip-list');
const frameLabel = document.querySelector('#frame-label');
const timeline = document.querySelector('#timeline');
const speedInput = document.querySelector('#speed');
const speedLabel = document.querySelector('#speed-label');
const playToggle = document.querySelector('#play-toggle');
const errorLabel = document.querySelector('#viewer-error');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#151f27');
const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(2.55, 2.22, 4.85);
scene.add(new THREE.HemisphereLight('#e0d2b0', '#26323c', 2.2));
const key = new THREE.DirectionalLight('#f0d9a7', 3.1);
key.position.set(-2, 4.5, 3.5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);
const rim = new THREE.DirectionalLight('#829cad', 2.0);
rim.position.set(2.5, 3.0, -3.0);
scene.add(rim);

const floorMaterial = new THREE.MeshStandardMaterial({ color: '#303b40', roughness: 0.9 });
const floor = new THREE.Mesh(new THREE.CircleGeometry(5.4, 64), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.035;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(10, 20, '#70654d', '#3b4749');
grid.position.y = -0.025;
grid.material.transparent = true;
grid.material.opacity = 0.35;
scene.add(grid);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.94, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 2.25;
controls.maxDistance = 7.5;
controls.minPolarAngle = 0.2;
controls.maxPolarAngle = Math.PI * 0.49;

const clock = new THREE.Clock();
let mixer = null;
let model = null;
let clipActions = new Map();
let currentAction = null;
let currentClip = null;
let paused = false;
let playbackRate = Number(speedInput.value);
let actualModelHeight = 2.18;
let skeletonHelper = null;

function updateFrameLabel() {
  if (!currentClip || !currentAction) return;
  const duration = Math.max(currentClip.duration, 0.001);
  const fraction = THREE.MathUtils.clamp(currentAction.time / duration, 0, 1);
  timeline.value = String(Math.round(fraction * Number(timeline.max)));
  const total = Math.max(1, Math.round(duration * 24));
  const frame = Math.min(total, Math.round(fraction * total) + 1);
  frameLabel.textContent = `帧 ${frame} / ${total}`;
}

function selectClip(clip) {
  currentClip = clip;
  const next = clipActions.get(clip.name);
  if (!next) return;
  if (currentAction && currentAction !== next) currentAction.fadeOut(0.14);
  next.reset();
  next.enabled = true;
  next.setEffectiveTimeScale(playbackRate);
  next.setEffectiveWeight(1);
  next.setLoop(['Idle', 'Walk', 'Run'].includes(clip.name) ? THREE.LoopRepeat : THREE.LoopOnce,
    ['Idle', 'Walk', 'Run'].includes(clip.name) ? Infinity : 1);
  next.clampWhenFinished = true;
  if (paused) next.paused = true;
  next.fadeIn(0.14).play();
  currentAction = next;
  clipList.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.clip === clip.name);
  });
  timeline.value = '0';
  updateFrameLabel();
}

function labelForClip(name) {
  return ({ Idle: '站立', Walk: '走路', Run: '奔跑', Jump: '跳跃', Attack: '出招' })[name] || name;
}

function setView(view) {
  const target = controls.target.clone();
  const distance = camera.position.distanceTo(target);
  const positions = {
    front: [0, 0.06, 1],
    threequarter: [0.47, 0.17, 0.87],
    side: [1, 0.08, 0],
    back: [0, 0.07, -1]
  };
  const direction = new THREE.Vector3(...(positions[view] || positions.threequarter)).normalize();
  camera.position.copy(target).add(direction.multiplyScalar(distance));
  controls.update();
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('selected', button.dataset.view === view));
}

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
const rigToggle = document.querySelector('#rig-toggle');
rigToggle.addEventListener('click', () => {
  const visible = !skeletonHelper?.visible;
  if (skeletonHelper) skeletonHelper.visible = visible;
  rigToggle.setAttribute('aria-pressed', String(visible));
  rigToggle.textContent = visible ? '隐藏骨骼结构' : '显示骨骼结构';
});
playToggle.addEventListener('click', () => {
  paused = !paused;
  if (currentAction) currentAction.paused = paused;
  playToggle.textContent = paused ? '▶ 播放' : '❚❚ 暂停';
});
speedInput.addEventListener('input', () => {
  playbackRate = Number(speedInput.value);
  speedLabel.textContent = `${playbackRate.toFixed(1)}×`;
  if (currentAction) currentAction.setEffectiveTimeScale(playbackRate);
});
timeline.addEventListener('input', () => {
  if (!currentAction || !currentClip) return;
  paused = true;
  currentAction.paused = false;
  currentAction.time = (Number(timeline.value) / Number(timeline.max)) * currentClip.duration;
  mixer.update(0);
  currentAction.paused = true;
  playToggle.textContent = '▶ 播放';
  updateFrameLabel();
});

const loader = new GLTFLoader();
const requestedModel = new URLSearchParams(window.location.search).get('model');
const characterAsset = requestedModel === 'pants'
  ? './assets/generated/threejs-wuxia/models/shen-linchuan-pants-game-ready.glb'
  : requestedModel === 'island-rig-zelda'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-prototype-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v2'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v2-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v3'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v3-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v4'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v4-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v5'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v5-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v6'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v6-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v7'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v7-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v8'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v8-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v9'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v9-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v10'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v10-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v11'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v11-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v12'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v12-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v13'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v13-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v14'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v14-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v15'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v15-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v16'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v16-game-ready.glb'
  : requestedModel === 'island-rig-zelda-review-v17'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v17-game-ready.glb'
  : requestedModel === 'island-rig'
    ? './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-prototype-game-ready.glb'
  : './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-game-ready.glb';
loader.load(characterAsset, (gltf) => {
  model = gltf.scene;
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (object.material) object.material.side = THREE.DoubleSide;
  });
  let bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  actualModelHeight = size.y || 2.18;
  const scale = 2.18 / actualModelHeight;
  model.scale.setScalar(scale);
  bounds = new THREE.Box3().setFromObject(model);
  model.position.y -= bounds.min.y;
  scene.add(model);
  skeletonHelper = new THREE.SkeletonHelper(model);
  skeletonHelper.material = new THREE.LineBasicMaterial({
    color: '#65e7d0',
    depthTest: false,
    transparent: true,
    opacity: 0.92
  });
  skeletonHelper.visible = false;
  skeletonHelper.renderOrder = 10;
  scene.add(skeletonHelper);
  mixer = new THREE.AnimationMixer(model);
  for (const clip of gltf.animations) {
    clipActions.set(clip.name, mixer.clipAction(clip));
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.clip = clip.name;
    button.className = 'clip-button';
    button.textContent = labelForClip(clip.name);
    button.addEventListener('click', () => selectClip(clip));
    clipList.append(button);
  }
  document.querySelector('#clip-count').textContent = `${gltf.animations.length} 段`;
  const walk = gltf.animations.find((clip) => clip.name === 'Walk') || gltf.animations[0];
  if (walk) selectClip(walk);
  status.textContent = requestedModel === 'pants' ? '独立裤腿 GLB 已载入'
    : requestedModel === 'island-rig-zelda-review-v17' ? '落地重心压缩与膝轴修正版 v17 已载入'
    : requestedModel === 'island-rig-zelda-review-v16' ? '按真实关节枢轴求解步态 v16 已载入'
    : requestedModel === 'island-rig-zelda-review-v15' ? '前弯膝轴与自然步幅 v15 已载入'
    : requestedModel === 'island-rig-zelda-review-v14' ? '膝盖前弯 IK 修正版 v14 已载入'
    : requestedModel === 'island-rig-zelda-review-v13' ? '髋下起腿与收敛重心步态 v13 已载入'
    : requestedModel === 'island-rig-zelda-review-v12' ? '胯下髋轴与闭合肩袖修正版 v12 已载入'
    : requestedModel === 'island-rig-zelda-review-v11' ? '髋关节与肩袖分区修正版 v11 已载入'
    : requestedModel === 'island-rig-zelda-review-v10' ? '骨架深度校准修正版 v10 已载入'
    : requestedModel === 'island-rig-zelda-review-v9' ? '肩袖连续性与胳膊摆幅修正版 v9 已载入'
    : requestedModel === 'island-rig-zelda-review-v8' ? '髋肩连续蒙皮修正版 v8 已载入'
    : requestedModel === 'island-rig-zelda-review-v7' ? '髋肩解剖边界修正版 v7 已载入'
    : requestedModel === 'island-rig-zelda-review-v6' ? '髋肩绑定修正版 v6 已载入'
    : requestedModel === 'island-rig-zelda-review-v5' ? '步态修正版 v5 已载入'
    : requestedModel === 'island-rig-zelda-review-v4' ? '步态修正版 v4 已载入'
    : requestedModel === 'island-rig-zelda-review-v3' ? '步态修正版 v3 已载入'
    : requestedModel === 'island-rig-zelda-review-v2' ? '步态修正版 v2 已载入'
    : requestedModel === 'island-rig-zelda' ? 'Zelda 骨骼节奏绑定原型已载入'
    : requestedModel === 'island-rig' ? '网格连通岛骨骼绑定原型已载入'
      : '混元比例修正版 GLB 已载入';
  detail.textContent = `${gltf.animations.length} 个动作 · 模型高 ${actualModelHeight.toFixed(2)} m · 可拖时间轴逐相位检查`;
  window.__characterViewer = {
    ready: true,
    clips: gltf.animations.map((clip) => ({ name: clip.name, duration: clip.duration })),
    setGroundVisible: (enabled) => { floor.visible = Boolean(enabled); grid.visible = Boolean(enabled); },
    setRigVisible: (enabled) => {
      if (skeletonHelper) skeletonHelper.visible = Boolean(enabled);
      rigToggle.setAttribute('aria-pressed', String(Boolean(enabled)));
      rigToggle.textContent = enabled ? '隐藏骨骼结构' : '显示骨骼结构';
    },
    setCameraDistance: (distance) => {
      const target = controls.target.clone();
      const direction = camera.position.clone().sub(target).normalize();
      camera.position.copy(target).add(direction.multiplyScalar(THREE.MathUtils.clamp(distance, controls.minDistance, controls.maxDistance)));
      controls.update();
    },
    setClip: (name) => { const clip = gltf.animations.find((item) => item.name === name); if (clip) selectClip(clip); },
    setView,
    setPhase: (phase) => { timeline.value = String(Math.round(THREE.MathUtils.clamp(phase, 0, 1) * Number(timeline.max))); timeline.dispatchEvent(new Event('input')); },
    sampleBones: () => {
      model.updateMatrixWorld(true);
      const samples = {};
      model.traverse((bone) => {
        if (!bone.isBone) return;
        const position = bone.getWorldPosition(new THREE.Vector3());
        const quaternion = bone.quaternion;
        samples[bone.name] = {
          x: position.x, y: position.y, z: position.z,
          qx: quaternion.x, qy: quaternion.y, qz: quaternion.z, qw: quaternion.w
        };
      });
      return samples;
    },
    getState: () => ({ clip: currentClip?.name || null, phase: currentAction && currentClip ? currentAction.time / currentClip.duration : 0, paused })
  };
}, undefined, (error) => {
  console.error('Failed to load proportion-v2 character model', error);
  status.textContent = '比例修正版角色模型尚未生成';
  detail.textContent = '先运行 npm run 3d:character:build:v2';
  errorLabel.hidden = false;
  errorLabel.textContent = '请先生成比例修正版 GLB';
});

function render() {
  requestAnimationFrame(render);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (mixer) mixer.update(delta);
  if (skeletonHelper?.visible) skeletonHelper.updateMatrixWorld(true);
  controls.update();
  updateFrameLabel();
  renderer.render(scene, camera);
}
render();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
});
