import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const deg = THREE.MathUtils.degToRad;

// ---------------------------------------------------------------------------
// Dimensions (machine-local units). The box spans x -2..2, y 0..1.8, z -1.2..1.2.
// The lid covers x -2..1, hinged on the left edge; the switch sits on the fixed
// panel at x 1..2. The arm pivots inside the box and swings up through the lid.
// ---------------------------------------------------------------------------
const BOX = { w: 4, h: 1.8, d: 2.4, t: 0.1, lidEnd: 1.0 };
const ARM = { x: 0.4, y: 0.45, len: 1.85, finger: 0.42, fingerR: 0.055 };
const LEVER = { x: 1.4, y: 1.86, len: 0.5, r: 0.045, on: deg(25), off: deg(-25) };
const LID_OPEN = deg(36);
const LID_PEEK = deg(13);
const ARM_MAX = deg(110);
const ARM_CLEAR = deg(24); // below this the arm is fully under the lid
const TEASE_AT = deg(92);

// ---------------------------------------------------------------------------
// Scene setup
// ---------------------------------------------------------------------------
const stage = document.getElementById('machine-stage');
const statusEl = document.getElementById('machine-status');
const countEl = document.getElementById('machine-count');
const flipBtn = document.getElementById('flip-btn');
const soundBtn = document.getElementById('sound-btn');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(5.6, 4.6, 8.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.2, 1.5, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 16;
controls.maxPolarAngle = deg(84);
controls.update();

// Lights
const hemi = new THREE.HemisphereLight(0xfff4ee, 0x3a2a30, 0.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1e0, 2.4);
sun.position.set(4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -5;
sun.shadow.camera.right = 5;
sun.shadow.camera.top = 5;
sun.shadow.camera.bottom = -5;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun);

const rim = new THREE.DirectionalLight(0xd97a9a, 0.8);
rim.position.set(-6, 3, -4);
scene.add(rim);

// Floor that only shows the shadow, so the page background shows through
const floorMat = new THREE.ShadowMaterial({ opacity: 0.25 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ---------------------------------------------------------------------------
// Textures
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
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function textTexture(lines, { width = 512, height = 128, color = '#2b1a12', bg = null, font = 'bold 64px Georgia, serif' } = {}) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fonts = Array.isArray(font) ? font : [font];
  lines.forEach((line, i) => {
    ctx.font = fonts[i] || fonts[0];
    ctx.fillText(line, width / 2, (height / (lines.length + 1)) * (i + 1));
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
const wood = new THREE.MeshStandardMaterial({ map: woodTexture('#7a4a2c', '#3b2112'), roughness: 0.55, metalness: 0 });
const lidWood = new THREE.MeshStandardMaterial({ map: woodTexture('#82512f', '#3b2112'), roughness: 0.5, metalness: 0 });
const interior = new THREE.MeshStandardMaterial({ color: 0x1b1214, roughness: 0.95 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xe8e8ec, metalness: 1, roughness: 0.18 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2c2b30, metalness: 0.8, roughness: 0.35 });
const brass = new THREE.MeshStandardMaterial({ color: 0xc9a253, metalness: 1, roughness: 0.3 });
const glove = new THREE.MeshStandardMaterial({ color: 0xf6f1ea, roughness: 0.7 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const knobMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.2, roughness: 0.25 });
const ledMat = new THREE.MeshStandardMaterial({ color: 0x330a0a, emissive: 0xff2a2a, emissiveIntensity: 0 });

function mesh(geo, mat, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

// ---------------------------------------------------------------------------
// The machine
// ---------------------------------------------------------------------------
const machine = new THREE.Group();
machine.position.y = 0.06; // sits on little rubber feet
scene.add(machine);

const { w, h, d, t } = BOX;
const wallH = h - t;

// Outer box (walls + bottom)
machine.add(mesh(new THREE.BoxGeometry(w, wallH, t), wood, 0, wallH / 2, d / 2 - t / 2));
machine.add(mesh(new THREE.BoxGeometry(w, wallH, t), wood, 0, wallH / 2, -d / 2 + t / 2));
machine.add(mesh(new THREE.BoxGeometry(t, wallH, d - 2 * t), wood, -w / 2 + t / 2, wallH / 2, 0));
machine.add(mesh(new THREE.BoxGeometry(t, wallH, d - 2 * t), wood, w / 2 - t / 2, wallH / 2, 0));
machine.add(mesh(new THREE.BoxGeometry(w - 2 * t, t, d - 2 * t), interior, 0, t / 2, 0));

// Dark lining so the inside reads as a cavity when the lid opens
const lining = new THREE.MeshStandardMaterial({ color: 0x140d0f, roughness: 1, side: THREE.BackSide });
machine.add(mesh(new THREE.BoxGeometry(w - 2 * t - 0.01, wallH - t, d - 2 * t - 0.01), lining, 0, t + (wallH - t) / 2, 0, { cast: false }));

// Feet
for (const [fx, fz] of [[-1.7, -0.95], [1.7, -0.95], [-1.7, 0.95], [1.7, 0.95]]) {
  machine.add(mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, 20), rubber, fx, -0.03, fz));
}

// Fixed top panel that carries the switch
const panelW = w / 2 - BOX.lidEnd;
machine.add(mesh(new THREE.BoxGeometry(panelW, t, d), wood, BOX.lidEnd + panelW / 2, h - t / 2, 0));

// Lid, hinged along the left top edge
const lid = new THREE.Group();
lid.position.set(-w / 2, h, 0);
const lidLen = BOX.lidEnd + w / 2 - 0.01;
lid.add(mesh(new THREE.BoxGeometry(lidLen, t, d), lidWood, lidLen / 2, -t / 2, 0));
machine.add(lid);

// Hinges
for (const hz of [-0.75, 0.75]) {
  const hinge = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.4, 16), brass, -w / 2, h, hz);
  hinge.rotation.x = Math.PI / 2;
  machine.add(hinge);
}

// Brass plaque on the front
const plaqueTex = textTexture(['THE ULTIMATE MACHINE', 'BELL TELEPHONE LABORATORIES · 1953'], {
  width: 1024,
  height: 220,
  color: '#3a2810',
  bg: '#d8b56a',
  font: ['bold 74px Georgia, serif', 'italic 40px Georgia, serif'],
});
const plaque = mesh(
  new THREE.BoxGeometry(1.9, 0.42, 0.02),
  [brass, brass, brass, brass, new THREE.MeshStandardMaterial({ map: plaqueTex, metalness: 0.75, roughness: 0.35 }), brass],
  0, 0.9, d / 2 + 0.01
);
machine.add(plaque);
for (const sx of [-0.88, 0.88]) {
  const screw = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), chrome, sx, 0.9, d / 2 + 0.025);
  screw.rotation.x = Math.PI / 2;
  machine.add(screw);
}

