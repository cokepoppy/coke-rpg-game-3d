import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CONFIG = {
  // Spread the source map layout horizontally while keeping actors/buildings at
  // human scale. This leaves landmarks in their original relative map positions.
  mapWidth: 70.4,
  mapDepth: 56.32,
  globalMapWidth: 4480,
  globalMapHeight: 3584,
  walkSpeed: 1.35,
  walkCycleReferenceSpeed: 1.2,
  runSpeed: 3.8,
  assets: {
    overview: './wechat-minigame/world-map-pack/world-map.png',
    world: './assets/generated/threejs-wuxia/world/cangshan-world.glb',
    inn: './assets/generated/threejs-wuxia/models/yunlai-inn-game-ready.glb',
    autumnMaple: './assets/generated/threejs-wuxia/models/autumn-maple-game-ready.glb',
    paifang: './assets/generated/threejs-wuxia/models/cangshan-paifang-game-ready.glb',
    pharmacy: './assets/generated/threejs-wuxia/models/hundred-herbs-pharmacy-game-ready.glb',
    innInterior: './assets/generated/threejs-wuxia/world/cangshan-inn-interior.glb',
    hero: './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-game-ready.glb',
    heroine: './assets/generated/threejs-wuxia/models/su-luo-game-ready.glb'
  }
};
const query = new URLSearchParams(location.search);
const HERO_RIG_VARIANT = query.get('hero');
if (HERO_RIG_VARIANT === 'island-rig-zelda') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-prototype-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v2') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v2-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v3') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v3-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v4') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v4-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v5') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v5-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v6') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v6-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v7') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v7-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v8') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v8-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v9') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v9-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v10') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v10-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v11') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v11-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v12') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v12-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v13') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v13-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v14') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v14-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v15') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v15-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v16') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v16-game-ready.glb';
} else if (HERO_RIG_VARIANT === 'island-rig-zelda-review-v17') {
  CONFIG.assets.hero = './assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v17-game-ready.glb';
}
const DEMO_MODE = query.get('demo') === '1';
const MAP_METERS_PER_PIXEL = CONFIG.mapWidth / CONFIG.globalMapWidth;

const canvas = document.querySelector('#world-canvas');
const loadingScreen = document.querySelector('#loading-screen');
const dialogPanel = document.querySelector('#dialog-panel');
const dialogSpeaker = document.querySelector('#dialog-speaker');
const dialogText = document.querySelector('#dialog-text');
const dialogPortrait = document.querySelector('#dialog-portrait');
const interactionPrompt = document.querySelector('#interaction-prompt');
const interactionLabel = document.querySelector('#interaction-label');
const toast = document.querySelector('#toast');
const modelStatus = document.querySelector('#model-status');
const questTitle = document.querySelector('#quest-title');
const questDescription = document.querySelector('#quest-description');
const questProgress = document.querySelector('#quest-progress-label');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#111914');
scene.fog = new THREE.FogExp2('#1c2019', 0.006);
// The source map uses a nearly fixed 2.5D projection. Orthographic framing
// keeps house/tree scale consistent across the frame while showing real height.
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 170);
camera.aspect = window.innerWidth / window.innerHeight;
camera.position.set(0, 10, -12);

scene.add(new THREE.HemisphereLight('#d6c49a', '#24271b', 1.45));
const moonLight = new THREE.DirectionalLight('#e0bd80', 1.9);
moonLight.position.set(-13, 24, -7);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.left = -32;
moonLight.shadow.camera.right = 32;
moonLight.shadow.camera.top = 32;
moonLight.shadow.camera.bottom = -32;
moonLight.shadow.bias = -0.00035;
moonLight.shadow.radius = 3;
scene.add(moonLight);

const worldRoot = new THREE.Group();
const roomRoot = new THREE.Group();
scene.add(worldRoot, roomRoot);
roomRoot.visible = false;

const gltfLoader = new GLTFLoader();
const actors = [];
const worldInteractables = [];
let roomInteractables = [];
let player;
let heroine;
let activeInteractable = null;
let dialogue = null;
let dialogueIndex = 0;
let isInRoom = false;
let previousWorldPosition = null;
let storyFlags = readStoryFlags();
let yaw = 0;
let pitch = 0.96;
let cameraDistance = 24.0;
let demoCameraOffsetX = 0;
function updateCameraProjection() {
  const halfHeight = cameraDistance * Math.tan(THREE.MathUtils.degToRad(44 * 0.5));
  const halfWidth = halfHeight * camera.aspect;
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}
updateCameraProjection();
let cameraDrag = null;
let toastTimer = 0;
let openingWasShown = false;
let scriptedMove = null;

// Measured in pixels on the stitched 4480 x 3584 source map. Keep scene
// objects anchored to visible landmarks in world-west.png/world-east.png;
// the older quest trigger coordinates were not the same as this map artwork.
const MAP_LANDMARKS = {
  spawn: [2700, 2520],
  inn: [3970, 2730],
  innDoor: [3970, 2900],
  autumnMaple: [4100, 2390],
  paifang: [2040, 2700],
  pharmacy: [3110, 2300],
  vendor: [3090, 2910],
  companion: [2840, 2580],
};

const WORLD_OBSTACLES = [
  { x: 1680, y: 80, width: 720, height: 850 },       // west-panel temple
  { x: 2925, y: 2110, width: 370, height: 330 },    // east-panel pharmacy shell
  { x: 2850, y: 2530, width: 480, height: 320 },    // market stall, with the vendor approach clear
  { x: 3810, y: 2585, width: 320, height: 265 },    // Hunyuan inn footprint; south entrance remains clear
  { x: 4072, y: 2370, width: 56, height: 40 },      // maple trunk; canopy stays walk-through
  { x: 1916, y: 2673, width: 48, height: 55 },      // west paifang pillar and stone base
  { x: 2116, y: 2673, width: 48, height: 55 },      // east paifang pillar and stone base
];

