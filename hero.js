import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------------------------------------------------------------------------
// Home page hero: a tiny useless machine built into the headline.
// The "i" in "doing" is the toggle switch, the underline under "do" is the lid,
// and a gloved hand comes out from under it to switch the i off again.
//
// The 3D layer is a transparent canvas over the hero. The camera is set up so
// one world unit is one CSS pixel on the z = 0 plane, which lets the machine
// parts sit exactly on the HTML letters they stand in for.
// ---------------------------------------------------------------------------

const deg = THREE.MathUtils.degToRad;

// Mechanism, in headline font-size units, measured from the foot of the i.
// x grows to the right, y grows up from the baseline.
const LEVER = { r: 0.05, knob: 0.085, on: deg(20), off: deg(-20), z: 0.05 };
const LID = { t: 0.085, d: 0.24, drop: 0.035, z: -0.1 }; // thickness, depth, gap under the baseline
const ARM = { x: -0.8, down: -1.9, up: -0.9, z: 0.12, fingerR: 0.045 };
const TIP = { x: 0.335, y: 1.5 }; // fingertip, relative to the arm pivot
const CLIP_Y = -LID.drop; // the hand is only drawn above the slot
const ARM_CLEAR = -1.75; // below this the hand is fully back inside
const LID_OPEN = deg(36);
const LID_PEEK = deg(12);
const ARM_PUSH = deg(22);
const TEASE_AT = deg(6);

const hero = document.getElementById('hero');
const stage = document.getElementById('hero-stage');
const title = document.getElementById('hero-title');
const statusEl = document.getElementById('hero-status');
const flipBtn = document.getElementById('hero-flip');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ---------------------------------------------------------------------------
// Renderer, scene, lights. If WebGL is missing this throws, the module stops
// here and the headline simply stays plain text.
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera();

const hemi = new THREE.HemisphereLight(0xfff4ee, 0x3a2a30, 0.6);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.02;
scene.add(key, key.target);

// Invisible page that only catches the parts' shadows
const catcherMat = new THREE.ShadowMaterial({ opacity: 0.13 });
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), catcherMat);
catcher.receiveShadow = true;
scene.add(catcher);

// Everything below lives in the rig: origin at the foot of the i, 1 unit = font size
const rig = new THREE.Group();
scene.add(rig);

// The hand may only be seen above the slot
const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// ---------------------------------------------------------------------------
// Headline: split into letters (for the switch-on wave) and wait for the font
// ---------------------------------------------------------------------------
await document.fonts.load('800 100px Recursive').catch(() => {});

function splitLetters(root) {
  const label = root.textContent.replace(/\s+/g, ' ').trim();
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  visual.append(...root.childNodes);

  const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    if (!node.textContent.trim()) continue;
    const frag = document.createDocumentFragment();
    for (const ch of node.textContent) {
      if (ch === ' ') {
        frag.append(' ');
        continue;
      }
      const span = document.createElement('span');
      span.className = 'hero-ch';
      span.textContent = ch;
      frag.append(span);
    }
    node.replaceWith(frag);
  }

  const readable = document.createElement('span');
  readable.className = 'visually-hidden';
  readable.textContent = label;
  root.append(readable, visual);
  return [...visual.querySelectorAll('.hero-ch')];
}

const letters = splitLetters(title);
const switchEl = title.querySelector('.hero-switch');
const lidEl = title.querySelector('.hero-lid');
const probe = document.createElement('span'); // zero-size box that sits on the baseline
probe.className = 'hero-probe';
switchEl.before(probe);

// Size the lever like the font's own i: stem up to the x-height, ball where the dot is
function glyphMetrics() {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `800 100px ${getComputedStyle(title).fontFamily}`;
  const dotTop = ctx.measureText('i').actualBoundingBoxAscent / 100 || 0.75;
  const xHeight = ctx.measureText('x').actualBoundingBoxAscent / 100 || 0.53;
  return { dotTop, xHeight };
}
const glyph = glyphMetrics();
LEVER.len = glyph.dotTop - LEVER.knob; // pivot to the centre of the ball

