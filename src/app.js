const S = 1 / 40,
  $ = (id) => document.getElementById(id),
  el = (t, p = {}, h = '') => Object.assign(document.createElement(t), p, { innerHTML: h });
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  document.body.insertAdjacentHTML(
    'beforeend',
    '<p class=err>This device can’t run WebGL, so the 3D view can’t start.</p>',
  );
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.xr.enabled = true;
renderer.setClearColor(0x141a20, 1);
$('c').appendChild(renderer.domElement);
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 800),
  root = new THREE.Group();
scene.add(root);
const hemi = new THREE.HemisphereLight(0xffffff, 0x39424c, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 0.75);
sun.position.set(8, 18, 10);
scene.add(sun);
let az = 0.5,
  el_ = 0.95,
  dist = 24,
  tgt = new THREE.Vector3(),
  sim,
  exp,
  world,
  fx = [],
  lastLit = {},
  pick = [],
  wmesh = [],
  pinPts = [],
  marker = null,
  wstart = null,
  cnt = 100,
  sel = null,
  drag = null,
  tdown = null,
  mode = 'view',
  xrMode = null,
  origin = null,
  view = 'auth',
  dirty = 0,
  PAD = 10,
  rattached = 0;
function setDirty(v) {
  dirty = v;
  const s = $('sst');
  if (s) s.textContent = v ? 'Unsaved changes' : 'Saved';
}
const placeCam = () => {
  camera.position.set(
    tgt.x + dist * Math.sin(el_) * Math.sin(az),
    tgt.y + dist * Math.cos(el_),
    tgt.z + dist * Math.sin(el_) * Math.cos(az),
  );
  if (rattached) {
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
  }
  camera.lookAt(rattached ? root.localToWorld(tgt.clone()) : tgt);
};
const pts = new Map();
let pd = 0;
const cv = renderer.domElement;
cv.style.touchAction = 'none';
cv.addEventListener('pointerdown', (e) => {
  if (view === 'room') return;
  tw = null;
  cv.setPointerCapture(e.pointerId);
  pts.set(e.pointerId, [e.clientX, e.clientY]);
  pd = 0;
});
cv.addEventListener('pointerup', (e) => pts.delete(e.pointerId));
cv.addEventListener('pointercancel', (e) => pts.delete(e.pointerId));
cv.addEventListener('pointermove', (e) => {
  if (view === 'room') return;
  const p = pts.get(e.pointerId);
  if (!p || drag) return;
  const dx = e.clientX - p[0],
    dy = e.clientY - p[1];
  if (pts.size === 1) {
    az -= dx * 0.007;
    el_ = Math.min(1.5, Math.max(0.12, el_ - dy * 0.007));
  } else if (pts.size === 2) {
    const o = [...pts.entries()].find(([k]) => k !== e.pointerId)[1],
      d1 = Math.hypot(p[0] - o[0], p[1] - o[1]),
      d2 = Math.hypot(e.clientX - o[0], e.clientY - o[1]);
    dist = Math.min(90, Math.max(4, (dist * d1) / Math.max(d2, 1)));
  }
  p[0] = e.clientX;
  p[1] = e.clientY;
  placeCam();
});
cv.addEventListener(
  'wheel',
  (e) => {
    if (view === 'room') return;
    e.preventDefault();
    dist = Math.min(90, Math.max(4, dist * (1 + Math.sign(e.deltaY) * 0.1)));
    placeCam();
  },
  { passive: false },
);
function resize() {
  const w = innerWidth,
    h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
const COL = {
  controllers: 0x00858c,
  prototyping: 0xefeadf,
  outputs: 0xc9622b,
  sensors: 0x2f6fb5,
  passive: 0xcdb98a,
  other: 0x59626e,
};
const TH = { arduino: 0.35, raspberry_pi: 0.3, breadboard: 0.3 };
const th = (t) => TH[t] ?? 0.5;
const mat = (c, o = {}) =>
  new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o));
function label(txt, w = 4) {
  const c = el('canvas', { width: 256, height: 64 }),
    g = c.getContext('2d');
  g.fillStyle = 'rgba(20,26,32,.78)';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#f3efe6';
  g.font = '600 26px system-ui,sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(txt.slice(0, 22), 128, 32);
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      depthTest: false,
      transparent: true,
    }),
  );
  s.scale.set(w, w / 4, 1);
  s.renderOrder = 9;
  return s;
}