const keys = new Set();
const clock = new THREE.Clock();

function mapPoint(mapX, mapY) {
  return {
    // The follow camera looks north from behind the player, so screen-right
    // is world -X. Reverse X here to keep east/west matching the source image.
    x: (CONFIG.globalMapWidth / 2 - mapX) * MAP_METERS_PER_PIXEL,
    z: (CONFIG.globalMapHeight / 2 - mapY) * MAP_METERS_PER_PIXEL
  };
}

function mapLandmark(name) {
  const [mapX, mapY] = MAP_LANDMARKS[name];
  return mapPoint(mapX, mapY);
}

const COMPANION_OFFSET = (() => {
  const spawn = mapLandmark('spawn');
  const companion = mapLandmark('companion');
  return { x: companion.x - spawn.x, z: companion.z - spawn.z };
})();

function roomPoint(pixelX, pixelY) {
  return { x: 6.4 - pixelX / 100, z: 3.84 - pixelY / 100 };
}

function readStoryFlags() {
  try { return JSON.parse(localStorage.getItem('cangshan3d-story') || '{}'); }
  catch { return {}; }
}

function saveStoryFlags() {
  if (DEMO_MODE) return;
  localStorage.setItem('cangshan3d-story', JSON.stringify(storyFlags));
}

function mat(color, roughness = 0.82, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}

const materials = {
  stone: mat('#404b48'), stoneLit: mat('#687068'), darkStone: mat('#273331'),
  wood: mat('#614632'), woodLight: mat('#866243'), roof: mat('#29262a'), roofLight: mat('#484044'),
  grass: mat('#476447'), leaf: mat('#536c4d'), leafLight: mat('#738053'), red: mat('#8e3e2d'),
  robeBlue: mat('#29425a'), robeTeal: mat('#397973'), ivory: mat('#e2d8bd'), leather: mat('#79583a'),
  jade: mat('#77a78d', 0.4, { metalness: 0.12, emissive: '#112c24', emissiveIntensity: 0.35 }),
  water: mat('#315e65', 0.28, { metalness: 0.12 }), lantern: mat('#f2be69', 0.45, { emissive: '#ffb84e', emissiveIntensity: 1.7 }),
  dark: mat('#1e2325'), skin: mat('#dfb98e'), hair: mat('#211f24'),
  npcBrown: mat('#675440'), vendor: mat('#81704a'), scout: mat('#44363a'), white: mat('#e3dccb'),
  medicine: mat('#c39958'),
};

function addMesh(parent, geometry, material, position, scale) {
  const mesh = new THREE.Mesh(geometry, material);
  if (position) mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
  if (scale) mesh.scale.set(scale.x || 1, scale.y || 1, scale.z || 1);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(parent, size, material, position, rotationY = 0) {
  const mesh = addMesh(parent, new THREE.BoxGeometry(...size), material, position);
  mesh.rotation.y = rotationY;
  return mesh;
}

function addCylinder(parent, top, bottom, height, material, position, sides = 8) {
  return addMesh(parent, new THREE.CylinderGeometry(top, bottom, height, sides), material, position);
}

function makeLabel(text, accent = '#e6d3a1') {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 384;
  labelCanvas.height = 96;
  const ctx = labelCanvas.getContext('2d');
  ctx.fillStyle = 'rgba(13,20,22,.72)';
  ctx.beginPath();
  ctx.roundRect(8, 14, 368, 68, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(214,187,131,.42)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '500 31px serif';
  ctx.fillText(text, 192, 49);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(1.62, 0.41, 1);
  sprite.position.y = 2.55;
  return sprite;
}

function loadEnvironmentModel(url, parent) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, ({ scene: model }) => {
      model.name = url.split('/').pop();
      model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        if (Array.isArray(object.material)) object.material.forEach((material) => { material.side = THREE.DoubleSide; });
        else if (object.material) object.material.side = THREE.DoubleSide;
      });
      parent.add(model);
      resolve(model);
    }, undefined, reject);
  });
}

function createWorldEnvironment() {
  return Promise.all([
    loadEnvironmentModel(CONFIG.assets.world, worldRoot),
    loadEnvironmentModel(CONFIG.assets.inn, worldRoot),
    loadEnvironmentModel(CONFIG.assets.autumnMaple, worldRoot),
    loadEnvironmentModel(CONFIG.assets.paifang, worldRoot),
    loadEnvironmentModel(CONFIG.assets.pharmacy, worldRoot),
  ]).then(([, inn, maple, paifang, pharmacy]) => {
    const innAnchor = mapLandmark('inn');
    inn.position.set(innAnchor.x, 0.025, innAnchor.z);
    const mapleAnchor = mapLandmark('autumnMaple');
    maple.position.set(mapleAnchor.x, 0.025, mapleAnchor.z);
    const paifangAnchor = mapLandmark('paifang');
    paifang.position.set(paifangAnchor.x, 0.025, paifangAnchor.z);
    const pharmacyAnchor = mapLandmark('pharmacy');
    pharmacy.position.set(pharmacyAnchor.x, 0.025, pharmacyAnchor.z);
  });
}

