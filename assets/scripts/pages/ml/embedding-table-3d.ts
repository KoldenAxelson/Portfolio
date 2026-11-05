// The 3D half of {{< ml/embedding-table >}}: GPT-2's token table as a tower,
// and each looked-up row pulled out of it like a drawer, then laid down as a
// ridge of 768 bars (height and colour are the value). Rows looked up one
// after another stack front to back, in sentence order.
//
// Built as its own ES module by partials/ml/assets.html (so Three.js only
// downloads when the demo scrolls near) and imported by embedding-table.ts,
// which owns the buttons, the readout and the table. Nothing here is needed to read the page.

import {
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NoColorSpace,
  PerspectiveCamera,
  Plane,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  type Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'vendor/three/0.187.0/three.module.js';

export interface TableRow {
  token: string;
  id: number;
  values: Float32Array;
}

export interface SceneOptions {
  rowCount: number;
  columnCount: number;
  towerUrl: string;
  colourClip: number;
  reducedMotion: boolean;
}

export interface SceneHandle {
  show(row: TableRow): void;
  clear(): void;
}

// Scene units. The tower is squashed: the real table is about 65 times taller
// than it is wide, which wouldn't fit a phone. The caption says so.
const TOWER = { x: -3.1, width: 1, height: 6.4, depth: 0.3 };
const RIDGE = { left: -1.3, length: 5.2, baseline: -0.9, frontZ: 1.4, gap: 0.85, heightPerUnit: 2.2, depth: 0.16 };
const DRAWER_THICKNESS = 0.05;
const MAX_RIDGES = 8;
const LOOKUP_MS = 1500;
const VIEW_TARGET = new Vector3(0.2, -0.1, -1.4);
const VIEW_HALF = { x: 4.9, y: 4.1 };
// Narrow, so the tall tower doesn't lean away in perspective.
const FIELD_OF_VIEW = 24;

const valueShader = {
  vertex: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  // The tower texture stores value / colourClip as grey (128 = zero), so the
  // colour ramp lives here and follows the theme without reloading the image.
  fragment: /* glsl */ `
    uniform sampler2D map;
    uniform vec3 negative;
    uniform vec3 middle;
    uniform vec3 positive;
    varying vec2 vUv;
    void main() {
      float value = texture2D(map, vUv).r * 2.0 - 1.0;
      vec3 colour = value < 0.0 ? mix(middle, negative, -value) : mix(middle, positive, value);
      gl_FragColor = vec4(colour, 1.0);
      #include <colorspace_fragment>
    }`,
};

interface Palette {
  negative: Color;
  middle: Color;
  positive: Color;
  accent: Color;
  side: Color;
}

interface Ridge {
  row: TableRow;
  group: Group;
  mesh: InstancedMesh;
  label: HTMLElement;
  unfold: number;
  depthIndex: number;
}

interface Tween {
  startMs: number;
  durationMs: number;
  step: (progress: number) => void;
}

function cssColour(style: CSSStyleDeclaration, name: string): Color {
  const [red, green, blue] = style.getPropertyValue(name).trim().split(/\s+/).map(Number);
  return new Color().setRGB(red / 255, green / 255, blue / 255, SRGBColorSpace);
}

// The three --mli-et-* colours are set per theme in css/pages/ml/demos.css.
function readPalette(root: HTMLElement): Palette {
  const style = getComputedStyle(root);
  return {
    negative: cssColour(style, '--mli-et-neg'),
    middle: cssColour(style, '--mli-et-mid'),
    positive: cssColour(style, '--mli-et-pos'),
    accent: cssColour(style, '--c-accent'),
    side: cssColour(style, '--c-border'),
  };
}

function colourFor(value: number, clip: number, palette: Palette, out: Color): Color {
  const amount = Math.max(-1, Math.min(1, value / clip));
  if (amount < 0) return out.copy(palette.middle).lerp(palette.negative, -amount);
  return out.copy(palette.middle).lerp(palette.positive, amount);
}

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
// Maps overall progress onto one stage of the lookup, eased.
const phase = (progress: number, from: number, to: number): number => easeInOut(clamp01((progress - from) / (to - from)));

export function mountScene(host: HTMLElement, options: SceneOptions): SceneHandle {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.className = 'mli-et-canvas';
  host.prepend(renderer.domElement);
  const overlay = host.querySelector<HTMLElement>('.mli-et-tags');
  const tooltip = host.querySelector<HTMLElement>('.mli-et-tip');

  const scene = new Scene();
  scene.add(new HemisphereLight(0xffffff, 0x888888, 2.2));
  const sun = new DirectionalLight(0xffffff, 1.1);
  sun.position.set(3, 6, 5);
  scene.add(sun);

  let palette = readPalette(host);
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 100);
  // Looking down a little, so rows stacked front to back read as separate ridges.
  const view = { yaw: -0.25, pitch: 0.38, distance: 14 };

  const towerFace = new ShaderMaterial({
    uniforms: {
      map: { value: null as Texture | null },
      negative: { value: palette.negative },
      middle: { value: palette.middle },
      positive: { value: palette.positive },
    },
    vertexShader: valueShader.vertex,
    fragmentShader: valueShader.fragment,
  });
  const towerSide = new MeshLambertMaterial({ color: palette.side });
  // BoxGeometry material order: +x, -x, +y, -y, +z (the face we read), -z.
  const tower = new Mesh(
    new BoxGeometry(TOWER.width, TOWER.height, TOWER.depth),
    [towerSide, towerSide, towerSide, towerSide, towerFace, towerSide],
  );
  tower.position.x = TOWER.x;
  scene.add(tower);

  const bandMaterial = new MeshBasicMaterial({ color: palette.accent });
  const band = new Mesh(new BoxGeometry(TOWER.width + 0.12, 0.045, TOWER.depth + 0.12), bandMaterial);
  band.position.x = TOWER.x;
  band.visible = false;
  scene.add(band);

  // One zero line under each ridge, shared geometry and material.
  const zeroLineGeometry = new BoxGeometry(RIDGE.length, 0.01, 0.02);
  zeroLineGeometry.translate(RIDGE.length / 2, 0, 0);
  const zeroLineMaterial = new MeshBasicMaterial({ color: palette.side });

  new TextureLoader().load(options.towerUrl, (texture) => {
    texture.colorSpace = NoColorSpace;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;
    texture.generateMipmaps = false;
    towerFace.uniforms.map.value = texture;
    requestRender();
  });

  const barGeometry = new BoxGeometry(1, 1, 1);
  const barWidth = RIDGE.length / options.columnCount;
  const ridges: Ridge[] = [];
  const tweens: Tween[] = [];
  const scratch = { matrix: new Matrix4(), position: new Vector3(), scale: new Vector3(), colour: new Color() };
  const noRotation = new Quaternion();

  const rowY = (id: number): number => TOWER.height / 2 - ((id + 0.5) / options.rowCount) * TOWER.height;
  const ridgeZ = (depthIndex: number): number => RIDGE.frontZ - depthIndex * RIDGE.gap;

  function tag(className: string, text: string): HTMLElement {
    const element = document.createElement('span');
    element.className = `mli-et-tag ${className}`;
    element.textContent = text;
    overlay?.append(element);
    return element;
  }

  const towerTop = tag('is-axis', 'row 0');
  const towerBottom = tag('is-axis', `row ${(options.rowCount - 1).toLocaleString('en-US')}`);
  const bandTag = tag('is-band', '');
  bandTag.hidden = true;

  // Lays out the 768 bars for one unfold amount: 0 is the flat drawer slice,
  // 1 is the ridge, every bar standing on the baseline at its value's height.
  function layoutBars(ridge: Ridge): void {
    const { values } = ridge.row;
    for (let column = 0; column < values.length; column++) {
      const value = values[column];
      const fullHeight = Math.max(0.012, Math.abs(value) * RIDGE.heightPerUnit);
      const height = lerp(DRAWER_THICKNESS, fullHeight, ridge.unfold);
      const centreY = lerp(0, (Math.sign(value) * fullHeight) / 2, ridge.unfold);
      scratch.position.set((column + 0.5) * barWidth, centreY, 0);
      scratch.scale.set(barWidth * 0.9, height, lerp(TOWER.depth, RIDGE.depth, ridge.unfold));
      ridge.mesh.setMatrixAt(column, scratch.matrix.compose(scratch.position, noRotation, scratch.scale));
    }
    ridge.mesh.instanceMatrix.needsUpdate = true;
  }

  function paintBars(ridge: Ridge, highlightColumn = -1): void {
    const { values } = ridge.row;
    for (let column = 0; column < values.length; column++) {
      const colour = column === highlightColumn ? scratch.colour.copy(palette.accent) : colourFor(values[column], options.colourClip, palette, scratch.colour);
      ridge.mesh.setColorAt(column, colour);
    }
    if (ridge.mesh.instanceColor) ridge.mesh.instanceColor.needsUpdate = true;
  }

  function placeRidge(ridge: Ridge, flight: number, slideOut: number, fromZ: number): void {
    const y = rowY(ridge.row.id);
    ridge.group.position.set(
      lerp(TOWER.x - TOWER.width / 2, RIDGE.left, flight),
      lerp(y, RIDGE.baseline, flight),
      lerp(fromZ + slideOut * 0.8, ridgeZ(ridge.depthIndex), flight),
    );
    ridge.group.scale.x = lerp(TOWER.width / RIDGE.length, 1, flight);
    ridge.unfold = flight;
    layoutBars(ridge);
  }

  function makeRidge(row: TableRow): Ridge {
    const mesh = new InstancedMesh(barGeometry, new MeshLambertMaterial({ color: 0xffffff }), row.values.length);
    const group = new Group();
    group.add(mesh, new Mesh(zeroLineGeometry, zeroLineMaterial));
    scene.add(group);
    const label = tag('is-ridge', row.token.replace(/ /g, '␣'));
    const ridge: Ridge = { row, group, mesh, label, unfold: 0, depthIndex: 0 };
    paintBars(ridge);
    return ridge;
  }

  function removeRidge(ridge: Ridge): void {
    scene.remove(ridge.group);
    ridge.mesh.dispose();
    (ridge.mesh.material as MeshLambertMaterial).dispose();
    ridge.label.remove();
  }

  function show(row: TableRow): void {
    tweens.length = 0;
    for (const ridge of ridges) placeRidge(ridge, 1, 0, 0);

    const fromY = band.visible ? band.position.y : rowY(row.id);
    const toY = rowY(row.id);
    band.visible = true;
    bandTag.hidden = false;
    bandTag.textContent = `row ${row.id.toLocaleString('en-US')}`;

    for (const ridge of ridges) ridge.depthIndex += 1;
    while (ridges.length >= MAX_RIDGES) {
      const oldest = ridges.shift();
      if (oldest) removeRidge(oldest);
    }
    const shifting = ridges.map((ridge) => ({ ridge, fromZ: ridge.group.position.z }));
    const ridge = makeRidge(row);
    ridges.push(ridge);

    const step = (progress: number): void => {
      band.position.y = lerp(fromY, toY, phase(progress, 0, 0.25));
      for (const { ridge: older, fromZ } of shifting) older.group.position.z = lerp(fromZ, ridgeZ(older.depthIndex), phase(progress, 0.2, 0.6));
      placeRidge(ridge, phase(progress, 0.45, 1), phase(progress, 0.2, 0.45), 0);
    };
    if (options.reducedMotion) {
      step(1);
      requestRender();
      return;
    }
    step(0);
    tweens.push({ startMs: performance.now(), durationMs: LOOKUP_MS, step });
    requestRender();
  }

  function clear(): void {
    tweens.length = 0;
    while (ridges.length) {
      const ridge = ridges.pop();
      if (ridge) removeRidge(ridge);
    }
    band.visible = false;
    bandTag.hidden = true;
    hideTooltip();
    requestRender();
  }

  // --- Camera, sizing and the overlay tags ---------------------------------

  function fitCamera(): void {
    const width = host.clientWidth;
    const height = Math.round(Math.max(300, Math.min(460, width * 0.62)));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    const tanHalf = Math.tan((FIELD_OF_VIEW * Math.PI) / 360);
    view.distance = Math.max(VIEW_HALF.y / tanHalf, VIEW_HALF.x / (tanHalf * camera.aspect)) * 1.08;
    camera.updateProjectionMatrix();
  }

  function aimCamera(): void {
    const { yaw, pitch, distance } = view;
    camera.position.set(
      VIEW_TARGET.x + distance * Math.sin(yaw) * Math.cos(pitch),
      VIEW_TARGET.y + distance * Math.sin(pitch),
      VIEW_TARGET.z + distance * Math.cos(yaw) * Math.cos(pitch),
    );
    camera.lookAt(VIEW_TARGET);
    camera.updateMatrixWorld();
  }

  const projected = new Vector3();
  function pinTag(element: HTMLElement, x: number, y: number, z: number): void {
    projected.set(x, y, z).project(camera);
    // Tags hanging left of their point (CSS translate -100%) stay inside the
    // stage on narrow screens instead of running off its left edge.
    const hangsLeft = !element.classList.contains('is-band');
    const left = Math.max(hangsLeft ? element.offsetWidth + 4 : 0, ((projected.x + 1) / 2) * host.clientWidth);
    const top = ((1 - projected.y) / 2) * renderer.domElement.clientHeight;
    element.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
  }

  function pinTags(): void {
    const towerLeft = TOWER.x - TOWER.width / 2 - 0.08;
    pinTag(towerTop, towerLeft, TOWER.height / 2, TOWER.depth / 2);
    pinTag(towerBottom, towerLeft, -TOWER.height / 2, TOWER.depth / 2);
    pinTag(bandTag, TOWER.x + TOWER.width / 2 + 0.1, band.position.y, TOWER.depth / 2);
    for (const ridge of ridges) {
      const { x, y, z } = ridge.group.position;
      pinTag(ridge.label, x - 0.08, y, z);
      ridge.label.classList.toggle('is-front', ridge === ridges[ridges.length - 1]);
    }
  }

  // --- Rendering on demand --------------------------------------------------

  let frameQueued = false;
  function requestRender(): void {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(frame);
  }

  function frame(nowMs: number): void {
    frameQueued = false;
    // The demo can leave the page (hx-boost navigation); stop with it.
    if (!renderer.domElement.isConnected) {
      renderer.dispose();
      return;
    }
    for (const tween of [...tweens]) {
      const progress = clamp01((nowMs - tween.startMs) / tween.durationMs);
      tween.step(progress);
      if (progress >= 1) tweens.splice(tweens.indexOf(tween), 1);
    }
    aimCamera();
    renderer.render(scene, camera);
    pinTags();
    if (tweens.length) requestRender();
  }

  // --- Dragging to turn, hovering to read one number -------------------------

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const ridgePlane = new Plane(new Vector3(0, 0, 1), 0);
  const hit = new Vector3();
  let drag: { x: number; y: number; yaw: number; pitch: number } | null = null;
  let highlighted: { ridge: Ridge; column: number } | null = null;

  function hideTooltip(): void {
    if (tooltip) tooltip.hidden = true;
    if (!highlighted) return;
    paintBars(highlighted.ridge);
    highlighted = null;
    requestRender();
  }

  function columnUnder(event: PointerEvent): { ridge: Ridge; column: number } | null {
    const front = ridges[ridges.length - 1];
    if (!front || front.unfold < 1) return null;
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    ridgePlane.constant = -front.group.position.z;
    if (!raycaster.ray.intersectPlane(ridgePlane, hit)) return null;
    const column = Math.floor((hit.x - RIDGE.left) / barWidth);
    const nearRidge = Math.abs(hit.y - RIDGE.baseline) < 1.6;
    if (!nearRidge || column < 0 || column >= front.row.values.length) return null;
    return { ridge: front, column };
  }

  function showTooltip(event: PointerEvent): void {
    const under = columnUnder(event);
    if (!under || !tooltip) {
      hideTooltip();
      return;
    }
    if (highlighted?.column !== under.column) {
      paintBars(under.ridge, under.column);
      highlighted = under;
      requestRender();
    }
    const value = under.ridge.row.values[under.column];
    // Four decimals: the values are stored to four, so this is the true number rounded.
    tooltip.textContent = `column ${under.column}: ${value.toFixed(4).replace('-', '−')}`;
    const bounds = host.getBoundingClientRect();
    tooltip.style.transform = `translate(${(event.clientX - bounds.left).toFixed(0)}px, ${(event.clientY - bounds.top).toFixed(0)}px)`;
    tooltip.hidden = false;
  }

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, y: event.clientY, yaw: view.yaw, pitch: view.pitch };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) {
      showTooltip(event);
      return;
    }
    view.yaw = Math.max(-0.95, Math.min(0.5, drag.yaw - (event.clientX - drag.x) * 0.006));
    view.pitch = Math.max(0, Math.min(0.8, drag.pitch + (event.clientY - drag.y) * 0.004));
    hideTooltip();
    requestRender();
  });
  const endDrag = (): void => {
    drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', hideTooltip);

  // --- Theme and size --------------------------------------------------------

  function repaint(): void {
    palette = readPalette(host);
    towerFace.uniforms.negative.value = palette.negative;
    towerFace.uniforms.middle.value = palette.middle;
    towerFace.uniforms.positive.value = palette.positive;
    towerSide.color.copy(palette.side);
    bandMaterial.color.copy(palette.accent);
    zeroLineMaterial.color.copy(palette.side);
    for (const ridge of ridges) paintBars(ridge);
    requestRender();
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);

  new ResizeObserver(() => {
    fitCamera();
    requestRender();
  }).observe(host);
  fitCamera();
  requestRender();

  return { show, clear };
}