const room = { light: 1, fan: 1, lvl: 3 };
try {
  Object.assign(room, JSON.parse(localStorage.getItem('vl_room') || '{}'));
} catch (e) {}
const saveRoom = () => {
  try {
    localStorage.setItem('vl_room', JSON.stringify(room));
  } catch (e) {}
};
const lab = new THREE.Group();
root.add(lab);
const swm = [],
  fans = [],
  lamps = [],
  plights = [],
  bars = [];
let rk = {},
  lk = 1,
  fw = 0,
  tw = null,
  benchDist = 24;
function ctex(w, h, fn, rep) {
  const c = el('canvas', { width: w, height: h }),
    g = c.getContext('2d');
  fn(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
const matTex = ctex(256, 256, (g, w, h) => {
  g.fillStyle = '#2a343e';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(200,215,230,.15)';
  for (let i = 0; i <= w; i += 32) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, h);
    g.moveTo(0, i);
    g.lineTo(w, i);
    g.stroke();
  }
});
(function () {
  const bx = (w, h, d, c, x, y, z, p, o) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat(c, Object.assign({ roughness: 0.85, metalness: 0 }, o || {})),
    );
    m.position.set(x, y, z);
    (p || lab).add(m);
    return m;
  };
  const pl = (w, h, x, y, z, rx, ry, c) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(c, { roughness: 1, metalness: 0 }));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    lab.add(m);
  };
  const FY = -16.8,
    H = Math.PI / 2,
    steel = 0x7c858f;
  pl(200, 94, 0, FY, 13, -H, 0, 0x8f98a1);
  pl(200, 56.8, 0, 11.6, -34, 0, 0, 0xc9c5ba);
  pl(94, 56.8, -100, 11.6, 13, 0, H, 0xbcb8ad);
  pl(94, 56.8, 100, 11.6, 13, 0, -H, 0xbcb8ad);
  pl(200, 94, 0, 40, 13, H, 0, 0xd9d6cf);
  const table = (x, z, w, d) => {
    bx(w, 0.8, d, 0xa9814f, x, -0.6, z);
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([a, b]) =>
      bx(1.2, 16, 1.2, steel, x + a * (w / 2 - 2), -8.8, z + b * (d / 2 - 2), 0, {
        metalness: 0.5,
      }),
    );
  };
  table(0, 0, 96, 46);
  table(70, -6, 34, 24);
  const chair = (x, z) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    lab.add(g);
    bx(7, 0.7, 7, 0x3b4a5a, 0, -6, 0, g);
    bx(7, 6.5, 0.6, 0x3b4a5a, 0, -2.2, 3.2, g);
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([a, b]) => bx(0.5, 10.4, 0.5, steel, a * 3, -11.6, b * 3, g, { metalness: 0.5 }));
  };
  chair(-22, 31);
  chair(22, 31);
  chair(70, 13);
  [
    ['Isaac Newton', '1643–1727', 'F = ma'],
    ['Georg Ohm', '1789–1854', 'V = IR'],
    ['Michael Faraday', '1791–1867', 'Induction'],
    ['James Clerk Maxwell', '1831–1879', 'Electromagnetism'],
    ['Marie Curie', '1867–1934', 'Radioactivity'],
    ['Albert Einstein', '1879–1955', 'E = mc²'],
  ].forEach(([n, y, f], i) => {
    const x = -24 + i * 12;
    const t = ctex(240, 300, (g, w, h) => {
      g.fillStyle = '#f4f1ea';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#cfc9bb';
      g.lineWidth = 2;
      g.strokeRect(10, 10, w - 20, h - 20);
      g.textAlign = 'center';
      g.fillStyle = '#b4531c';
      g.font = 'italic 600 21px Georgia,serif';
      g.fillText(f, 120, 46);
      g.fillStyle = '#2a323b';
      g.beginPath();
      g.arc(120, 118, 36, 0, 7);
      g.fill();
      g.beginPath();
      g.moveTo(44, 232);
      g.quadraticCurveTo(44, 168, 120, 162);
      g.quadraticCurveTo(196, 168, 196, 232);
      g.closePath();
      g.fill();
      g.fillStyle = '#1f262d';
      g.font = '600 16px system-ui,sans-serif';
      g.fillText(n, 120, 258);
      g.fillStyle = '#69727c';
      g.font = '14px system-ui,sans-serif';
      g.fillText(y, 120, 280);
    });
    bx(10, 12.4, 0.4, 0x2b323a, x, 16, -33.75);
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 11.25),
      new THREE.MeshStandardMaterial({ map: t, roughness: 1 }),
    );
    p.position.set(x, 16, -33.53);
    lab.add(p);
  });
  const P = new THREE.Group();
  P.position.set(-44, 5, -33.55);
  lab.add(P);
  bx(9, 11, 0.4, 0xd6d1c4, 0, 0, 0, P);
  const U = (v) => 128 + v * 28.4,
    V = (v) => 160 - v * 29.1;
  const pt = ctex(256, 320, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,0)';
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#39434d';
    g.strokeStyle = '#8f98a1';
    g.lineWidth = 2;
    g.textAlign = 'center';
    g.font = '600 15px system-ui,sans-serif';
    g.fillText('LIGHTS', U(-2.3), V(5));
    g.fillText('FAN', U(2.3), V(5));
    g.fillText('SPEED', U(0), V(0.2));
    [-2.3, 2.3].forEach((x) => g.strokeRect(U(x) - 43, V(-3.2), 86, 56));
    g.font = '600 30px system-ui,sans-serif';
    g.fillText('−', U(-2.3), V(-4.9));
    g.fillText('+', U(2.3), V(-4.9));
  });
  const lab2 = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 11),
    new THREE.MeshStandardMaterial({ map: pt, transparent: true, roughness: 1 }),
  );
  lab2.position.z = 0.21;
  P.add(lab2);
  const rocker = (x, k) => {
    const b = bx(2.4, 3.4, 0.3, 0xbfb9aa, x, 2.2, 0.35, P),
      t = bx(1.7, 1.6, 0.6, 0x39434d, x, 2.2, 0.6, P);
    b.userData.sw = t.userData.sw = k;
    swm.push(b, t);
    rk[k] = t;
  };
  rocker(-2.3, 'light');
  rocker(2.3, 'fan');
  [
    [-2.3, 'fdn'],
    [2.3, 'fup'],
  ].forEach(([x, k]) => {
    const m = bx(3.2, 2.2, 0.5, 0xffffff, x, -4.2, 0.4, P, {
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    m.userData.sw = k;
    swm.push(m);
  });
  for (let i = 0; i < 5; i++) bars.push(bx(0.85, 0.6, 0.2, 0x9aa3ab, -2.4 + i * 1.2, -1.4, 0.3, P));
  [-50, 0, 50].forEach((x) => {
    lamps.push(
      bx(14, 0.3, 4, 0xffffff, x, 39.8, 0, 0, { emissive: 0xfff2d6, emissiveIntensity: 1 }),
    );
    const l = new THREE.PointLight(0xfff1dc, 0.32, 110, 1.2);
    l.position.set(x, 34, 2);
    lab.add(l);
    plights.push(l);
  });
  [-28, 28].forEach((x) => {
    const g = new THREE.Group();
    g.position.set(x, 40, 0);
    lab.add(g);
    bx(0.3, 4, 0.3, steel, 0, -2, 0, g);
    const h = new THREE.Group();
    h.position.y = -4.4;
    g.add(h);
    bx(2.4, 1.1, 2.4, 0x39434d, 0, 0, 0, h);
    for (let k = 0; k < 4; k++) {
      const r = new THREE.Group();
      r.rotation.y = k * H;
      h.add(r);
      bx(9, 0.15, 1.9, 0x5b6672, 6, -0.3, 0, r);
    }
    fans.push(h);
  });
})();
const base = (c) =>
  ['arduino', 'raspberry_pi', 'breadboard'].includes(c.type) ? 0 : sim.onBb.has(c.id) ? 0.3 : 0;