function makePivotLimb(parent, { position, color, length, radius, sleeve = false, foot = false }) {
  const pivot = new THREE.Group();
  pivot.position.set(position.x, position.y, position.z);
  const limb = addCylinder(pivot, radius * 0.9, radius, length, color, { y: -length / 2 }, 8);
  limb.rotation.z = sleeve ? 0.05 : 0;
  if (foot) addBox(pivot, [radius * 2.1, radius * 1.2, radius * 2.8], materials.dark, { y: -length + 0.08, z: 0.09 });
  parent.add(pivot);
  return pivot;
}

function createFallbackBody({ female = false, color, name }) {
  const group = new THREE.Group();
  const robe = female ? materials.robeTeal : materials.robeBlue;
  const robeColor = color ? mat(color) : robe;
  const body = addCylinder(group, 0.38, female ? 0.56 : 0.47, 1.02, robeColor, { y: 0.9 }, 9);
  body.scale.z = 0.78;
  addCylinder(group, 0.43, 0.45, 0.14, materials.leather, { y: 0.66 }, 9);
  addCylinder(group, 0.22, 0.26, 0.16, materials.ivory, { y: 1.41 }, 9);
  const head = addMesh(group, new THREE.SphereGeometry(0.34, 16, 12), materials.skin, { y: 1.72, z: 0.015 });
  head.scale.set(0.9, 1.05, 0.87);
  addMesh(group, new THREE.SphereGeometry(0.355, 16, 12), materials.hair, { y: 1.91, z: -0.055 }).scale.set(0.98, 0.62, 0.92);
  addMesh(group, new THREE.SphereGeometry(0.125, 12, 10), materials.hair, { y: 2.17, z: -0.1 });
  addBox(group, [0.055, 0.22, 0.055], materials.ivory, { x: 0.11, y: 2.17, z: -0.05 });
  for (const side of [-1, 1]) {
    addMesh(group, new THREE.SphereGeometry(0.045, 8, 8), materials.dark, { x: side * 0.12, y: 1.76, z: 0.293 });
    addMesh(group, new THREE.SphereGeometry(0.055, 8, 8), materials.hair, { x: side * 0.305, y: 1.72, z: 0.02 });
  }
  addBox(group, [0.09, 0.028, 0.026], materials.red, { y: 1.58, z: 0.296 });
  const sash = addMesh(group, new THREE.BoxGeometry(0.13, 0.9, 0.1), materials.ivory, { x: -0.08, y: 1.0, z: 0.366 });
  sash.rotation.z = -0.46;
  addMesh(group, new THREE.SphereGeometry(0.095, 10, 8), materials.jade, { x: 0.17, y: 0.48, z: 0.36 });

  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    arms.push(makePivotLimb(group, { position: { x: side * 0.42, y: 1.3, z: 0 }, color: female ? materials.ivory : robeColor, length: 0.72, radius: 0.18, sleeve: true }));
    legs.push(makePivotLimb(group, { position: { x: side * 0.19, y: 0.46, z: 0 }, color: materials.dark, length: 0.49, radius: 0.15, foot: true }));
  }
  if (female) {
    addMesh(group, new THREE.SphereGeometry(0.055, 8, 8), materials.jade, { x: 0.28, y: 2.13, z: 0.02 });
    addBox(group, [0.28, 0.29, 0.16], materials.leather, { x: 0.43, y: 0.66, z: 0.12 });
    addMesh(group, new THREE.CylinderGeometry(0.035, 0.045, 0.78, 8), materials.hair, { x: -0.04, y: 1.62, z: -0.27 }).rotation.x = 0.16;
  }
  group.userData = { arms, legs, name, fallback: true };
  return group;
}

function fitModel(gltf, targetHeight = 2.18) {
  const model = gltf.scene;
  model.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) {
        node.material.roughness = Math.max(node.material.roughness ?? 0.6, 0.52);
      }
    }
  });
  let bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.01);
  model.scale.setScalar(scale);
  bounds = new THREE.Box3().setFromObject(model);
  model.position.y -= bounds.min.y;
  return model;
}

function loadCharacterAsset(actor, url, label) {
  gltfLoader.load(url, (gltf) => {
    const model = fitModel(gltf);
    actor.fallbackRoot.visible = false;
    actor.root.add(model);
    actor.model = model;
    actor.mixer = gltf.animations.length ? new THREE.AnimationMixer(model) : null;
    actor.clips = gltf.animations;
    actor.actions = new Map();
    for (const clip of gltf.animations) {
      const action = actor.mixer.clipAction(clip);
      action.enabled = true;
      actor.actions.set(clip.name.toLowerCase(), action);
    }
    actor.assetLoaded = true;
    actor.motion = '';
    actor.setMotion('idle');
    updateModelStatus();
    if (label) showToast(actor.isPlayer ? '沈临川的裤装 3D 角色已载入' : `${actor.name}的 3D 模型已载入`);
  }, undefined, () => {
    actor.assetLoaded = false;
    updateModelStatus();
  });
}

function setAction(actor, desired) {
  if (!actor.actions?.size) return;
  const aliases = {
    idle: ['idle', 'standing', 'mixamo.com'],
    walk: ['walk', 'walking', 'run'],
    run: ['run', 'walking', 'walk'],
    jump: ['jump', 'idle'],
    attack: ['attack', 'slash', 'idle']
  };
  const candidates = aliases[desired] || [desired];
  const next = candidates.map((candidate) => actor.actions.get(candidate)).find(Boolean);
  if (!next || next === actor.currentAction) return;
  next.setEffectiveTimeScale(desired === 'walk'
    ? CONFIG.walkSpeed / CONFIG.walkCycleReferenceSpeed
    : 1);
  next.reset().fadeIn(0.18).play();
  actor.currentAction?.fadeOut(0.15);
  actor.currentAction = next;
}