// ON / OFF engraving next to the switch
function label(text, x, z) {
  const tex = textTexture([text], { width: 256, height: 128, color: '#f6ead6', font: 'bold 84px Helvetica, Arial, sans-serif' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.95 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, h + 0.002, z);
  machine.add(m);
}
label('ON', LEVER.x - 0.3, 0.52);
label('OFF', LEVER.x + 0.3, 0.52);

// Toggle switch
const switchGroup = new THREE.Group();
switchGroup.add(mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.035, 40), chrome, LEVER.x, h + 0.018, 0));
switchGroup.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 6), chrome, LEVER.x, h + 0.07, 0));
switchGroup.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 24), chrome, LEVER.x, h + 0.12, 0));
machine.add(switchGroup);

const lever = new THREE.Group();
lever.position.set(LEVER.x, LEVER.y, 0);
lever.add(mesh(new THREE.CylinderGeometry(0.032, LEVER.r, LEVER.len - 0.05, 24), chrome, 0, (LEVER.len - 0.05) / 2, 0));
lever.add(mesh(new THREE.SphereGeometry(0.07, 24, 16), knobMat, 0, LEVER.len - 0.03, 0));
machine.add(lever);

// Motor + LED inside the box
const motor = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 28), darkMetal, ARM.x, ARM.y, -0.55);
motor.rotation.x = Math.PI / 2;
machine.add(motor);
machine.add(mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), darkMetal, ARM.x + 0.2, 0.28, -0.75));
const led = mesh(new THREE.SphereGeometry(0.04, 16, 12), ledMat, ARM.x + 0.45, 0.48, -0.5, { cast: false });
machine.add(led);
const glow = new THREE.PointLight(0xff3b30, 0, 2.6, 2);
glow.position.set(ARM.x + 0.3, 0.8, -0.3);
machine.add(glow);