function build(first) {
  const keep = sim && !first ? { ...sim.inp } : null;
  sim = makeSim(exp, DEFS);
  if (keep) Object.assign(sim.inp, keep);
  if (world) root.remove(world);
  world = new THREE.Group();
  root.add(world);
  fx = [];
  lastLit = {};
  pick = [];
  wmesh = [];
  pinPts = [];
  marker = null;
  wstart = null;
  let x0 = 1e9,
    x1 = -1e9,
    y0 = 1e9,
    y1 = -1e9;
  exp.defaultComponents.forEach((c) => {
    const d = DEFS[c.type];
    if (!d) return;
    x0 = Math.min(x0, c.x);
    y0 = Math.min(y0, c.y);
    x1 = Math.max(x1, c.x + d.width);
    y1 = Math.max(y1, c.y + d.height);
  });
  const ox = ((x0 + x1) / 2) * S,
    oz = ((y0 + y1) / 2) * S;
  world.position.set(-ox, 0, -oz);
  matTex.repeat.set(((x1 - x0) * S + PAD) / 4, ((y1 - y0) * S + PAD) / 4);
  const fl = new THREE.Mesh(
    new THREE.BoxGeometry((x1 - x0) * S + PAD, 0.2, (y1 - y0) * S + PAD),
    new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.92 }),
  );
  fl.position.set(ox, -0.11, oz);
  world.add(fl);
  const P = (c, p) => {
    const d = DEFS[c.type],
      [ax, ay] = pinAbs(c, d, p);
    return new THREE.Vector3(ax * S, base(c) + th(c.type) + 0.03, ay * S);
  };
  exp.defaultComponents.forEach((c) => {
    const d = DEFS[c.type];
    if (!d) return;
    const g = new THREE.Group(),
      w = d.width * S,
      h = d.height * S,
      t = th(c.type);
    g.position.set((c.x + d.width / 2) * S, base(c), (c.y + d.height / 2) * S);
    g.rotation.y = (-c.rotation * Math.PI) / 180;
    world.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, t, h), mat(COL[d.category] || COL.other));
    body.position.y = t / 2;
    g.add(body);
    const ref = { c, g };
    body.userData.cid = c.id;
    pick.push(body);
    d.pins.forEach((p) => pinPts.push({ cid: c.id, pid: p.id, v: P(c, p) }));
    const add = (m, y) => {
      m.position.y = y;
      g.add(m);
      return m;
    };
    if (c.type === 'led') {
      const lc =
        { red: 0xff2a2a, green: 0x23d160, yellow: 0xffd21f, blue: 0x3b82ff, white: 0xffffff }[
          c.properties.color
        ] || 0xff2a2a;
      body.visible = false;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 20), mat(0x555555)), 0.25);
      ref.glow = add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 20, 14),
          mat(lc, { emissive: lc, emissiveIntensity: 0.05, transparent: true, opacity: 0.9 }),
        ),
        0.75,
      );
    } else if (c.type === 'lightbulb') {
      ref.glow = add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 20, 14),
          mat(0xffe9a8, { emissive: 0xffd45a, emissiveIntensity: 0.05 }),
        ),
        1,
      );
    } else if (c.type === 'buzzer') {
      body.visible = false;
      ref.buz = add(
        new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.7, 24), mat(0x20242a)),
        0.35,
      );
    } else if (c.type === 'dc_motor') {
      ref.spin = add(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 1.4, 16),
          mat(0xb8bcc4, { metalness: 0.7 }),
        ),
        0.9,
      );
      ref.spin.rotation.z = Math.PI / 2;
    } else if (c.type === 'resistor') {
      body.scale.set(0.7, 0.8, 0.7);
      body.material.color.set(0xd9c08a);
    } else if (c.type === 'breadboard') {
      const n = d.pins.length,
        im = new THREE.InstancedMesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6),
          mat(0x222a31),
          n,
        ),
        m4 = new THREE.Matrix4();
      d.pins.forEach((p, k) => {
        m4.setPosition(p.x * S - w / 2, t + 0.025, p.y * S - h / 2);
        im.setMatrixAt(k, m4);
      });
      g.add(im);
    }
    if (c.type !== 'breadboard') {
      const pm = mat(0xe2b64d, { metalness: 0.8, roughness: 0.3 }),
        pg = new THREE.SphereGeometry(0.1, 8, 6);
      d.pins.forEach((p) => {
        const s = new THREE.Mesh(pg, pm);
        s.position.set(p.x * S - w / 2, t + 0.03, p.y * S - h / 2);
        g.add(s);
      });
      const lb = label(c.name || d.name, Math.max(3, Math.min(6, w)));
      lb.position.set(0, t + 1.7 + (c.type === 'led' || c.type === 'lightbulb' ? 0.8 : 0), 0);
      g.add(lb);
    }
    fx.push(ref);
  });
  exp.defaultWires.forEach((wr) => {
    const a = exp.defaultComponents.find((c) => c.id === wr.fromComponentId),
      b = exp.defaultComponents.find((c) => c.id === wr.toComponentId);
    if (!a || !b) return;
    const pa = DEFS[a.type].pins.find((p) => p.id === wr.fromPinId),
      pb = DEFS[b.type].pins.find((p) => p.id === wr.toPinId);
    if (!pa || !pb) return;
    const A = P(a, pa),
      B = P(b, pb),
      up = 0.6 + A.distanceTo(B) * 0.12;
    const cu = new THREE.CatmullRomCurve3([
      A,
      A.clone().setY(A.y + 0.5),
      A.clone()
        .lerp(B, 0.5)
        .setY(Math.max(A.y, B.y) + up),
      B.clone().setY(B.y + 0.5),
      B,
    ]);
    let col = new THREE.Color(wr.color === 'black' ? 0x23272d : 0x888888);
    try {
      if (wr.color !== 'black') col = new THREE.Color(wr.color);
    } catch (e) {}
    const wm = new THREE.Mesh(
      new THREE.TubeGeometry(cu, 28, 0.07, 6),
      mat(col, { roughness: 0.45 }),
    );
    wm.userData.wid = wr.id;
    wmesh.push(wm);
    world.add(wm);
  });
  if (first) {
    dist = Math.max(14, Math.hypot(x1 - x0, y1 - y0) * S * 1.1);
    if (innerWidth < innerHeight) dist *= 1.7;
    tgt.set(0, 0, 0);
    placeCam();
    benchDist = dist;
    $('cam').value = 'bench';
    tw = null;
  }
}
function openExp(e) {
  exp = e;
  origin = JSON.parse(JSON.stringify(e));
  cnt = Math.max(
    100,
    ...e.defaultComponents
      .concat(e.defaultWires)
      .map((x) => parseInt((String(x.id).match(/(\d+)$/) || [0, 0])[1])),
  );
  sel = null;
  build(1);
  $('ttl').textContent = exp.title;
  $('tips').innerHTML = (exp.tips || [])
    .map((t) => '<li>' + t.replace(/[<]/g, '&lt;') + '</li>')
    .join('');
  $('cd').value = exp.defaultCode;
  setSensors();
  stop();
  sim.reset(exp.defaultCode);
  log();
  setDirty(0);
}
const load = (i) => openExp(JSON.parse(JSON.stringify(EXPS[i])));
const SENS = [
    ['temperature', 'Temperature °C', -10, 60, 1],
    ['humidity', 'Humidity %', 0, 100, 1],
    ['distance', 'Distance cm', 2, 400, 1],
    ['tempProbe', 'Probe °C', -10, 120, 1],
    ['bpmInput', 'Heart rate bpm', 30, 200, 1],
    ['waterFlowLPM', 'Water flow L/min', 0, 30, 0.5],
  ],
  TOG = [
    ['motion', 'Motion detected'],
    ['buttonInput', 'Button pressed (hold)'],
    ['flaskToggleInput', 'Toggle switch'],
  ];