function makeActor({ name, position, female = false, npcColor, assetUrl, isPlayer = false, accent = '#dfc17f' }) {
  const root = new THREE.Group();
  root.position.set(position.x, 0, position.z);
  const fallbackRoot = createFallbackBody({ female, color: npcColor, name });
  root.add(fallbackRoot);
  const label = makeLabel(name, accent);
  root.add(label);
  (isPlayer ? worldRoot : worldRoot).add(root);
  const actor = {
    name, root, fallbackRoot, label, female, isPlayer, mixer: null, actions: null, currentAction: null,
      motion: 'idle', moving: false, running: false, jumpVelocity: 0, jumpHeight: 0, attackRemaining: 0,
    assetLoaded: false, baseY: 0.05, previousMotion: '',
    setMotion(motion) {
      if (this.motion === motion) return;
      this.motion = motion;
      setAction(this, motion);
    },
    update(delta, time) {
      if (this.mixer) this.mixer.update(delta);
      this.root.position.y = this.baseY + this.jumpHeight + (this.moving ? 0 : Math.sin(time * 2.1 + position.x) * 0.018);
      const nearPlayer = player && Math.hypot(this.root.position.x - player.root.position.x, this.root.position.z - player.root.position.z) < 2.8;
      this.label.visible = !isInRoom && (this.isPlayer || this === heroine || nearPlayer);
      if (this.fallbackRoot.visible) {
        const { arms = [], legs = [] } = this.fallbackRoot.userData;
        const stride = this.moving ? Math.sin(time * (this.running ? 13 : 9)) * (this.running ? 0.72 : 0.48) : Math.sin(time * 1.7 + position.z) * 0.045;
        arms.forEach((arm, index) => {
          arm.rotation.x = this.attackRemaining > 0 && index === 1 ? -1.05 + Math.sin(time * 34) * 0.22 : (index === 0 ? stride : -stride);
          arm.rotation.z = this.attackRemaining > 0 && index === 1 ? -0.42 : 0;
        });
        legs.forEach((leg, index) => { leg.rotation.x = index === 0 ? -stride : stride; });
        this.fallbackRoot.rotation.x = this.moving ? -0.05 : Math.sin(time * 1.9) * 0.018;
      }
      if (this.attackRemaining > 0) {
        this.attackRemaining = Math.max(0, this.attackRemaining - delta);
        if (!this.attackRemaining) this.setMotion(this.moving ? (this.running ? 'run' : 'walk') : 'idle');
      }
      if (this.jumpVelocity !== 0 || this.jumpHeight > 0) {
        this.jumpVelocity -= 18 * delta;
        this.jumpHeight = Math.max(0, this.jumpHeight + this.jumpVelocity * delta);
        if (this.jumpHeight === 0) {
          this.jumpVelocity = 0;
          this.setMotion(this.moving ? (this.running ? 'run' : 'walk') : 'idle');
        }
      }
    }
  };
  actors.push(actor);
  if (assetUrl) loadCharacterAsset(actor, assetUrl, isPlayer || female);
  return actor;
}

function makeInteractable({ name, position, radius = 1.7, action, kind = 'npc' }) {
  return { name, position: new THREE.Vector3(position.x, 0, position.z), radius, action, kind };
}

function createWorldActors() {
  const spawn = mapLandmark('spawn');
  player = makeActor({ name: '沈临川', position: spawn, assetUrl: CONFIG.assets.hero, isPlayer: true, accent: '#e1c584' });
  heroine = makeActor({ name: '苏萝', position: mapLandmark('companion'), female: true, assetUrl: CONFIG.assets.heroine, accent: '#a9d1b9' });
  const keeper = mapLandmark('innDoor');
  const vendor = mapLandmark('vendor');
  const daoist = mapPoint(2780, 2890);
  const scout = mapPoint(3010, 2670);
  const archer = mapPoint(2168, 1930);
  const innActor = makeActor({ name: '客栈掌柜', position: { x: keeper.x + 0.7, z: keeper.z - 0.35 }, npcColor: '#79543a', accent: '#d8b875' });
  const vendorActor = makeActor({ name: '药摊老人', position: vendor, npcColor: '#9a7949', accent: '#dbc486' });
  const masterActor = makeActor({ name: '逍遥道人', position: daoist, npcColor: '#56635d', accent: '#c9d1a6' });
  const scoutActor = makeActor({ name: '西岭密探', position: { x: scout.x, z: scout.z }, npcColor: '#46383b', accent: '#bb8d77' });
  const archerActor = makeActor({ name: '竹林弩手', position: archer, npcColor: '#53433f', accent: '#bd9c7c' });
  const companionSpawn = mapLandmark('companion');
  heroine.root.position.set(companionSpawn.x, 0, companionSpawn.z);
  innActor.label.position.y = 2.35;
  vendorActor.label.position.y = 2.35;
  masterActor.label.position.y = 2.35;
  scoutActor.label.position.y = 2.35;
  archerActor.label.position.y = 2.35;

  worldInteractables.push(
    makeInteractable({ name: '与苏萝交谈', position: heroine.root.position, radius: 1.7, action: talkToSuLuo }),
    makeInteractable({ name: '进入云来客栈', position: mapLandmark('innDoor'), radius: 2.4, action: enterInn, kind: 'door' }),
    makeInteractable({ name: '药摊老人', position: vendor, radius: 1.8, action: talkToVendor }),
    makeInteractable({ name: '逍遥道人', position: daoist, radius: 1.8, action: talkToMaster }),
    makeInteractable({ name: '云纹铜匣', position: mapPoint(2510, 2320), radius: 1.7, action: openBronzeBox, kind: 'chest' }),
    makeInteractable({ name: '月华谷山门', position: mapPoint(3000, 1320), radius: 2.2, action: enterMoonGate, kind: 'gate' }),
  );
  if (storyFlags.bronze_box_opened) markBoxComplete();
}