// ---------------------------------------------------------------------------
// Materials (the same family as the machine page)
// ---------------------------------------------------------------------------
function woodTexture(base, grain) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const y = Math.random() * 512;
    const amp = 2 + Math.random() * 6;
    const freq = 0.004 + Math.random() * 0.01;
    const phase = Math.random() * Math.PI * 2;
    ctx.strokeStyle = grain;
    ctx.globalAlpha = 0.04 + Math.random() * 0.18;
    ctx.lineWidth = 0.5 + Math.random() * 2.5;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const yy = y + Math.sin(x * freq + phase) * amp;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 0.12); // the lid is a thin strip, so only use a slice of the grain
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const chrome = new THREE.MeshStandardMaterial({ color: 0xf2f2f5, metalness: 1, roughness: 0.24, envMapIntensity: 1.8 });
const brass = new THREE.MeshStandardMaterial({ color: 0xc9a253, metalness: 1, roughness: 0.3 });
const wood = new THREE.MeshStandardMaterial({ map: woodTexture('#82512f', '#3b2112'), roughness: 0.5 });
const slotMat = new THREE.MeshStandardMaterial({ color: 0x1b1214, roughness: 1 });
const knobMat = new THREE.MeshStandardMaterial({ roughness: 0.22, metalness: 0.1 }); // colour follows the headline
const glove = new THREE.MeshStandardMaterial({ color: 0xf6f1ea, roughness: 0.7, clippingPlanes: [clip], clipShadows: true });
const rodMat = new THREE.MeshStandardMaterial({ color: 0x2c2b30, metalness: 0.8, roughness: 0.35, clippingPlanes: [clip], clipShadows: true });

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

// The switch: chrome base, a stem as tall as the x-height, a thin neck, and a ball for the dot
rig.add(mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.016, 40), chrome, 0, 0.008, LEVER.z));
rig.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.045, 6), chrome, 0, 0.03, LEVER.z));
const lever = new THREE.Group();
lever.position.z = LEVER.z;
const stemH = glyph.xHeight - 0.04;
lever.add(mesh(new THREE.CylinderGeometry(LEVER.r, LEVER.r * 1.15, stemH, 24), chrome, 0, 0.04 + stemH / 2, 0));
const neckH = LEVER.len - glyph.xHeight;
lever.add(mesh(new THREE.CylinderGeometry(LEVER.r * 0.45, LEVER.r * 0.45, neckH, 16), chrome, 0, glyph.xHeight + neckH / 2, 0));
lever.add(mesh(new THREE.SphereGeometry(LEVER.knob, 32, 20), knobMat, 0, LEVER.len, 0));
rig.add(lever);

// The lid (the underline) with its hinge, and the dark slot it covers.
// Their length depends on the text, so they are (re)built in applyLayout().
const lid = new THREE.Group();
rig.add(lid);
let lidMesh = null;
let lidLength = 0;
const slot = new THREE.Mesh(new THREE.BufferGeometry(), slotMat);
rig.add(slot);
const hinge = mesh(new THREE.CylinderGeometry(0.028, 0.028, LID.d + 0.02, 16), brass);
hinge.rotation.x = Math.PI / 2;
rig.add(hinge);

function buildLid(length) {
  if (Math.abs(length - lidLength) < 0.005) return;
  lidLength = length;
  if (lidMesh) {
    lid.remove(lidMesh);
    lidMesh.geometry.dispose();
  }
  lidMesh = mesh(new RoundedBoxGeometry(length, LID.t, LID.d, 2, 0.02), wood, length / 2, -LID.t / 2, 0);
  lid.add(lidMesh);
  slot.geometry.dispose();
  slot.geometry = new THREE.BoxGeometry(length - 0.01, LID.t - 0.01, LID.d - 0.02);
}