// The arm: a bar on a hub, ending in a gloved hand with a pointing finger.
// Local frame: at rest the arm lies along -x; raising rotates it about z.
const arm = new THREE.Group();
arm.position.set(ARM.x, ARM.y, 0);
const hub = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 24), chrome, 0, 0, -0.08);
hub.rotation.x = Math.PI / 2;
arm.add(hub);
const barLen = ARM.len - 0.15;
arm.add(mesh(new THREE.BoxGeometry(barLen, 0.12, 0.14), darkMetal, -barLen / 2, 0, 0));
const cuff = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 24), glove, -ARM.len + 0.17, 0, 0);
cuff.rotation.z = Math.PI / 2;
arm.add(cuff);
const fist = mesh(new THREE.SphereGeometry(0.17, 24, 18), glove, -ARM.len, 0.02, 0);
fist.scale.set(0.95, 1, 1.15);
arm.add(fist);
const fingerLen = ARM.finger - 0.1;
arm.add(mesh(new THREE.CapsuleGeometry(ARM.fingerR, fingerLen - 2 * ARM.fingerR, 6, 14), glove, -ARM.len, 0.1 + fingerLen / 2, 0.05));
const thumb = mesh(new THREE.CapsuleGeometry(0.045, 0.1, 4, 10), glove, -ARM.len + 0.06, 0.1, 0.17);
thumb.rotation.x = deg(-35);
arm.add(thumb);
machine.add(arm);

// ---------------------------------------------------------------------------
// Sound (tiny WebAudio synth, created on first interaction)
// ---------------------------------------------------------------------------
const sound = {
  enabled: true,
  ctx: null,
  motorGain: null,
  motorOsc: null,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.motorOsc = this.ctx.createOscillator();
    this.motorOsc.type = 'sawtooth';
    this.motorOsc.frequency.value = 70;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    this.motorGain = this.ctx.createGain();
    this.motorGain.gain.value = 0;
    this.motorOsc.connect(filter).connect(this.motorGain).connect(this.ctx.destination);
    this.motorOsc.start();
  },

  click(strength = 1) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
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
    g.gain.value = 0.7 * strength;
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start();
  },

  thunk(strength = 1) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5 * strength, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  },

  motor(speed) {
    if (!this.ctx) return;
    const level = this.enabled ? Math.min(speed / 6, 1) * 0.06 : 0;
    const now = this.ctx.currentTime;
    this.motorGain.gain.setTargetAtTime(level, now, 0.03);
    this.motorOsc.frequency.setTargetAtTime(55 + speed * 22, now, 0.05);
  },
};

// ---------------------------------------------------------------------------
// Behaviour
// ---------------------------------------------------------------------------
const MOODS = {
  normal: { delay: 0.35, lidSpeed: deg(140), armSpeed: deg(170), hold: 0.15, retract: deg(150), close: deg(120),
    lines: ['Off. As it should be.', 'No.', 'Switched off. Again.'] },
  lazy: { delay: 1.3, lidSpeed: deg(45), armSpeed: deg(55), hold: 0.7, retract: deg(45), close: deg(40),
    lines: ['*sigh* ...fine.', 'Do we really have to do this?', 'Slowly... off.'] },
  angry: { delay: 0.02, lidSpeed: deg(520), armSpeed: deg(520), hold: 0, retract: deg(420), close: deg(900), slam: true,
    lines: ['STOP. TOUCHING. IT.', 'I said OFF!', 'Leave. Me. Alone.'] },
  peek: { delay: 0.5, lidSpeed: deg(130), armSpeed: deg(180), hold: 0.25, retract: deg(140), close: deg(110), peek: true,
    lines: ['...is someone there?', 'Peek-a-boo. Off.', 'Just checking. Off.'] },
  tease: { delay: 0.4, lidSpeed: deg(150), armSpeed: deg(120), hold: 0.5, retract: deg(130), close: deg(120), tease: 1.1,
    lines: ['Hmm... I could leave it on...', 'Thinking about it... nope.', 'Tempting. But no.'] },
};