function createRoomScene() {
  roomInteractables = [
    makeInteractable({ name: '与苏萝交谈', position: { x: 0.9, z: -2.15 }, radius: 1.7, action: talkToSuLuo }),
    makeInteractable({ name: '查看账册', position: roomPoint(1090, 505), radius: 1.6, action: inspectDesk, kind: 'clue' }),
    makeInteractable({ name: '搜索木柜', position: roomPoint(1060, 260), radius: 1.5, action: searchWardrobe, kind: 'chest' }),
    makeInteractable({ name: '打开红漆箱', position: roomPoint(1120, 620), radius: 1.5, action: openChest, kind: 'chest' }),
    makeInteractable({ name: '回到苍山旧道', position: { x: 0, z: -3.15 }, radius: 1.35, action: leaveInn, kind: 'door' }),
  ];
  return loadEnvironmentModel(CONFIG.assets.innInterior, roomRoot);
}

function setRoomMode(enabled) {
  isInRoom = enabled;
  worldRoot.visible = !enabled;
  roomRoot.visible = enabled;
  const location = document.querySelector('#location-label');
  location.textContent = enabled ? '云来客栈 · 内室' : '苍山旧道';
  document.querySelector('#chapter-label').textContent = enabled ? '第一章 · 客房旧信' : '第一章 · 钟断苍山';
  if (enabled) {
    previousWorldPosition = { x: player.root.position.x, z: player.root.position.z };
    worldRoot.remove(player.root, heroine.root);
    roomRoot.add(player.root, heroine.root);
    player.root.position.set(0, 0, -2.72);
    heroine.root.position.set(0.9, 0, -2.15);
    player.baseY = 0.25;
    heroine.baseY = 0.25;
    cameraDistance = 10.2;
    updateCameraProjection();
  } else {
    roomRoot.remove(player.root, heroine.root);
    worldRoot.add(player.root, heroine.root);
    player.baseY = 0.05;
    heroine.baseY = 0.05;
    if (previousWorldPosition) player.root.position.set(previousWorldPosition.x, 0, previousWorldPosition.z);
    heroine.root.position.set(player.root.position.x + COMPANION_OFFSET.x, 0, player.root.position.z + COMPANION_OFFSET.z);
    const companionInteraction = worldInteractables.find((item) => item.name === '与苏萝交谈');
    if (companionInteraction) companionInteraction.position.set(heroine.root.position.x, 0, heroine.root.position.z);
    cameraDistance = 24.0;
    updateCameraProjection();
  }
  camera.position.set(player.root.position.x, player.root.position.y + 8, player.root.position.z - cameraDistance);
}

function enterInn() {
  closeDialogue();
  setRoomMode(true);
  showToast('推门进入云来客栈的内室');
  if (!storyFlags.room_seen) {
    storyFlags.room_seen = true;
    saveStoryFlags();
    openDialogue([
      ['沈临川', '这间屋子昨夜有人翻找过。桌上的账册被抽走了一页。'],
      ['苏萝', '先看桌边，再找找柜子。若有人留下记号，也许和那只铜匣有关。']
    ]);
  }
}

function leaveInn() {
  closeDialogue();
  setRoomMode(false);
  showToast('回到苍山旧道');
}

function markBoxComplete() {
  questTitle.textContent = '前往苍山古寺';
  questDescription.textContent = '铜匣里有枚旧玉佩和半张地图。带着线索上石阶，去问守寺僧。';
  questProgress.textContent = '主线 · 云纹铜匣已开启';
}

function completeQuest() {
  storyFlags.bronze_box_opened = true;
  saveStoryFlags();
  markBoxComplete();
}

function talkToSuLuo() {
  const lines = storyFlags.su_luo_intro_seen
    ? [
        ['苏萝', '掌柜说，昨夜有个蒙面人从后窗进来。你掉的玉佩，他没敢碰。'],
        ['沈临川', '我记得山门前有笛声。也许有人想让我忘掉什么。'],
        ['苏萝', '那便一起查。只不过别把我当成随行的药囊，我也有自己的路。']
      ]
    : [
        ['苏萝', '你醒啦。这里是苍山旧道，再往上就是苍山古寺。昨夜山门钟声断了三次，像是有人闯进了禁地。'],
        ['沈临川', '我只记得一阵笛声，醒来时佩剑已经不见了。'],
        ['苏萝', '先去石阶旁的灯亭查一查。若看到刻着“云纹”的铜匣，不要急着打开，里面可能藏着机关。'],
        ['苏萝', '客栈里也许留了线索。查完灯亭，我们进去问掌柜。']
      ];
  storyFlags.su_luo_intro_seen = true;
  saveStoryFlags();
  openDialogue(lines, () => {
    questTitle.textContent = storyFlags.bronze_box_opened ? '前往苍山古寺' : '寻找云纹铜匣';
    questDescription.textContent = storyFlags.bronze_box_opened
      ? '带着铜匣中的半张地图，沿石阶前往苍山古寺。'
      : '沿旧道搜寻灯亭与石阶，铜匣里也许藏着失剑的线索。';
  });
}

function talkToVendor() {
  openDialogue([
    ['药摊老人', '少侠面色发白，是中了迷香。拿两枚清心丸，别在山风口久站。'],
    ['沈临川', '老人家见过昨夜持笛的人吗？'],
    ['药摊老人', '只听见桥那头有脚步声。要寻人，先把气息养回来。']
  ]);
  showToast('清心丸 +2 · 线索记入行囊');
}