function setSensors() {
  const h = $('sn');
  h.innerHTML = '';
  SENS.forEach(([k, n, lo, hi, st]) => {
    const r = el('label', { className: 'row' }, `<span>${n}</span><output>${sim.inp[k]}</output>`),
      i = el('input', { type: 'range', min: lo, max: hi, step: st, value: sim.inp[k] });
    i.oninput = () => {
      sim.inp[k] = +i.value;
      r.querySelector('output').textContent = i.value;
    };
    r.appendChild(i);
    h.appendChild(r);
  });
  TOG.forEach(([k, n]) => {
    const b = el('button', { className: 'tg' }, n);
    b.setAttribute('aria-pressed', 'false');
    const set = (v) => {
      sim.inp[k] = v ? 1 : 0;
      b.setAttribute('aria-pressed', String(!!v));
    };
    if (k === 'buttonInput') {
      b.onpointerdown = () => set(1);
      b.onpointerup = b.onpointerleave = () => set(0);
    } else b.onclick = () => set(!sim.inp[k]);
    h.appendChild(b);
  });
}
function log() {
  const s = $('se');
  s.textContent = sim.serial.join('\n');
  s.scrollTop = 1e9;
  const l = $('live');
  l.textContent = sim.serial.slice(-4).join('\n');
  l.hidden = !sim.serial.length;
}
function run() {
  sim.reset($('cd').value);
  sim.start();
  toast('Running. Open the Panel to change sensor inputs and watch the serial monitor.');
  $('run').textContent = 'Stop';
  $('run').dataset.on = 1;
}
function stop() {
  if (sim) sim.stop();
  $('run').textContent = 'Run';
  delete $('run').dataset.on;
}
$('run').onclick = () => {
  $('run').dataset.on ? stop() : run();
};
$('rst').onclick = () => {
  stop();
  sim.reset($('cd').value);
  log();
};
$('rs').onclick = () => {
  $('cd').value = exp.defaultCode;
};
$('pt').onclick = () => $('pn').classList.toggle('open');
const toast = (m) => {
  const t = $('toast');
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), 6000);
};
async function enter(mode) {
  try {
    const o =
      mode === 'ar'
        ? { optionalFeatures: ['local-floor', 'dom-overlay'], domOverlay: { root: document.body } }
        : { optionalFeatures: ['local-floor'] };
    const s = await navigator.xr.requestSession('immersive-' + mode, o);
    xrMode = mode;
    s.addEventListener('end', () => {
      xrMode = null;
      lab.visible = true;
      root.scale.setScalar(1);
      root.position.set(0, 0, 0);
      renderer.setClearColor(0x141a20, 1);
      placeCam();
    });
    await renderer.xr.setSession(s);
    if (mode === 'ar') {
      lab.visible = false;
      renderer.setClearColor(0, 0);
      root.scale.setScalar(0.02);
      root.position.set(0, -0.35, -0.8);
    } else {
      root.scale.setScalar(0.06);
      root.position.set(0, 0.9, -1);
    }
  } catch (e) {
    toast(
      'Couldn’t start ' +
        mode.toUpperCase() +
        '. If this page is embedded, open its link in a new browser tab and try again.',
    );
  }
}
(async () => {
  if (!navigator.xr) {
    $('xrn').hidden = false;
    return;
  }
  let any = 0;
  for (const m of ['vr', 'ar']) {
    try {
      if (await navigator.xr.isSessionSupported('immersive-' + m)) {
        $(m).hidden = false;
        $(m).onclick = () => enter(m);
        any = 1;
      }
    } catch (e) {}
  }
  if (!any) $('xrn').hidden = false;
})();