// The arm: a rod that pivots below the page, ending in a gloved hand that points at the i
const arm = new THREE.Group();
arm.position.set(ARM.x, ARM.down, ARM.z);
arm.add(mesh(new THREE.BoxGeometry(0.075, 1.36, 0.075), rodMat, 0, 0.68, 0));
arm.add(mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.1, 24), glove, 0, 1.37, 0));
const fist = mesh(new THREE.SphereGeometry(0.15, 28, 20), glove, 0.02, 1.48, 0);
fist.scale.set(1.05, 0.95, 1.05);
arm.add(fist);
const finger = mesh(new THREE.CapsuleGeometry(ARM.fingerR, 0.17, 6, 14), glove, TIP.x - 0.085, TIP.y, 0);
finger.rotation.z = -Math.PI / 2;
arm.add(finger);
for (const [kx, ky] of [[0.14, 1.43], [0.13, 1.37]]) {
  arm.add(mesh(new THREE.SphereGeometry(0.05, 14, 10), glove, kx, ky, 0.05)); // curled fingers
}
const thumb = mesh(new THREE.CapsuleGeometry(0.038, 0.08, 4, 10), glove, 0.08, 1.58, 0.1);
thumb.rotation.set(deg(-25), 0, deg(-65));
arm.add(thumb);
rig.add(arm);

// ---------------------------------------------------------------------------
// Layout: keep the rig glued to the letters and the camera glued to the page
// ---------------------------------------------------------------------------
const L = { W: 0, H: 0, F: 0, x: 0, y: 0, lidFrom: 0, lidTo: 0 };
const shake = { x: 0, y: 0 }; // current shake offset of the headline, in CSS px

function measure() {
  const box = stage.getBoundingClientRect();
  if (!box.width || !box.height) return false;
  const sw = switchEl.getBoundingClientRect();
  const lidBox = lidEl.getBoundingClientRect();
  const F = parseFloat(getComputedStyle(title).fontSize);
  const cx = sw.left + sw.width / 2 - shake.x;
  const base = probe.getBoundingClientRect().bottom - shake.y;
  const next = {
    W: box.width,
    H: box.height,
    F,
    x: cx - box.left - box.width / 2,
    y: box.top + box.height / 2 - base,
    lidFrom: (lidBox.left - shake.x - cx) / F,
    lidTo: (lidBox.right - shake.x - cx) / F,
  };
  const changed = Object.keys(next).some((k) => Math.abs(next[k] - L[k]) > 0.01);
  if (changed) {
    const resized = next.W !== L.W || next.H !== L.H;
    Object.assign(L, next);
    applyLayout(resized);
  }
  return changed;
}

function applyLayout(resized) {
  const { W, H, F, x, y } = L;
  if (resized) renderer.setSize(W, H, false);

  // Camera straight in front of the page, a little above the switch. The
  // frustum is shifted so the z = 0 plane still maps 1:1 onto the canvas.
  const D = 10 * F;
  const cx = x;
  const cy = y + 2.5 * F;
  camera.position.set(cx, cy, D);
  camera.lookAt(cx, cy, 0);
  camera.near = D * 0.2;
  camera.far = D * 3;
  const k = camera.near / D;
  camera.projectionMatrix.makePerspective((-W / 2 - cx) * k, (W / 2 - cx) * k, (H / 2 - cy) * k, (-H / 2 - cy) * k, camera.near, camera.far);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

  rig.scale.setScalar(F);
  buildLid(L.lidTo - L.lidFrom - 0.03);
  lid.position.set(L.lidFrom, -LID.drop, LID.z);
  slot.position.set(L.lidFrom + lidLength / 2, -LID.drop - LID.t / 2, LID.z - 0.01);
  hinge.position.set(L.lidFrom, -LID.drop, LID.z);

  catcher.scale.set(W, H, 1);
  catcher.position.z = -0.15 * F;
  key.position.set(x - 1.5 * F, y + 3 * F, 7 * F);
  key.target.position.set(x, y, 0);
  const sc = key.shadow.camera;
  sc.left = sc.bottom = -3 * F;
  sc.right = sc.top = 3 * F;
  sc.near = 0.5 * F;
  sc.far = 16 * F;
  sc.updateProjectionMatrix();

  // Letters closer to the switch react first
  const sw = switchEl.getBoundingClientRect();
  const sx = sw.left + sw.width / 2;
  const sy = sw.top + sw.height / 2;
  for (const ch of letters) {
    const r = ch.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - sx, r.top + r.height / 2 - sy) / F;
    ch.style.setProperty('--wave', `${Math.round(d * 70)}ms`);
  }
}