function talkToMaster() {
  openDialogue([
    ['逍遥道人', '你这步子虚浮，不像是寻常疲乏。笛声扰心，最好先学会把气息收回来。'],
    ['沈临川', '前辈知道我为何而来？还请指点这条苍山旧道。'],
    ['逍遥道人', '待你查明铜匣，我再教你一式扶摇诀。脚下无根时，才要记得风从哪里来。']
  ]);
}

function openBronzeBox() {
  if (storyFlags.bronze_box_opened) {
    openDialogue([['沈临川', '铜匣已经打开。半张地图指向寺后的旧石阶。']]);
    return;
  }
  openDialogue([
    ['灯亭', '石阶旁的旧铜匣底刻着“云纹”二字，锁扣边有三道细痕。'],
    ['沈临川', '这三道痕是新留下的。有人在我之前来过。'],
    ['苏萝', '慢些，先按刻痕试试。']
  ], completeQuest);
}

function enterMoonGate() {
  openDialogue([
    ['苏萝', '前面就是月华谷。谷里的人不爱见外客，尤其不爱见带着王府玉佩的人。'],
    ['沈临川', '等查完苍山旧案，我们再沿着这条路过去。']
  ]);
}

function inspectDesk() {
  if (storyFlags.desk_checked) {
    openDialogue([['沈临川', '桌上的账册缺了最后一页，墨痕还没干。']]);
    return;
  }
  storyFlags.desk_checked = true;
  saveStoryFlags();
  openDialogue([
    ['沈临川', '账册最后一页被撕走了，纸边还有一点潮气。'],
    ['苏萝', '窗沿落了山泥，昨夜那人是从后窗进来的。我们得找到被他带走的那一页。']
  ]);
  showToast('发现线索 · 账册缺页');
}

function searchWardrobe() {
  if (storyFlags.wardrobe_opened) {
    openDialogue([['沈临川', '柜子里只剩下一截蓝布。那封信已经收好了。']]);
    return;
  }
  storyFlags.wardrobe_opened = true;
  saveStoryFlags();
  openDialogue([
    ['木柜', '柜门吱呀一声打开，里面落下一只旧布囊。'],
    ['沈临川', '布囊里有碎银和一封未署名的信。纸上写着“灯尽之前，别回头”。'],
    ['苏萝', '这是留给你的。先收好，等找到铜匣再一起看。']
  ]);
  showToast('获得线索 · 未署名的信');
}

function openChest() {
  if (storyFlags.chest_opened) {
    showToast('红漆箱已经搜过了');
    return;
  }
  storyFlags.chest_opened = true;
  saveStoryFlags();
  openDialogue([['沈临川', '箱底压着半枚旧玉佩，纹路与我身上的玉扣相同。']]);
  showToast('获得旧玉佩 · 记忆碎片');
}

function openDialogue(lines, onFinish) {
  dialogue = lines;
  dialogueIndex = 0;
  openDialogue.onFinish = onFinish;
  dialogPanel.hidden = false;
  showDialogueLine();
}

function showDialogueLine() {
  if (!dialogue || dialogueIndex >= dialogue.length) {
    closeDialogue();
    return;
  }
  const [speaker, line] = dialogue[dialogueIndex];
  dialogSpeaker.textContent = speaker;
  dialogText.textContent = line;
  dialogPortrait.textContent = speaker.slice(0, 1);
  dialogPortrait.classList.toggle('hero-portrait', speaker === '沈临川');
}

function advanceDialogue() {
  if (!dialogue) return;
  dialogueIndex += 1;
  if (dialogueIndex >= dialogue.length) {
    const onFinish = openDialogue.onFinish;
    closeDialogue();
    if (onFinish) onFinish();
    return;
  }
  showDialogueLine();
}

function closeDialogue() {
  dialogue = null;
  dialogPanel.hidden = true;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2100);
}

function updateModelStatus() {
  const heroReady = player?.assetLoaded;
  const companionReady = heroine?.assetLoaded;
  const heroName = ['island-rig-zelda', 'island-rig-zelda-review-v2'].includes(HERO_RIG_VARIANT) ? '沈临川步态修正版' : '沈临川';
  if (heroReady && companionReady) modelStatus.textContent = `3D场景与角色模型 · ${heroName} / 苏萝`;
  else if (heroReady) modelStatus.textContent = '3D场景与角色模型 · 沈临川已载入';
  else modelStatus.textContent = '3D场景已载入 · 角色模型载入中';
}

function enterInteraction(item) {
  if (!item) return;
  item.action();
}

function updateNearestInteraction() {
  if (dialogue) {
    interactionPrompt.hidden = true;
    activeInteractable = null;
    return;
  }
  const list = isInRoom ? roomInteractables : worldInteractables;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const item of list) {
    const dx = item.position.x - player.root.position.x;
    const dz = item.position.z - player.root.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= item.radius && distance < nearestDistance) {
      nearest = item;
      nearestDistance = distance;
    }
  }
  activeInteractable = nearest;
  interactionPrompt.hidden = !nearest;
  if (nearest) interactionLabel.textContent = nearest.name;
}