const rc = new THREE.Raycaster(),
  ndc = new THREE.Vector2(),
  plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3);
const ray = (e) => {
  const r = cv.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
  rc.setFromCamera(ndc, camera);
};
const hit = (l) => {
  world.updateMatrixWorld(true);
  const h = rc.intersectObjects(l, false);
  return h.length ? h[0].object : null;
};
const ground = () => {
  root.updateMatrixWorld(true);
  const r = rc.ray.clone().applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert()),
    v = new THREE.Vector3();
  return r.intersectPlane(plane, v) ? v.sub(world.position) : null;
};
const comp = (id) => exp.defaultComponents.find((c) => c.id === id);
function mark() {
  if (marker) {
    world.remove(marker);
    marker = null;
  }
  if (wstart) {
    marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8),
      mat(0xe08a4c, { emissive: 0xe08a4c, emissiveIntensity: 0.9 }),
    );
    marker.position.copy(wstart.v);
    world.add(marker);
  }
}
function nearPin(e) {
  world.updateMatrixWorld(true);
  let best = null,
    bd = 1e9;
  const r = cv.getBoundingClientRect(),
    v = new THREE.Vector3();
  pinPts.forEach((p) => {
    v.copy(p.v).applyMatrix4(world.matrixWorld).project(camera);
    if (v.z > 1) return;
    const d = Math.hypot(
      ((v.x + 1) / 2) * r.width + r.left - e.clientX,
      ((1 - v.y) / 2) * r.height + r.top - e.clientY,
    );
    if (d < bd) {
      bd = d;
      best = p;
    }
  });
  return bd < (e.pointerType === 'touch' ? 28 : 16) ? best : null;
}
function snap(c) {
  const bb = exp.defaultComponents.find((k) => k.type === 'breadboard');
  if (!bb || c === bb) return;
  const bd = DEFS.breadboard,
    d = DEFS[c.type];
  if (!(
    c.x > bb.x - 30 &&
    c.x < bb.x + bd.width + 10 &&
    c.y > bb.y - 30 &&
    c.y < bb.y + bd.height + 10
  ))
    return;
  const [ax, ay] = pinAbs(c, d, d.pins[0]);
  let b = null,
    m = 1e9;
  bd.pins.forEach((h) => {
    const q = Math.hypot(ax - bb.x - h.x, ay - bb.y - h.y);
    if (q < m) {
      m = q;
      b = h;
    }
  });
  if (b && m < 40) {
    c.x += Math.round(bb.x + b.x - ax);
    c.y += Math.round(bb.y + b.y - ay);
  }
}
function changed(msg) {
  setDirty(1);
  const code = $('cd').value;
  stop();
  build(0);
  sim.reset(code);
  log();
  if (msg) toast(msg);
}
function setMode(m) {
  mode = m;
  wstart = null;
  mark();
  document
    .querySelectorAll('[data-m]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
  cv.style.cursor = m === 'view' ? 'grab' : 'crosshair';
  $('hint').textContent = {
    view: 'Drag to orbit, scroll or pinch to zoom.',
    move: 'Drag a part to move it. Parts dropped on the breadboard snap into its holes.',
    wire: 'Tap one pin, then another, to connect them with a wire.',
    erase: 'Tap a part or a wire to remove it.',
  }[m];
}
document.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => setMode(b.dataset.m)));
cv.addEventListener('pointerdown', (e) => {
  if (view === 'room') return;
  tdown = { x: e.clientX, y: e.clientY, t: Date.now() };
  if (mode !== 'move' || xrMode || drag) return;
  ray(e);
  const b = hit(pick),
    g = ground();
  if (!b || !g) return;
  const c = comp(b.userData.cid);
  if (!c) return;
  const kids =
    c.type === 'breadboard' ? exp.defaultComponents.filter((k) => sim.onBb.has(k.id)) : [];
  drag = {
    c,
    gx: g.x / S - c.x,
    gy: g.z / S - c.y,
    orig: [c, ...kids].map((k) => [k, k.x, k.y]),
    moved: 0,
  };
  sel = c;
});
cv.addEventListener('pointermove', (e) => {
  if (view === 'room' || !drag) return;
  ray(e);
  const g = ground();
  if (!g) return;
  const nx = Math.round(g.x / S - drag.gx),
    ny = Math.round(g.z / S - drag.gy),
    [, cx, cy] = drag.orig[0];
  drag.orig.forEach(([k, ox, oy]) => {
    k.x = ox + nx - cx;
    k.y = oy + ny - cy;
    const r = fx.find((r) => r.c === k),
      d = DEFS[k.type];
    if (r) r.g.position.set((k.x + d.width / 2) * S, r.g.position.y, (k.y + d.height / 2) * S);
  });
  drag.moved = 1;
});
cv.addEventListener('pointerup', (e) => {
  if (view === 'room') return;
  if (drag) {
    const d = drag;
    drag = null;
    if (d.moved) {
      if (d.c.type !== 'breadboard') snap(d.c);
      changed();
    } else toast('Selected ' + d.c.name + '. Use Rotate or Delete.');
    return;
  }
  if (
    !tdown ||
    xrMode ||
    Math.hypot(e.clientX - tdown.x, e.clientY - tdown.y) > 6 ||
    Date.now() - tdown.t > 700
  )
    return;
  ray(e);
  const sw = lab.visible ? rc.intersectObjects(swm, false)[0] : null;
  if (sw) {
    const k = sw.object.userData.sw;
    if (k === 'light') room.light ^= 1;
    else if (k === 'fan') room.fan ^= 1;
    else if (k === 'fup') {
      room.lvl = Math.min(5, room.lvl + 1);
      room.fan = 1;
    } else room.lvl = Math.max(1, room.lvl - 1);
    saveRoom();
    return;
  }
  if (mode === 'erase') {
    const w = hit(wmesh);
    if (w) {
      exp.defaultWires = exp.defaultWires.filter((x) => x.id !== w.userData.wid);
      changed('Wire removed.');
      return;
    }
    const b = hit(pick);
    if (b) {
      const id = b.userData.cid;
      exp.defaultComponents = exp.defaultComponents.filter((c) => c.id !== id);
      exp.defaultWires = exp.defaultWires.filter(
        (w) => w.fromComponentId !== id && w.toComponentId !== id,
      );
      if (sel && sel.id === id) sel = null;
      changed('Part removed.');
    }
  } else if (mode === 'wire') {
    const p = nearPin(e);
    if (!p) {
      wstart = null;
      mark();
      return;
    }
    if (!wstart) {
      wstart = p;
      mark();
      return;
    }
    if (wstart.cid === p.cid && wstart.pid === p.pid) {
      wstart = null;
      mark();
      return;
    }
    exp.defaultWires.push({
      id: 'w' + ++cnt,
      fromComponentId: wstart.cid,
      fromPinId: wstart.pid,
      toComponentId: p.cid,
      toPinId: p.pid,
      color: $('wc').value,
    });
    changed('Wire added.');
  }
});
const lib = $('lib'),
  groups = {};