// ---------------------------------------------------------------------------
// Sound: the click and thunk from the machine page (created on first flip)
// ---------------------------------------------------------------------------
const sound = {
  ctx: null,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) this.ctx = new AC();
  },

  click(strength = 1) {
    const ctx = this.ctx;
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3200;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = 0.5 * strength;
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start();
  },

  thunk(strength = 1) {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4 * strength, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  },
};

// ---------------------------------------------------------------------------
// Behaviour (the machine's moods, retuned for a lid that is one word long).
// Speeds: lid/push/back/close in rad/s, rise/drop in font-sizes per second.
// ---------------------------------------------------------------------------
const MOODS = {
  normal: { delay: 0.9, lid: deg(110), rise: 2.6, push: deg(80), hold: 0.3, back: deg(90), drop: 3, close: deg(110),
    lines: ['Off. As it should be.', 'No.', 'Switched off. Again.'] },
  lazy: { delay: 1.3, lid: deg(45), rise: 0.9, push: deg(35), hold: 0.7, back: deg(35), drop: 1, close: deg(40),
    lines: ['*sigh* ...fine.', 'Do we really have to do this?', 'Slowly... off.'] },
  angry: { delay: 0.02, lid: deg(520), rise: 9, push: deg(400), hold: 0, back: deg(400), drop: 9, close: deg(900), slam: true,
    lines: ['STOP. TOUCHING. IT.', 'I said OFF!', 'Leave. Me. Alone.'] },
  peek: { delay: 0.5, lid: deg(130), rise: 3, push: deg(110), hold: 0.25, back: deg(100), drop: 3, close: deg(110), peek: true,
    lines: ['...is someone there?', 'Peek-a-boo. Off.', 'Just checking. Off.'] },
  tease: { delay: 0.4, lid: deg(150), rise: 3, push: deg(80), hold: 0.5, back: deg(100), drop: 3, close: deg(120), tease: 1.1,
    lines: ['Hmm... I could leave it on...', 'Thinking about it... nope.', 'Tempting. But no.'] },
};

const state = {
  switchOn: false,
  lever: LEVER.off,
  leverTarget: LEVER.off,
  lid: 0,
  armY: ARM.down,
  swing: 0,
  phase: 'idle',
  timer: 0,
  mood: MOODS.normal,
  run: {},
  count: 0,
  lastDone: -Infinity,
  streak: 0,
  shake: 0,
  hover: false,
  touched: false,
};

const colors = { ink: new THREE.Color(), on: new THREE.Color(), knob: new THREE.Color() };
const clock = new THREE.Clock();
let elapsed = 0;