function mainSolidAt(x, z) {
  if (isInRoom) {
    if (x < -5.8 || x > 5.8 || z < -3.25 || z > 3.15) return true;
    const solids = [
      [3.83, 1.71, 1.02, 0.96], [-0.04, 0.24, 1.12, 0.78],
      [-4.37, -0.96, 1.55, 0.78], [-4.53, 1.28, 1.34, 0.88],
      [4.15, -2.06, 1.50, 0.16], [-4.80, -2.36, 1.02, 0.72],
      [5.05, -2.81, 0.52, 0.48]
    ];
    return solids.some(([cx, cz, rx, rz]) => Math.abs(x - cx) < rx && Math.abs(z - cz) < rz);
  }
  if (x < -CONFIG.mapWidth / 2 || x > CONFIG.mapWidth / 2 ||
      z < -CONFIG.mapDepth / 2 || z > CONFIG.mapDepth / 2) return true;
  const mapX = (0.5 - x / CONFIG.mapWidth) * CONFIG.globalMapWidth;
  const mapY = (0.5 - z / CONFIG.mapDepth) * CONFIG.globalMapHeight;
  return WORLD_OBSTACLES.some((rect) => (
    mapX >= rect.x && mapX <= rect.x + rect.width &&
    mapY >= rect.y && mapY <= rect.y + rect.height
  ));
}

function updatePlayer(delta, time) {
  const forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
  const strafe = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const length = Math.hypot(forward, strafe);
  const moving = length > 0 && !dialogue;
  const running = keys.has('shift');
  player.moving = moving;
  player.running = running;
  if (moving) {
    const f = forward / length;
    const s = strafe / length;
    const dx = -(s * Math.cos(yaw) + f * Math.sin(yaw));
    const dz = f * Math.cos(yaw) - s * Math.sin(yaw);
    const speed = running ? CONFIG.runSpeed : CONFIG.walkSpeed;
    const nx = player.root.position.x + dx * speed * delta;
    const nz = player.root.position.z + dz * speed * delta;
    if (!mainSolidAt(nx, player.root.position.z)) player.root.position.x = nx;
    if (!mainSolidAt(player.root.position.x, nz)) player.root.position.z = nz;
    player.root.rotation.y = Math.atan2(dx, dz);
    if (player.jumpHeight === 0 && player.attackRemaining === 0) player.setMotion(running ? 'run' : 'walk');
  } else if (player.jumpHeight === 0 && player.attackRemaining === 0) {
    player.setMotion('idle');
  }
  if (keys.has(' ') && !player.jumpVelocity && !player.jumpHeight && !dialogue) {
    player.jumpVelocity = 6.6;
    player.setMotion('jump');
  }
}

function movePlayerScripted(position, duration) {
  if (!player) return Promise.resolve();
  const from = player.root.position.clone();
  const to = new THREE.Vector3(position.x, 0, position.z);
  const distance = from.distanceTo(to);
  const moveDuration = Math.max(0.45, duration || distance / CONFIG.walkSpeed);
  player.root.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  player.moving = distance > 0.02;
  player.running = false;
  if (player.moving) player.setMotion('walk');
  return new Promise((resolve) => {
    scriptedMove = { from, to, duration: moveDuration, startedAt: performance.now(), resolve };
  });
}

function updateScriptedMove(delta) {
  if (!scriptedMove) return;
  const move = scriptedMove;
  const elapsed = Math.min((performance.now() - move.startedAt) / 1000, move.duration);
  const t = elapsed / move.duration;
  // Keep scripted walking at a constant measured speed so the in-place Walk
  // cycle advances at the same rate as the character moves through the world.
  player.root.position.lerpVectors(move.from, move.to, t);
  if (t >= 1) {
    scriptedMove = null;
    player.moving = false;
    player.setMotion('idle');
    move.resolve();
  }
}

function performAttack() {
  if (dialogue || isInRoom || !player || player.attackRemaining > 0) return;
  player.attackRemaining = 0.58;
  player.setMotion('attack');
  showToast('沈临川使出一式沉掌');
}

function updateCamera(delta) {
  if (!player) return;
  const target = new THREE.Vector3(player.root.position.x + demoCameraOffsetX, player.root.position.y + 1.06, player.root.position.z);
  const horizontal = Math.cos(pitch) * cameraDistance;
  const wanted = new THREE.Vector3(
    target.x + Math.sin(yaw) * horizontal,
    target.y + Math.sin(pitch) * cameraDistance,
    target.z - Math.cos(yaw) * horizontal
  );
  camera.position.lerp(wanted, 1 - Math.exp(-delta * 5.4));
  camera.lookAt(target);
}

function addEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    updateCameraProjection();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  });
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    if (key === 'enter' && dialogue) { advanceDialogue(); return; }
    if (key === 'escape' && !document.querySelector('#map-modal').hidden) {
      document.querySelector('#map-modal').hidden = true;
      return;
    }
    if ((key === 'e' || key === 'f') && !event.repeat) {
      if (dialogue) advanceDialogue(); else enterInteraction(activeInteractable);
      return;
    }
    if (key === 'q' && !event.repeat) { performAttack(); return; }
    if (key === 'm' && !event.repeat) toggleMap();
    keys.add(key);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointerdown', (event) => {
    cameraDrag = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!cameraDrag || cameraDrag.pointerId !== event.pointerId) return;
    yaw -= (event.clientX - cameraDrag.x) * 0.0045;
    pitch = THREE.MathUtils.clamp(pitch + (event.clientY - cameraDrag.y) * 0.0035, 0.28, 1.28);
    cameraDrag.x = event.clientX;
    cameraDrag.y = event.clientY;
  });
  canvas.addEventListener('pointerup', () => { cameraDrag = null; });
  canvas.addEventListener('wheel', (event) => {
    cameraDistance = THREE.MathUtils.clamp(cameraDistance + Math.sign(event.deltaY) * 0.8, 10, 38);
    updateCameraProjection();
  }, { passive: true });
  document.querySelector('#dialog-next').addEventListener('click', advanceDialogue);
  document.querySelector('#map-button').addEventListener('click', toggleMap);
  document.querySelector('#map-close').addEventListener('click', toggleMap);
  document.querySelector('#map-modal').addEventListener('click', (event) => {
    if (event.target.id === 'map-modal') toggleMap();
  });
}

