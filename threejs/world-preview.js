import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#world-canvas');
const status = document.querySelector('#load-status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#10171d');
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 240);
camera.position.set(20, 26, 37);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.4, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minDistance = 10;
controls.maxDistance = 100;
controls.update();

scene.add(new THREE.HemisphereLight('#e2e7ea', '#26312d', 1.6));
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(26, 40),
  new THREE.MeshBasicMaterial({ color: '#18221f', transparent: true, opacity: 0.64 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.2;
scene.add(ground);
const grid = new THREE.GridHelper(42, 21, '#43504b', '#27332e');
grid.position.y = -0.18;
scene.add(grid);

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

async function loadGaussianPly() {
  const response = await fetch('./assets/generated/threejs-wuxia/source/cangshan-opening-3dgs.ply');
  if (!response.ok) throw new Error(`PLY fetch failed (${response.status})`);
  const bytes = await response.arrayBuffer();
  const decoder = new TextDecoder();
  const source = new Uint8Array(bytes);
  const headerEndBytes = [101, 110, 100, 95, 104, 101, 97, 100, 101, 114, 10];
  let marker = -1;
  for (let index = 0; index < Math.min(source.length, 8192) && marker < 0; index++) {
    if (headerEndBytes.every((byte, offset) => source[index + offset] === byte)) marker = index;
  }
  if (marker < 0) throw new Error('PLY header is missing');
  const headerEnd = marker + 11;
  const header = decoder.decode(bytes.slice(0, headerEnd));
  if (!header.includes('format binary_little_endian 1.0')) throw new Error('Expected binary little endian PLY');
  const count = Number(header.match(/element vertex (\d+)/)?.[1]);
  const fields = [...header.matchAll(/property float (\w+)/g)].map((m) => m[1]);
  const field = Object.fromEntries(fields.map((name, index) => [name, index]));
  const required = ['x', 'y', 'z', 'f_dc_0', 'f_dc_1', 'f_dc_2', 'opacity', 'scale_0', 'scale_1', 'scale_2'];
  if (!count || fields.length < 16 || required.some((name) => field[name] === undefined)) throw new Error('Unsupported HunyuanWorld PLY schema');
  const stride = fields.length * 4;
  const view = new DataView(bytes, headerEnd);
  const read = (vertex, name) => view.getFloat32(vertex * stride + field[name] * 4, true);
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < count; i++) {
    const x = read(i, 'x'), y = read(i, 'y'), z = read(i, 'z');
    bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
    bounds.minZ = Math.min(bounds.minZ, z); bounds.maxZ = Math.max(bounds.maxZ, z);
  }
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const sx = 22 / Math.max(bounds.maxX - bounds.minX, 1e-4);
  const sz = 35.2 / Math.max(bounds.maxY - bounds.minY, 1e-4);
  const sy = 3.5 / Math.max(bounds.maxZ - bounds.minZ, 1e-4);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (read(i, 'x') - centerX) * sx;
    positions[i * 3 + 1] = (read(i, 'z') - centerZ) * sy + 1.75;
    positions[i * 3 + 2] = (read(i, 'y') - centerY) * sz;
    colors[i * 3] = THREE.MathUtils.clamp(0.5 + 0.2820948 * read(i, 'f_dc_0'), 0, 1);
    colors[i * 3 + 1] = THREE.MathUtils.clamp(0.5 + 0.2820948 * read(i, 'f_dc_1'), 0, 1);
    colors[i * 3 + 2] = THREE.MathUtils.clamp(0.5 + 0.2820948 * read(i, 'f_dc_2'), 0, 1);
    opacities[i] = sigmoid(read(i, 'opacity'));
    const maxScale = Math.max(read(i, 'scale_0'), read(i, 'scale_1'), read(i, 'scale_2'));
    sizes[i] = Math.exp(maxScale) * Math.max(sx, sz) * 2.4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uViewportHeight: { value: renderer.domElement.height } },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aOpacity;
      attribute float aSize;
      uniform float uViewportHeight;
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(aSize * uViewportHeight * projectionMatrix[1][1] / (2.0 * max(-viewPosition.z, 0.1)), 1.2, 28.0);
        vColor = aColor;
        vOpacity = aOpacity;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        vec2 point = gl_PointCoord - vec2(0.5);
        float radius2 = dot(point, point);
        if (radius2 > 0.25) discard;
        float alpha = exp(-radius2 * 22.0) * vOpacity;
        gl_FragColor = vec4(pow(max(vColor, vec3(0.0)), vec3(0.4545)), alpha);
      }
    `
  });
  scene.add(new THREE.Points(geometry, material));
  status.textContent = `已载入 ${count.toLocaleString()} 个高斯点`;
}

loadGaussianPly().catch((error) => {
  console.error(error);
  status.textContent = `重建文件未载入：${error.message}`;
});

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