function say(text) {
  statusEl.textContent = text;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function approach(current, target, maxStep) {
  if (Math.abs(target - current) <= maxStep) return target;
  return current + Math.sign(target - current) * maxStep;
}

function pickMood() {
  const quick = state.phase !== 'idle' || elapsed - state.lastDone < 2.5;
  state.streak = quick ? state.streak + 1 : 0;

  if (state.count === 0) return MOODS.normal;
  if (state.streak >= 2) return MOODS.angry;

  const roll = Math.random();
  if (roll < 0.4) return MOODS.normal;
  if (roll < 0.57) return MOODS.tease;
  if (roll < 0.74) return MOODS.peek;
  if (roll < 0.9) return MOODS.lazy;
  return MOODS.angry;
}

function setSwitch(on) {
  state.switchOn = on;
  state.leverTarget = on ? LEVER.on : LEVER.off;
  title.classList.toggle('is-on', on);
}

function flip() {
  state.touched = true;
  sound.init();
  if (sound.ctx && sound.ctx.state === 'suspended') sound.ctx.resume();

  if (state.switchOn) {
    // The visitor switched it off themselves
    setSwitch(false);
    sound.click(0.8);
    if (state.phase !== 'idle') {
      state.phase = 'retract';
      say('Oh. You did it yourself. Thanks, I guess.');
    }
    return;
  }

  setSwitch(true);
  sound.click();
  state.mood = pickMood();
  state.run = {};

  if (state.phase === 'hold' || state.phase === 'retract') {
    // Caught it on the way back in: come straight back out
    state.phase = state.lid > LID_OPEN * 0.7 ? 'rise' : 'open';
  } else if (state.phase === 'idle') {
    state.phase = 'wait';
    state.timer = state.mood.delay;
  }
  // (a peek that is already under way carries on and leads into 'wait' itself)
  say(state.mood === MOODS.angry ? '...' : 'Switch is on.');
}

function fingertip() {
  const c = Math.cos(state.swing);
  const s = Math.sin(state.swing);
  return { x: ARM.x + TIP.x * c + TIP.y * s, y: state.armY - TIP.x * s + TIP.y * c };
}

// Advances the machine by dt seconds. Returns true while anything is moving.
function update(dt) {
  const m = state.mood;
  const prevLid = state.lid;

  switch (state.phase) {
    case 'wait':
      state.timer -= dt;
      if (state.timer <= 0) state.phase = m.peek && !state.run.peeked ? 'peekOpen' : 'open';
      break;

    case 'peekOpen':
      state.lid = approach(state.lid, LID_PEEK, deg(40) * dt);
      if (state.lid === LID_PEEK) {
        state.phase = 'peekHold';
        state.timer = state.run.hintOnly ? 0.7 : 1.0;
      }
      break;

    case 'peekHold':
      state.timer -= dt;
      if (state.timer <= 0) state.phase = 'peekClose';
      break;

    case 'peekClose':
      state.lid = approach(state.lid, 0, deg(160) * dt);
      if (state.lid === 0) {
        sound.thunk(0.4);
        if (state.run.hintOnly) {
          state.phase = 'idle';
        } else {
          state.run.peeked = true;
          state.phase = 'wait';
          state.timer = 0.5;
        }
      }
      break;

    case 'open':
      state.lid = approach(state.lid, LID_OPEN, m.lid * dt);
      if (state.lid >= LID_OPEN * 0.7) state.phase = 'rise';
      break;

    case 'rise':
      state.lid = approach(state.lid, LID_OPEN, m.lid * dt);
      state.swing = approach(state.swing, 0, m.back * dt);
      state.armY = approach(state.armY, ARM.up, m.rise * dt);
      if (state.armY === ARM.up && state.swing === 0) state.phase = 'reach';
      break;

    case 'reach': {
      if (m.tease && !state.run.teased && state.swing >= TEASE_AT) {
        state.swing = TEASE_AT;
        state.phase = 'tease';
        state.timer = m.tease;
        say(pick(m.lines));
        break;
      }
      const speed = state.run.teased ? m.push * 2.5 : m.push;
      state.swing = approach(state.swing, ARM_PUSH, speed * dt);
      if (state.swing === ARM_PUSH) {
        state.phase = 'hold';
        state.timer = m.hold;
      }
      break;
    }

    case 'tease':
      state.timer -= dt;
      // a little hesitant wobble, finger on the switch
      state.swing = TEASE_AT - Math.abs(Math.sin(state.timer * 9)) * deg(2.5);
      if (state.timer <= 0) {
        state.run.teased = true;
        state.phase = 'reach';
      }
      break;

    case 'hold':
      state.timer -= dt;
      if (state.timer <= 0) state.phase = 'retract';
      break;

    case 'retract':
      state.swing = approach(state.swing, 0, m.back * dt);
      if (state.swing < ARM_PUSH * 0.4) state.armY = approach(state.armY, ARM.down, m.drop * dt);
      if (state.armY < ARM_CLEAR) state.lid = approach(state.lid, 0, m.close * dt);
      if (state.lid === 0 && prevLid > 0) {
        sound.thunk(m.slam ? 1 : 0.5);
        if (m.slam) state.shake = 1;
      }
      if (state.armY === ARM.down && state.lid === 0) {
        state.phase = 'idle';
        state.lastDone = elapsed;
      }
      break;
  }

  // Lever: snaps to its position, leans a little toward "on" when hovered,
  // and gets pushed over centre by the finger
  const target = !state.switchOn && state.hover && state.phase === 'idle' ? LEVER.off + deg(6) : state.leverTarget;
  const prevLever = state.lever;
  state.lever = approach(state.lever, target, (Math.abs(target - state.lever) < deg(8) ? deg(80) : deg(900)) * dt);

  if (state.switchOn) {
    const p = fingertip();
    const dist = Math.hypot(p.x, p.y);
    if (p.y > 0 && dist < LEVER.len + LEVER.knob + ARM.fingerR) {
      const reach = dist > LEVER.len - LEVER.knob ? LEVER.knob : LEVER.r;
      const contact = Math.atan2(-p.x, p.y) - Math.asin(Math.min(1, (ARM.fingerR + reach) / dist));
      if (contact < state.lever) state.lever = contact;
      if (state.lever <= 0) {
        // Over centre: it snaps off
        setSwitch(false);
        state.count++;
        sound.click(m.slam ? 1.2 : 1);
        if (state.phase === 'reach' || state.phase === 'tease') {
          state.phase = 'hold';
          state.timer = m.hold;
        }
        if (!m.tease) say(pick(m.lines));
      }
    }
  }

  // Slam shake moves the letters and the parts together
  if (state.shake > 0 && !reduceMotion.matches) {
    state.shake = Math.max(0, state.shake - dt * 3);
    const k = state.shake * state.shake * 0.05 * L.F;
    shake.x = Math.sin(elapsed * 90) * k;
    shake.y = -Math.abs(Math.sin(elapsed * 60)) * k;
  } else {
    state.shake = 0;
    shake.x = shake.y = 0;
  }
  title.style.transform = state.shake ? `translate(${shake.x}px, ${shake.y}px)` : '';

  // The ball is the dot of the i, so it changes colour with the letters
  const knobGoal = state.switchOn ? colors.on : colors.ink;
  colors.knob.lerp(knobGoal, 1 - Math.exp(-dt * 10));
  knobMat.color.copy(colors.knob);
  const knobSettling = Math.abs(colors.knob.r - knobGoal.r) + Math.abs(colors.knob.g - knobGoal.g) + Math.abs(colors.knob.b - knobGoal.b) > 0.003;

  // Apply to the scene graph
  rig.position.set(L.x + shake.x, L.y - shake.y, 0);
  clip.constant = -(rig.position.y + CLIP_Y * L.F);
  arm.position.y = state.armY;
  arm.rotation.z = -state.swing;
  lid.rotation.z = state.lid;
  lever.rotation.z = state.lever;

  return state.phase !== 'idle' || state.lever !== prevLever || state.shake > 0 || knobSettling;
}

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------
switchEl.addEventListener('click', flip);
switchEl.addEventListener('pointerenter', () => (state.hover = true));
switchEl.addEventListener('pointerleave', () => (state.hover = false));
flipBtn.addEventListener('click', flip);

// A visitor who hasn't touched anything gets one small hint: the lid peeks open
setTimeout(() => {
  if (state.touched || state.phase !== 'idle' || reduceMotion.matches || !visible) return;
  state.run = { hintOnly: true };
  state.phase = 'peekOpen';
}, 4000);

// ---------------------------------------------------------------------------
// Theme, visibility, loop
// ---------------------------------------------------------------------------
let dirty = true;

function applyTheme() {
  const dark = document.body.classList.contains('dark-mode');
  colors.ink.setStyle(getComputedStyle(title).color);
  colors.on.setStyle(getComputedStyle(hero).getPropertyValue('--hero-on').trim() || '#c0517a');
  colors.knob.copy(state.switchOn ? colors.on : colors.ink);
  catcherMat.opacity = dark ? 0.35 : 0.13;
  hemi.intensity = dark ? 0.45 : 0.6;
  dirty = true;
}
applyTheme();
new MutationObserver(applyTheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });

let visible = true;
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
}).observe(hero);

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  if (!visible) return;
  elapsed += dt;
  const moved = measure();
  const busy = update(dt);
  if (moved || busy || dirty) {
    renderer.render(scene, camera);
    dirty = false;
  }
});

hero.classList.add('is-live');