Object.entries(DEFS).forEach(([t, d]) => {
  (groups[d.category] = groups[d.category] || []).push([t, d.name]);
});
Object.entries(groups).forEach(([k, v]) => {
  const og = el('optgroup', { label: k });
  v.sort((a, b) => a[1].localeCompare(b[1])).forEach(([t, n]) =>
    og.appendChild(el('option', { value: t }, n)),
  );
  lib.appendChild(og);
});
lib.value = 'led';
$('add').onclick = () => {
  const t = lib.value,
    d = DEFS[t],
    n = ++cnt;
  const c = {
    id: t + '_' + n,
    type: t,
    name: d.name,
    x: Math.round((tgt.x - world.position.x) / S - d.width / 2 + ((n % 6) - 3) * 24),
    y: Math.round((tgt.z - world.position.z) / S - d.height / 2 + ((n % 4) - 2) * 24),
    rotation: 0,
    properties: JSON.parse(JSON.stringify(d.defaultProperties || {})),
  };
  exp.defaultComponents.push(c);
  sel = c;
  snap(c);
  setMode('move');
  changed(d.name + ' added. Drag it into place.');
};
$('rot').onclick = () => {
  if (!sel || !comp(sel.id)) return toast('Choose Move, then tap a part first.');
  sel.rotation = (sel.rotation + 90) % 360;
  snap(sel);
  changed();
};
$('del').onclick = () => {
  if (!sel || !comp(sel.id)) return toast('Choose Move, then tap a part first.');
  const id = sel.id;
  exp.defaultComponents = exp.defaultComponents.filter((c) => c.id !== id);
  exp.defaultWires = exp.defaultWires.filter(
    (w) => w.fromComponentId !== id && w.toComponentId !== id,
  );
  sel = null;
  changed('Part removed.');
};
$('rcirc').onclick = () => {
  openExp(JSON.parse(JSON.stringify(origin)));
  toast('Circuit and code restored.');
};
$('cd').addEventListener('input', () => setDirty(1));
$('cam').onchange = () => {
  const v = $('cam').value,
    m = innerWidth < innerHeight;
  $('info').hidden = v !== 'bench';
  tw = {
    bench: { az: 0.5, el: 0.95, dist: benchDist, tx: 0, ty: 0, tz: 0 },
    room: { az: 0, el: 1.36, dist: m ? 95 : 62, tx: -3, ty: 8, tz: -20 },
    sw: { az: 0.25, el: 1.3, dist: m ? 34 : 22, tx: -42, ty: 5, tz: -33 },
  }[v];
};
setMode('view');
if (innerWidth > 900) $('pn').classList.add('open');
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  if (!sim) return; // scripts load one after another; wait until site.js has created the first scene
  const dt = clock.getDelta(),
    now = Date.now();
  const eff = room.light || xrMode === 'ar' ? 1 : 0;
  lk += (eff - lk) * Math.min(1, dt * 6);
  hemi.intensity = 0.12 + 0.56 * lk;
  sun.intensity = 0.03 + 0.42 * lk;
  plights.forEach((l) => (l.intensity = 0.09 * lk));
  lamps.forEach((m) => (m.material.emissiveIntensity = lk));
  fw += ((room.fan ? room.lvl * 2.4 : 0) - fw) * Math.min(1, dt * 1.6);
  fans.forEach((f) => (f.rotation.y += dt * fw));
  rk.light.rotation.x = room.light ? -0.35 : 0.35;
  rk.fan.rotation.x = room.fan ? -0.35 : 0.35;
  bars.forEach((b, i) => {
    const on = room.fan && i < room.lvl;
    b.material.emissive.setHex(on ? 0x7be0a4 : 0);
    b.material.emissiveIntensity = on ? 0.9 : 0;
  });
  if (tw) {
    const k = Math.min(1, dt * 4);
    az += (tw.az - az) * k;
    el_ += (tw.el - el_) * k;
    dist += (tw.dist - dist) * k;
    tgt.x += (tw.tx - tgt.x) * k;
    tgt.y += (tw.ty - tgt.y) * k;
    tgt.z += (tw.tz - tgt.z) * k;
    placeCam();
    if (Math.abs(tw.dist - dist) < 0.05 && Math.abs(tw.az - az) < 0.01) tw = null;
  }
  if (view !== 'bench' && !xrMode) {
    az += dt * 0.1;
    placeCam();
  }
  sim.tick(now);
  if (sim.running || dt) lastLit = sim.lit();
  fx.forEach((r) => {
    const on = lastLit[r.c.id];
    if (r.glow) {
      const m = r.glow.material;
      m.emissiveIntensity += ((on ? 2.2 : 0.05) - m.emissiveIntensity) * Math.min(1, dt * 14);
    }
    if (r.buz) r.buz.scale.setScalar(on ? 1 + 0.06 * Math.sin(now / 30) : 1);
    if (r.spin && on) r.spin.rotation.x += dt * 14;
  });
  if (sim.running) log();
  if (view === 'room' && rscene) {
    roomFrame(dt, now);
    renderer.render(rscene, rcam);
  } else if (view === 'bench' && rattached) {
    roomFrame(dt, now, 1);
    renderer.render(rscene, camera);
  } else renderer.render(scene, camera);
});