const state = {
  switchOn: false,
  lever: LEVER.off,
  leverTarget: LEVER.off,
  raise: 0,
  lid: 0,
  lidTarget: 0,
  phase: 'idle',
  timer: 0,
  mood: MOODS.normal,
  run: {},
  count: 0,
  lastDone: -Infinity,
  streak: 0,
  shake: 0,
};

const clock = new THREE.Clock();
let elapsed = 0;

function say(text) {
  statusEl.textContent = text;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMood() {
  const busy = state.phase !== 'idle';
  const quick = busy || elapsed - state.lastDone < 2.5;
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

function flip() {
  sound.init();
  if (sound.ctx && sound.ctx.state === 'suspended') sound.ctx.resume();

  if (state.switchOn) {
    // The visitor turned it off themselves
    state.switchOn = false;
    state.leverTarget = LEVER.off;
    sound.click(0.8);
    if (state.phase !== 'idle') {
      state.phase = 'retract';
      say('Oh. You did it yourself. Thanks, I guess.');
    }
    return;
  }

  state.switchOn = true;
  state.leverTarget = LEVER.on;
  sound.click();
  state.mood = pickMood();
  state.run = {};
  ledMat.emissiveIntensity = 3;
  glow.intensity = 1.6;

  if (state.phase === 'hold' || state.phase === 'retract') {
    // Caught it on the way back in: reach straight back out
    state.phase = state.lid > LID_OPEN * 0.8 ? 'reach' : 'open';
  } else if (state.phase === 'idle') {
    state.phase = 'wait';
    state.timer = state.mood.delay;
  }
  say(state.mood === MOODS.angry ? '...' : 'Switch is ON.');
}

function approach(current, target, maxStep) {
  if (Math.abs(target - current) <= maxStep) return target;
  return current + Math.sign(target - current) * maxStep;
}

const tip = new THREE.Vector2();
function fingertip() {
  // Arm rotation is -raise about z; fingertip is at local (-len, finger)
  const r = -state.raise;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const lx = -ARM.len;
  const ly = ARM.finger;
  return tip.set(ARM.x + lx * c - ly * s, ARM.y + lx * s + ly * c);
}

function update(dt) {
  const m = state.mood;
  const prevRaise = state.raise;
  const prevLid = state.lid;

  switch (state.phase) {
    case 'wait':
      state.timer -= dt;
      if (state.timer <= 0) state.phase = m.peek && !state.run.peeked ? 'peekOpen' : 'open';
      break;

    case 'peekOpen':
      state.lidTarget = LID_PEEK;
      state.lid = approach(state.lid, LID_PEEK, deg(40) * dt);
      if (state.lid === LID_PEEK) {
        state.phase = 'peekHold';
        state.timer = 1.0;
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
        state.run.peeked = true;
        state.phase = 'wait';
        state.timer = 0.5;
      }
      break;

    case 'open':
      state.lid = approach(state.lid, LID_OPEN, m.lidSpeed * dt);
      if (state.lid >= LID_OPEN * 0.8) state.phase = 'reach';
      break;

    case 'reach': {
      state.lid = approach(state.lid, LID_OPEN, m.lidSpeed * dt);
      if (m.tease && !state.run.teased && state.raise >= TEASE_AT) {
        state.raise = TEASE_AT;
        state.phase = 'tease';
        state.timer = m.tease;
        say(pick(m.lines));
        break;
      }
      const speed = state.run.teased ? m.armSpeed * 2.5 : m.armSpeed;
      state.raise = approach(state.raise, ARM_MAX, speed * dt);
      if (state.raise === ARM_MAX) state.phase = 'hold';
      break;
    }

    case 'tease':
      state.timer -= dt;
      // a little hesitant wobble
      state.raise = TEASE_AT - Math.abs(Math.sin(state.timer * 9)) * deg(3);
      if (state.timer <= 0) {
        state.run.teased = true;
        state.phase = 'reach';
      }
      break;

    case 'hold':
      state.timer -= dt;
      if (state.timer <= 0) state.phase = 'retract';
      break;

    case 'retract': {
      const ease = THREE.MathUtils.clamp(state.raise / deg(20), 0.3, 1);
      state.raise = approach(state.raise, 0, m.retract * ease * dt);
      if (state.raise < ARM_CLEAR) state.lid = approach(state.lid, 0, m.close * dt);
      if (state.lid === 0 && prevLid > 0) {
        sound.thunk(m.slam ? 1 : 0.5);
        if (m.slam) state.shake = 1;
      }
      if (state.raise === 0 && state.lid === 0) {
        state.phase = 'idle';
        state.lastDone = elapsed;
        ledMat.emissiveIntensity = 0;
        glow.intensity = 0;
      }
      break;
    }
  }

  // Lever: springs toward its target, but the finger can push it over centre
  state.lever = approach(state.lever, state.leverTarget, deg(900) * dt);
  if (state.switchOn) {
    const p = fingertip();
    const dx = p.x - LEVER.x;
    const dy = p.y - LEVER.y;
    const dist = Math.hypot(dx, dy);
    if (dy > 0 && dist < LEVER.len + 0.08) {
      const contact = Math.atan2(-dx, dy) - Math.asin(Math.min(1, (ARM.fingerR + LEVER.r) / dist));
      if (contact < state.lever) state.lever = contact;
      if (state.lever <= 0) {
        // Over centre: it snaps off
        state.switchOn = false;
        state.leverTarget = LEVER.off;
        state.count++;
        countEl.textContent = state.count;
        sound.click(m.slam ? 1.2 : 1);
        if (state.phase === 'reach' || state.phase === 'tease') {
          state.phase = 'hold';
          state.timer = m.hold;
        }
        if (!m.tease) say(pick(m.lines));
      }
    }
  }

  // Motor hum follows arm speed
  sound.motor(Math.abs(state.raise - prevRaise) / Math.max(dt, 1e-4));

  // Apply to the scene graph
  arm.rotation.z = -state.raise;
  lid.rotation.z = state.lid;
  lever.rotation.z = state.lever;

  // Slam shake
  if (state.shake > 0) {
    state.shake = Math.max(0, state.shake - dt * 3);
    const k = state.shake * state.shake * 0.05;
    machine.position.x = Math.sin(elapsed * 90) * k;
    machine.position.y = 0.06 + Math.abs(Math.sin(elapsed * 60)) * k;
  } else {
    machine.position.x = 0;
    machine.position.y = 0.06;
  }
}

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clickable = [lever, switchGroup];
let downAt = null;

function hitsSwitch(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(clickable, true).length > 0;
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved < 6 && hitsSwitch(e)) flip();
});

renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  renderer.domElement.style.cursor = hitsSwitch(e) ? 'pointer' : '';
});

flipBtn.addEventListener('click', flip);

soundBtn.addEventListener('click', () => {
  sound.enabled = !sound.enabled;
  soundBtn.textContent = sound.enabled ? 'Sound: on' : 'Sound: off';
  soundBtn.setAttribute('aria-pressed', String(sound.enabled));
  if (!sound.enabled) sound.motor(0);
});

// ---------------------------------------------------------------------------
// Theme + resize + loop
// ---------------------------------------------------------------------------
function applyTheme() {
  const dark = document.body.classList.contains('dark-mode');
  floorMat.opacity = dark ? 0.5 : 0.25;
  hemi.intensity = dark ? 0.45 : 0.6;
  rim.intensity = dark ? 1.4 : 0.8;
}
applyTheme();
new MutationObserver(applyTheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });

function resize() {
  const { clientWidth, clientHeight } = stage;
  if (!clientWidth || !clientHeight) return;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  elapsed += dt;
  update(dt);
  controls.update();
  renderer.render(scene, camera);
});