function toggleMap() {
  const modal = document.querySelector('#map-modal');
  modal.hidden = !modal.hidden;
}

function setDemoCaption(title, subtitle) {
  const panel = document.querySelector('#demo-caption');
  if (!panel) return;
  panel.hidden = false;
  document.querySelector('#demo-title').textContent = title;
  document.querySelector('#demo-subtitle').textContent = subtitle;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function advanceDemoDialogue(interval = 1850) {
  while (dialogue) {
    await wait(interval);
    advanceDialogue();
  }
  await wait(350);
}

function installDemoApi() {
  let demoStep = 'ready';
  const setStep = (step) => { demoStep = step; };
  document.querySelector('#demo-replay')?.addEventListener('click', () => window.__cangshanDemo.run());
  window.__cangshanDemo = {
    ready: true,
    running: false,
    async run() {
      if (this.running) return;
      this.running = true;
      try {
        storyFlags = {};
        yaw = 0;
        pitch = 0.91;
        demoCameraOffsetX = 0;
        cameraDistance = 25.5;
        updateCameraProjection();
        setStep('opening');
        setDemoCaption('风起苍山', '断钟惊醒了沈临川；苏萝在旧道旁等他同行。');
        await wait(1400);
        setStep('meet-suluo');
        const companionApproach = mapPoint(2790, 2540);
        await movePlayerScripted(companionApproach);
        talkToSuLuo();
        setStep('suluo-dialogue');
        await advanceDemoDialogue(1750);

        setStep('east-road');
        setDemoCaption('沿旧道东行', '绕过集市摊棚，穿过开阔的山路，前往云来客栈。');
        const route = [
          [2800, 2980], [3480, 2980], [3710, 3000], [3970, 2910]
        ];
        for (const [x, y] of route) {
          const destination = mapPoint(x, y);
          await movePlayerScripted(destination);
        }
        await wait(750);
        setStep('enter-inn');
        setDemoCaption('云来客栈', '沈临川和苏萝循着昨夜的痕迹，进入客房查找线索。');
        enterInn();
        setStep('inn-dialogue');
        await advanceDemoDialogue(1750);
        setStep('approach-desk');
        await movePlayerScripted({ x: -2.0, z: -1.72 });
        setStep('inspect-ledger');
        setDemoCaption('客房旧信', '桌上账册被撕去一页，窗沿还留着昨夜带进来的山泥。');
        inspectDesk();
        setStep('ledger-dialogue');
        await advanceDemoDialogue(1750);
        await wait(1400);
        setStep('return-outside');
        leaveInn();
        demoCameraOffsetX = 7.6;
        setDemoCaption('线索已经记下', '回到苍山旧道，下一站是石阶旁的灯亭。');
        await wait(2800);
        setStep('complete');
        return { complete: true, location: isInRoom ? 'room' : 'world' };
      } finally {
        this.running = false;
      }
    },
    state() {
      return {
        running: this.running,
        location: isInRoom ? 'room' : 'world',
        step: demoStep,
        player: { x: player?.root.position.x ?? 0, z: player?.root.position.z ?? 0 },
        heroLoaded: Boolean(player?.assetLoaded),
        heroineLoaded: Boolean(heroine?.assetLoaded),
        dialogueOpen: Boolean(dialogue)
      };
    }
  };
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.04);
  const time = clock.elapsedTime;
  if (player) {
    if (scriptedMove) updateScriptedMove(delta);
    else updatePlayer(delta, time);
  }
  for (const actor of actors) actor.update(delta, time);
  updateNearestInteraction();
  updateCamera(delta);
  renderer.render(scene, camera);
}

async function initialize() {
  createWorldActors();
  await Promise.all([createWorldEnvironment(), createRoomScene()]);
  addEvents();
  updateModelStatus();
  animate();
  window.setTimeout(() => {
    loadingScreen.classList.add('done');
    if (DEMO_MODE) {
      openingWasShown = true;
      installDemoApi();
      setDemoCaption('风起苍山', '苍山旧道的 3D 剧情演示即将开始。');
      const startWhenModelsAreReady = () => {
        if (player?.assetLoaded && heroine?.assetLoaded) {
          window.setTimeout(() => window.__cangshanDemo.run().catch((error) => console.error('剧情演示失败', error)), 1400);
        }
        else window.setTimeout(startWhenModelsAreReady, 250);
      };
      startWhenModelsAreReady();
    } else if (!openingWasShown) {
      openingWasShown = true;
      openDialogue([
        ['苏萝', '你醒啦。这里是苍山旧道，再往上就是苍山古寺。昨夜山门钟声断了三次，像是有人闯进了禁地。'],
        ['沈临川', '我只记得一阵笛声，醒来时佩剑已经不见了。'],
        ['苏萝', '先去石阶旁的灯亭查一查。若看到刻着“云纹”的铜匣，不要急着打开，里面可能藏着机关。']
      ], () => {
        storyFlags.su_luo_intro_seen = true;
        saveStoryFlags();
        questProgress.textContent = storyFlags.bronze_box_opened ? '主线 · 云纹铜匣已开启' : '主线 · 未完成';
      });
    }
  }, 700);
}

initialize().catch((error) => {
  console.error('Failed to initialize Three.js RPG', error);
  loadingScreen.classList.add('done');
  showToast('场景启动失败，请使用 npm run 3d:dev 打开');
});
