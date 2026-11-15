/* ===== 3D CLASSROOM ===== */
const RX = 13,
  RZ0 = -11,
  RZ1 = 14,
  WH = 3.6,
  HP = Math.PI / 2;
let rscene,
  rcam,
  rig,
  rbuilt = 0,
  rtabs = [],
  rhits = [],
  rbox = [],
  racs = [],
  rlights = [],
  rpl = [],
  rsw = [],
  rhemi,
  rnear = -1,
  ryaw = 0,
  rpit = 0,
  rtt = 0,
  rsnap = 0,
  rdrag = null;
const rzone = [1, 1, 1, 1],
  rac = [1, 1, 1, 1, 1, 1],
  rzk = [1, 1, 1, 1],
  rkey = {},
  rjoy = { x: 0, y: 0 },
  rrc = new THREE.Raycaster(),
  rv = new THREE.Vector3(),
  rm4 = new THREE.Matrix4(),
  rn = new THREE.Vector2();
rrc.far = 7;
const rb = (w, h, d, c, x, y, z, p, o) => {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mat(c, Object.assign({ roughness: 0.85, metalness: 0 }, o || {})),
  );
  m.position.set(x, y, z);
  (p || rscene).add(m);
  return m;
};
const rp = (w, h, x, y, z, rx, ry, map, c, p) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    map
      ? new THREE.MeshStandardMaterial({ map, roughness: 0.9, metalness: 0 })
      : mat(c, { roughness: 1, metalness: 0 }),
  );
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  (p || rscene).add(m);
  return m;
};
const ract = (m, f) => {
  m.userData.act = f;
  rhits.push(m);
  return m;
};
const rtex = (w, h, fn) => {
  const t = ctex(w, h, fn);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  return t;
};
function rt(msg) {
  const t = $('rtoast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(rt.t);
  rt.t = setTimeout(() => (t.hidden = true), 5000);
}
const rwrap = (g, t, x, y, n, lh) => {
  const w = t.split(' ');
  let l = '';
  w.forEach((s) => {
    if ((l + ' ' + s).trim().length > n) {
      g.fillText(l.trim(), x, y);
      y += lh;
      l = s;
    } else l += ' ' + s;
  });
  g.fillText(l.trim(), x, y);
};
const rtab_of = (i) => rtabs[i];
/* ---- circuit renderer (same data as the workbench, instanced pins) ---- */
function rcircuit(e, sim) {
  const g = new THREE.Group(),
    fxs = [],
    inst = [];
  let x0 = 1e9,
    x1 = -1e9,
    y0 = 1e9,
    y1 = -1e9;
  e.defaultComponents.forEach((c) => {
    const d = DEFS[c.type];
    if (!d) return;
    x0 = Math.min(x0, c.x);
    y0 = Math.min(y0, c.y);
    x1 = Math.max(x1, c.x + d.width);
    y1 = Math.max(y1, c.y + d.height);
  });
  const ox = (x0 + x1) / 80,
    oz = (y0 + y1) / 80,
    K = Math.min(0.048, 1 / ((x1 - x0) / 40), 0.6 / ((y1 - y0) / 40));
  const bs = (c) =>
    ['arduino', 'raspberry_pi', 'breadboard'].includes(c.type) ? 0 : sim.onBb.has(c.id) ? 0.3 : 0;
  const P = (c, p) => {
    const d = DEFS[c.type],
      [ax, ay] = pinAbs(c, d, p);
    return new THREE.Vector3(ax / 40 - ox, bs(c) + th(c.type) + 0.03, ay / 40 - oz);
  };
  e.defaultComponents.forEach((c) => {
    const d = DEFS[c.type];
    if (!d) return;
    const q = new THREE.Group(),
      w = d.width / 40,
      h = d.height / 40,
      t = th(c.type);
    q.name = c.type + '_' + c.id;
    q.position.set((c.x + d.width / 2) / 40 - ox, bs(c), (c.y + d.height / 2) / 40 - oz);
    q.rotation.y = (-c.rotation * Math.PI) / 180;
    g.add(q);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, t, h), mat(COL[d.category] || COL.other));
    body.position.y = t / 2;
    q.add(body);
    const ref = { c };
    const add = (m, y) => {
      m.position.y = y;
      q.add(m);
      return m;
    };
    if (c.type === 'led') {
      const lc =
        { red: 0xff2a2a, green: 0x23d160, yellow: 0xffd21f, blue: 0x3b82ff, white: 0xffffff }[
          c.properties.color
        ] || 0xff2a2a;
      body.visible = false;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 16), mat(0x555555)), 0.25);
      ref.glow = add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 16, 12),
          mat(lc, { emissive: lc, emissiveIntensity: 0.05, transparent: true, opacity: 0.9 }),
        ),
        0.75,
      );
    } else if (c.type === 'lightbulb') {
      ref.glow = add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 16, 12),
          mat(0xffe9a8, { emissive: 0xffd45a, emissiveIntensity: 0.05 }),
        ),
        1,
      );
    } else if (c.type === 'buzzer') {
      body.visible = false;
      ref.buz = add(
        new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.7, 20), mat(0x20242a)),
        0.35,
      );
    } else if (c.type === 'dc_motor') {
      ref.spin = add(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 1.4, 14),
          mat(0xb8bcc4, { metalness: 0.7 }),
        ),
        0.9,
      );
      ref.spin.rotation.z = HP;
    } else if (c.type === 'resistor') {
      body.scale.set(0.7, 0.8, 0.7);
      body.material.color.set(0xd9c08a);
    }
    if (c.type === 'breadboard')
      d.pins.forEach((p) => inst.push({ v: P(c, p), s: 1, col: 0x222a31 }));
    else d.pins.forEach((p) => inst.push({ v: P(c, p), s: 1.5, col: 0xe2b64d }));
    fxs.push(ref);
  });
  const im = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.06, 6),
      mat(0xffffff, { roughness: 0.5, metalness: 0.3 }),
      inst.length,
    ),
    m4 = new THREE.Matrix4(),
    qq = new THREE.Quaternion();
  im.name = 'Pins_and_holes';
  inst.forEach((o, i) => {
    m4.compose(o.v, qq, new THREE.Vector3(o.s, o.s > 1 ? o.s * 2 : 1, o.s));
    im.setMatrixAt(i, m4);
    im.setColorAt(i, new THREE.Color(o.col));
  });
  g.add(im);
  e.defaultWires.forEach((wr) => {
    const a = e.defaultComponents.find((c) => c.id === wr.fromComponentId),
      b = e.defaultComponents.find((c) => c.id === wr.toComponentId);
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
    } catch (x) {}
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(cu, 20, 0.07, 5),
      mat(col, { roughness: 0.45 }),
    );
    m.name = 'Wire_' + wr.id;
    g.add(m);
  });
  g.scale.setScalar(K);
  return { g, fxs, K };
}
/* ---- per-table control panel ---- */
function rpanel(T, i, e, sim, tab) {
  const ty = new Set(e.defaultComponents.map((c) => c.type)),
    S = [];
  if (ty.has('dht11'))
    S.push(['temperature', 'Temp °C', 3, -10, 60], ['humidity', 'Humidity %', 10, 0, 100]);
  if (ty.has('hc_sr04')) S.push(['distance', 'Distance cm', 20, 2, 400]);
  if (ty.has('pir_sensor')) S.push(['motion', 'Motion']);
  if (ty.has('push_button')) S.push(['buttonInput', 'Button']);
  if (ty.has('ds18b20')) S.push(['tempProbe', 'Probe °C', 5, -10, 120]);
  if (ty.has('yf_s201')) S.push(['waterFlowLPM', 'Flow L/min', 2, 0, 30]);
  if (ty.has('pulse_sensor')) S.push(['bpmInput', 'Heart bpm', 10, 30, 200]);
  S.length = Math.min(S.length, 2);
  const H = 0.095 + 0.145 + 0.075 * S.length + 0.02,
    G = new THREE.Group();
  G.position.set(0.5, 0.76, -0.22);
  G.rotation.x = -0.45;
  G.scale.setScalar(1.25);
  G.name = 'ControlPanel_' + (i + 1);
  T.add(G);
  rb(0.38, H, 0.012, 0x2b323a, 0, H / 2, 0, G);
  let cur = H - 0.015;
  const face = (w, h, y, draw, cw, ch) => {
    const t = rtex(cw, ch, draw),
      m = rp(w, h, 0, y, 0.008, 0, 0, t, 0, G);
    return { m, t };
  };
  const scr = face(0.34, 0.115, cur - 0.0575, () => {}, 384, 130);
  cur -= 0.13;
  const run = face(0.34, 0.055, cur - 0.0275, () => {}, 384, 62);
  cur -= 0.07;
  run.m.name = 'RunButton_' + (i + 1);
  ract(run.m, () => {
    if (sim.running) sim.stop();
    else {
      sim.reset(e.defaultCode);
      sim.start();
    }
    tab.draw();
  });
  const glyph = (s) =>
    rtex(64, 56, (g) => {
      g.fillStyle = '#39434d';
      g.fillRect(0, 0, 64, 56);
      g.fillStyle = '#eee9dd';
      g.font = '600 38px system-ui,sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(s, 32, 30);
    });
  const rows = S.map(([k, n, st, lo, hi]) => {
    const y = cur - 0.0325;
    cur -= 0.075;
    const lab = face(0.2, 0.05, y, () => {}, 256, 68),
      val = () => (st ? String(Math.round(sim.inp[k] * 10) / 10) : sim.inp[k] ? 'ON' : 'OFF');
    const draw = () => {
      const g = lab.t.image.getContext('2d');
      g.fillStyle = '#0e1418';
      g.fillRect(0, 0, 256, 68);
      g.fillStyle = '#a9b4be';
      g.font = '600 21px system-ui,sans-serif';
      g.textAlign = 'left';
      g.fillText(n, 10, 26);
      g.fillStyle = '#7be0a4';
      g.font = '500 26px ui-monospace,monospace';
      g.fillText(val(), 10, 57);
      lab.t.needsUpdate = true;
    };
    if (st) {
      [
        [-1, '−', 0.085],
        [1, '+', 0.145],
      ].forEach(([d, s, x]) => {
        const b = rp(0.05, 0.045, x, y, 0.008, 0, 0, glyph(s), 0, G);
        b.name = 'Stim_' + (i + 1) + '_' + k + (d > 0 ? '_up' : '_down');
        ract(b, () => {
          sim.inp[k] = Math.min(hi, Math.max(lo, sim.inp[k] + d * st));
          draw();
        });
      });
    } else {
      const b = rp(0.11, 0.045, 0.115, y, 0.008, 0, 0, glyph('TOGGLE'), 0, G);
      b.material.map = rtex(128, 56, (g) => {
        g.fillStyle = '#39434d';
        g.fillRect(0, 0, 128, 56);
        g.fillStyle = '#eee9dd';
        g.font = '600 22px system-ui,sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('TOGGLE', 64, 30);
      });
      b.name = 'Stim_' + (i + 1) + '_' + k + '_toggle';
      ract(b, () => {
        sim.inp[k] = sim.inp[k] ? 0 : 1;
        draw();
      });
    }
    lab.m.position.x = -0.065;
    draw();
    return draw;
  });
  tab.draw = () => {
    const g = scr.t.image.getContext('2d');
    g.fillStyle = '#0e1418';
    g.fillRect(0, 0, 384, 130);
    g.font = '500 15px ui-monospace,Menlo,monospace';
    g.textAlign = 'left';
    g.fillStyle = sim.running ? '#7be0a4' : '#e08a4c';
    g.fillText(sim.running ? 'RUNNING' : 'STOPPED — press RUN', 8, 20);
    g.fillStyle = '#d8d2c4';
    sim.serial.slice(-4).forEach((l, k) => g.fillText(String(l).slice(0, 40), 8, 44 + k * 21));
    scr.t.needsUpdate = true;
    const r = run.t.image.getContext('2d');
    r.fillStyle = sim.running ? '#9c2f23' : '#2f8f57';
    r.fillRect(0, 0, 384, 62);
    r.fillStyle = '#fff';
    r.font = '700 30px system-ui,sans-serif';
    r.textAlign = 'center';
    r.textBaseline = 'middle';
    r.fillText(sim.running ? 'STOP' : 'RUN', 192, 33);
    run.t.needsUpdate = true;
    rows.forEach((f) => f());
  };
  tab.draw();
}
/* ---- room ---- */
function rchair(x, z, ry, p) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  (p || rscene).add(g);
  g.name = 'Chair';
  rb(0.44, 0.04, 0.44, 0x3b4a5a, 0, 0.45, 0, g);
  rb(0.44, 0.4, 0.03, 0x3b4a5a, 0, 0.68, 0.2, g);
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([a, b]) =>
    rb(0.03, 0.43, 0.03, 0x7c858f, a * 0.19, 0.215, b * 0.19, g, { metalness: 0.5 }),
  );
  return g;
}
function rdesk(x, z, w, d, name) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.name = name;
  rscene.add(g);
  rb(w, 0.04, d, 0xb98f5e, 0, 0.73, 0, g);
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([a, b]) =>
    rb(0.04, 0.71, 0.04, 0x7c858f, a * (w / 2 - 0.05), 0.355, b * (d / 2 - 0.05), g, {
      metalness: 0.5,
    }),
  );
  return g;
}
function rswitch(S, x, y, nm, get, set) {
  const b = rb(0.09, 0.1, 0.02, 0xbfb9aa, x, y, 0.04, S),
    t = rb(0.065, 0.045, 0.03, 0x39434d, x, y, 0.06, S);
  b.name = t.name = nm;
  ract(b, set);
  ract(t, set);
  rsw.push([t, get]);
}
function rbookshelf(x, z, ry, name) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  g.name = name;
  rscene.add(g);
  rb(2.4, 2.1, 0.03, 0x8b6b4a, 0, 1.05, -0.18, g);
  rb(0.04, 2.1, 0.4, 0x8b6b4a, -1.18, 1.05, 0, g);
  rb(0.04, 2.1, 0.4, 0x8b6b4a, 1.18, 1.05, 0, g);
  for (let k = 0; k < 5; k++) rb(2.4, 0.04, 0.4, 0x8b6b4a, 0, 0.02 + k * 0.52, 0, g);
  const pal = [0x9c2f23, 0x2f6fb5, 0x4c9a6a, 0xd1a63c, 0x6b4f9a, 0x3b4a5a, 0xc9622b, 0xe8e2d4];
  let n = 0,
    list = [];
  for (let s = 0; s < 4; s++) {
    let px = -1.12;
    while (px < 1.1) {
      const w = 0.03 + Math.random() * 0.035,
        h = 0.26 + Math.random() * 0.16;
      list.push([
        px + w / 2,
        0.04 + s * 0.52 + h / 2 + 0.02,
        w,
        h,
        pal[(Math.random() * pal.length) | 0],
      ]);
      px += w + 0.004;
    }
  }
  const im = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      mat(0xffffff, { roughness: 0.8, metalness: 0 }),
      list.length,
    ),
    m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion();
  im.name = 'Books';
  list.forEach(([bx, by, w, h, c], i) => {
    m4.compose(new THREE.Vector3(bx, by, 0), q, new THREE.Vector3(w, h, 0.22));
    im.setMatrixAt(i, m4);
    im.setColorAt(i, new THREE.Color(c));
  });
  g.add(im);
  const c = Math.cos(ry),
    s = Math.sin(ry);
  rbox.push({ x0: x - 1.2, x1: x + 1.2, z0: z - 0.45, z1: z + 0.45 });
}
const RPOST = [
  [
    'Smart Home',
    'Lights, locks and climate that respond to you.',
    (g) => {
      g.beginPath();
      g.moveTo(90, 240);
      g.lineTo(180, 160);
      g.lineTo(270, 240);
      g.stroke();
      g.strokeRect(110, 240, 140, 90);
      g.strokeRect(165, 275, 30, 55);
      rwifi(g, 180, 125);
    },
  ],
  [
    'Smart Farming',
    'Soil sensors water crops only when they need it.',
    (g) => {
      g.beginPath();
      g.moveTo(180, 330);
      g.lineTo(180, 200);
      g.stroke();
      [
        [150, 225, -0.6],
        [210, 210, 0.6],
      ].forEach(([x, y, r]) => {
        g.beginPath();
        g.ellipse(x, y, 32, 13, r, 0, 7);
        g.stroke();
      });
      g.beginPath();
      g.moveTo(90, 330);
      g.lineTo(270, 330);
      g.stroke();
      rwifi(g, 180, 150);
    },
  ],
  [
    'Wearable Health',
    'A pulse sensor and a phone track your heart live.',
    (g) => {
      g.beginPath();
      g.moveTo(180, 320);
      g.bezierCurveTo(85, 245, 105, 160, 180, 205);
      g.bezierCurveTo(255, 160, 275, 245, 180, 320);
      g.stroke();
      g.beginPath();
      g.moveTo(95, 250);
      g.lineTo(148, 250);
      g.lineTo(164, 215);
      g.lineTo(186, 285);
      g.lineTo(202, 245);
      g.lineTo(265, 245);
      g.stroke();
    },
  ],
  [
    'Smart Traffic',
    'Signals adapt to real vehicle flow at the junction.',
    (g) => {
      g.strokeRect(138, 140, 84, 196);
      [
        ['#ff4d4d', 182],
        ['#ffd21f', 238],
        ['#23d160', 294],
      ].forEach(([c, y]) => {
        g.fillStyle = c;
        g.beginPath();
        g.arc(180, y, 21, 0, 7);
        g.fill();
      });
    },
  ],
  [
    'Industrial IoT',
    'Machine sensors predict faults before they happen.',
    (g) => {
      g.beginPath();
      g.arc(180, 240, 46, 0, 7);
      g.stroke();
      g.beginPath();
      g.arc(180, 240, 16, 0, 7);
      g.stroke();
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        g.beginPath();
        g.moveTo(180 + Math.cos(a) * 46, 240 + Math.sin(a) * 46);
        g.lineTo(180 + Math.cos(a) * 64, 240 + Math.sin(a) * 64);
        g.stroke();
      }
      rwifi(g, 180, 150);
    },
  ],
  [
    'Weather Station',
    'Temperature and humidity logged to the cloud.',
    (g) => {
      g.beginPath();
      g.arc(150, 190, 26, 0, 7);
      g.stroke();
      [
        [175, 265, 32],
        [215, 250, 42],
        [252, 268, 28],
      ].forEach(([x, y, r]) => {
        g.beginPath();
        g.arc(x, y, r, 0, 7);
        g.stroke();
      });
    },
  ],
  [
    'Smart Parking',
    'Ultrasonic sensors show which bays are free.',
    (g) => {
      g.strokeRect(120, 170, 120, 120);
      g.font = '700 90px system-ui,sans-serif';
      g.textAlign = 'center';
      g.fillText('P', 180, 262);
    },
  ],
  [
    'Water Management',
    'Flow sensors catch leaks and track usage.',
    (g) => {
      g.beginPath();
      g.moveTo(180, 150);
      g.bezierCurveTo(125, 235, 135, 310, 180, 310);
      g.bezierCurveTo(225, 310, 235, 235, 180, 150);
      g.stroke();
      [330, 350].forEach((y) => {
        g.beginPath();
        for (let x = 100; x <= 260; x += 4) g.lineTo(x, y + Math.sin(x / 9) * 5);
        g.stroke();
      });
    },
  ],
];
function rwifi(g, x, y) {
  [16, 30, 44].forEach((r) => {
    g.beginPath();
    g.arc(x, y, r, -2.4, -0.74);
    g.stroke();
  });
  g.beginPath();
  g.arc(x, y, 4, 0, 7);
  g.fill();
}
function rsetup(tab, e) {
  const T = tab.T,
    i = tab.i;
  if (tab.D) {
    T.remove(tab.D);
    rhits = rhits.filter((m) => {
      for (let o = m; o; o = o.parent) if (o === tab.D) return false;
      return true;
    });
  }
  const D = new THREE.Group();
  D.name = 'Setup';
  T.add(D);
  tab.D = D;
  const sim = makeSim(e, DEFS);
  sim.reset(e.defaultCode);
  tab.e = e;
  tab.sim = sim;
  tab.lit = {};
  const C = rcircuit(e, sim);
  C.g.position.set(-0.22, 0.755, -0.02);
  C.g.name = 'Circuit_' + String(i + 1).padStart(2, '0');
  D.add(C.g);
  tab.fxs = C.fxs;
  tab.K = C.K;
  tab.circ = C.g;
  const pq = rtex(512, 96, (g) => {
    g.fillStyle = '#16222c';
    g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#e08a4c';
    g.font = '700 46px system-ui,sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(String(e.id).padStart(2, '0'), 16, 50);
    g.fillStyle = '#fff';
    let fs = 26;
    g.font = '600 ' + fs + 'px system-ui,sans-serif';
    while (g.measureText(e.title).width > 400 && fs > 13) {
      fs--;
      g.font = '600 ' + fs + 'px system-ui,sans-serif';
    }
    g.fillText(e.title, 90, 50);
  });
  rp(0.5, 0.094, -0.25, 0.7625, 0.34, -HP, 0, pq, 0, D);
  rpanel(D, i, e, sim, tab);
}
function buildRoom() {
  rscene = new THREE.Scene();
  rscene.background = new THREE.Color(0x151b21);
  rcam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 120);
  rig = new THREE.Group();
  rig.name = 'Player';
  rig.add(rcam);
  rscene.add(rig);
  rcam.position.set(0, 1.65, 0);
  rig.position.set(0, 0, 9);
  rhemi = new THREE.HemisphereLight(0xffffff, 0x6b7480, 0.6);
  rscene.add(rhemi);
  const W = 2 * RX,
    D = RZ1 - RZ0,
    cz = (RZ0 + RZ1) / 2;
  rp(W, D, 0, 0, cz, -HP, 0, null, 0x848c95).name = 'Floor';
  rp(W, D, 0, WH, cz, HP, 0, null, 0xdedcd6).name = 'Ceiling';
  rp(W, WH, 0, WH / 2, RZ0, 0, 0, null, 0xcdc9bf).name = 'Wall_Front';
  rp(W, WH, 0, WH / 2, RZ1, 0, Math.PI, null, 0xcdc9bf).name = 'Wall_Back';
  rp(D, WH, -RX, WH / 2, cz, 0, HP, null, 0xc6c2b8).name = 'Wall_Left';
  rp(D, WH, RX, WH / 2, cz, 0, -HP, null, 0xc6c2b8).name = 'Wall_Right';
  [-7, -1, 5, 11].forEach((z, zi) => {
    const l = new THREE.PointLight(0xfff1dc, 0.42, 22, 1.3);
    l.position.set(0, 3.2, z);
    l.name = 'ZoneLight_' + (zi + 1);
    rscene.add(l);
    rpl.push(l);
    [-9, -3, 3, 9].forEach((x) => {
      const m = rb(1.4, 0.05, 0.6, 0xffffff, x, WH - 0.03, z, null, {
        emissive: 0xfff2d6,
        emissiveIntensity: 1,
      });
      m.name = 'CeilingLight_Z' + (zi + 1);
      rlights.push([zi, m]);
    });
  });
  [
    [-1, -3],
    [-1, 4],
    [-1, 11],
    [1, -3],
    [1, 4],
    [1, 11],
  ].forEach(([s, z], i) => {
    const g = new THREE.Group();
    g.position.set(s * (RX - 0.12), 3.0, z);
    g.rotation.y = -s * HP;
    g.name = 'AirCon_' + (i + 1);
    rscene.add(g);
    const body = rb(1.1, 0.3, 0.22, 0xf2f2f0, 0, 0, 0, g),
      fl = new THREE.Group();
    fl.position.set(0, -0.14, 0.1);
    g.add(fl);
    rb(1, 0.03, 0.1, 0xdadad6, 0, 0, 0.05, fl);
    const led = rb(0.04, 0.04, 0.01, 0x224433, 0.46, 0.04, 0.115, g, { emissive: 0x000000 });
    const tg = () => {
      rac[i] ^= 1;
    };
    body.name = 'AC_Unit_' + (i + 1) + '_Button';
    ract(body, tg);
    racs.push({ fl, led, i });
  });
  const SB = new THREE.Group();
  SB.position.set(-RX + 0.03, 1.35, -6.5);
  SB.rotation.y = HP;
  SB.name = 'SwitchBoard';
  rscene.add(SB);
  rb(0.72, 1.3, 0.04, 0xd6d1c4, 0, 0, 0, SB);
  const st = rtex(288, 520, (g) => {
    g.fillStyle = '#d6d1c4';
    g.fillRect(0, 0, 288, 520);
    g.fillStyle = '#39434d';
    g.textAlign = 'center';
    g.font = '700 20px system-ui,sans-serif';
    g.fillText('LIGHTS', -0.1 * 400 + 144, 60);
    g.fillText('AIR CON', 0.2 * 400 + 144, 60);
    g.font = '600 17px system-ui,sans-serif';
    g.textAlign = 'left';
    for (let k = 0; k < 4; k++)
      g.fillText('Zone ' + (k + 1), 144 - 0.34 * 400, 260 - (0.4 - k * 0.16) * 400 + 6);
    for (let k = 0; k < 6; k++)
      g.fillText('AC ' + (k + 1), 144 + 0.02 * 400, 260 - (0.4 - k * 0.16) * 400 + 6);
  });
  rp(0.72, 1.3, 0, 0, 0.021, 0, 0, st, 0, SB);
  for (let k = 0; k < 4; k++)
    rswitch(
      SB,
      -0.12,
      0.4 - k * 0.16,
      'Switch_Light_Zone_' + (k + 1),
      () => rzone[k],
      () => {
        rzone[k] ^= 1;
      },
    );
  for (let k = 0; k < 6; k++)
    rswitch(
      SB,
      0.27,
      0.4 - k * 0.16,
      'Switch_AC_' + (k + 1),
      () => rac[k],
      () => {
        rac[k] ^= 1;
      },
    );
  /* whiteboard */
  const wb = rtex(1280, 380, (g) => {
    g.fillStyle = '#f6f5f0';
    g.fillRect(0, 0, 1280, 380);
    g.strokeStyle = '#cfc9bb';
    g.lineWidth = 6;
    g.strokeRect(6, 6, 1268, 368);
    g.fillStyle = '#b4531c';
    g.font = '700 40px system-ui,sans-serif';
    g.textAlign = 'left';
    g.fillText('IoT & Electronics Lab', 40, 64);
    g.fillStyle = '#69727c';
    g.font = '500 22px system-ui,sans-serif';
    g.fillText(
      'Walk to a table and press RUN. Wall switchboard: lights and air conditioners.',
      40,
      98,
    );
    g.fillStyle = '#1f262d';
    g.font = '600 21px system-ui,sans-serif';
    EXPS.forEach((x, k) => {
      const c = k < 7 ? 0 : 1,
        r = k % 7;
      g.fillText(
        String(x.id).padStart(2, '0') + '  ' + x.title.slice(0, 46),
        40 + c * 620,
        150 + r * 32,
      );
    });
  });
  rp(6.4, 1.9, 0, 1.95, RZ0 + 0.02, 0, 0, wb, 0).name = 'Whiteboard';
  /* posters */
  RPOST.forEach(([t, s, dr], i) => {
    const left = i < 4,
      z = [-9, -1.5, 5.5, 12][i % 4],
      x = left ? -RX + 0.03 : RX - 0.03;
    const tx = rtex(360, 480, (g) => {
      g.fillStyle = '#16222c';
      g.fillRect(0, 0, 360, 480);
      g.strokeStyle = '#7be0a4';
      g.fillStyle = '#7be0a4';
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.font = '500 14px ui-monospace,monospace';
      g.textAlign = 'center';
      g.fillStyle = '#e08a4c';
      g.fillText('IoT INSPIRATION', 180, 40);
      g.fillStyle = '#fff';
      g.font = '700 30px system-ui,sans-serif';
      g.fillText(t, 180, 84);
      g.strokeStyle = '#7be0a4';
      g.fillStyle = '#7be0a4';
      dr(g);
      g.fillStyle = '#a9b4be';
      g.font = '500 16px system-ui,sans-serif';
      rwrap(g, s, 180, 412, 30, 22);
    });
    const G = new THREE.Group();
    G.position.set(x, 1.85, z);
    G.rotation.y = left ? HP : -HP;
    G.name = 'Poster_' + t.replace(/ /g, '_');
    rscene.add(G);
    rb(0.94, 1.24, 0.03, 0x2b323a, 0, 0, 0, G);
    rp(0.86, 1.15, 0, 0, 0.017, 0, 0, tx, 0, G);
  });
  /* bookshelves */
  [-9, -3, 3, 9].forEach((x, i) => rbookshelf(x, RZ1 - 0.22, Math.PI, 'Bookshelf_Back_' + (i + 1)));
  rbookshelf(-10, RZ0 + 0.22, 0, 'Bookshelf_Front_1');
  rbookshelf(10, RZ0 + 0.22, 0, 'Bookshelf_Front_2');
  /* teacher desk */
  const TD = rdesk(0, -8.6, 2.1, 0.9, 'TeacherDesk');
  rchair(0, -9.75, Math.PI);
  rbox.push({ x0: -1.05, x1: 1.05, z0: -9.05, z1: -8.15 });
  const MG = new THREE.Group();
  MG.position.set(0.55, 0.76, 0.12);
  MG.rotation.x = -0.45;
  MG.name = 'MasterPanel';
  TD.add(MG);
  rb(0.46, 0.2, 0.012, 0x2b323a, 0, 0.1, 0, MG);
  [
    [
      'LIGHTS',
      -0.11,
      0.14,
      () => {
        const a = rzone.some((v) => v);
        rzone.fill(a ? 0 : 1);
      },
    ],
    [
      'AIR CON',
      0.11,
      0.14,
      () => {
        const a = rac.some((v) => v);
        rac.fill(a ? 0 : 1);
      },
    ],
    [
      'RUN ALL',
      -0.11,
      0.05,
      () =>
        rtabs.forEach((t) => {
          t.sim.reset(t.e.defaultCode);
          t.sim.start();
          t.draw();
        }),
    ],
    [
      'STOP ALL',
      0.11,
      0.05,
      () =>
        rtabs.forEach((t) => {
          t.sim.stop();
          t.draw();
        }),
    ],
  ].forEach(([n, x, y, f]) => {
    const m = rp(
      0.2,
      0.07,
      x,
      y,
      0.008,
      0,
      0,
      rtex(200, 70, (g) => {
        g.fillStyle = '#39434d';
        g.fillRect(0, 0, 200, 70);
        g.fillStyle = '#eee9dd';
        g.font = '700 26px system-ui,sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(n, 100, 37);
      }),
      0,
      MG,
    );
    m.name = 'Master_' + n.replace(' ', '_');
    ract(m, f);
  });
  /* experiment tables */
  EXPS.forEach((ex, i) => {
    const col = i % 7,
      row = (i / 7) | 0,
      x = -9 + col * 3,
      z = -3 + row * 6;
    const T = rdesk(
      x,
      z,
      1.5,
      0.8,
      'Table_' +
        String(i + 1).padStart(2, '0') +
        '_' +
        ex.title.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 32),
    );
    rchair(x, z + 0.85, 0);
    rbox.push({ x0: x - 0.75, x1: x + 0.75, z0: z - 0.4, z1: z + 0.4 });
    const tab = { i, x, z, T, draw: () => {}, lit: {} };
    rtabs.push(tab);
    rsetup(tab, JSON.parse(JSON.stringify(ex)));
  });
  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    rig.add(c);
    c.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(0, 0, -4),
        ]),
        new THREE.LineBasicMaterial({ color: 0x7be0a4 }),
      ),
    );
    c.addEventListener('selectstart', () => {
      rm4.identity().extractRotation(c.matrixWorld);
      rrc.ray.origin.setFromMatrixPosition(c.matrixWorld);
      rrc.ray.direction.set(0, 0, -1).applyMatrix4(rm4);
      rfire();
    });
  }
}
function rfire() {
  rscene.updateMatrixWorld(true);
  const h = rrc.intersectObjects(rhits, false)[0];
  if (h && h.object.userData.act) h.object.userData.act();
}
function rpick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  rn.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
  rrc.setFromCamera(rn, rcam);
  rfire();
}
/* ---- movement ---- */
function rslide(p) {
  const R = 0.3;
  p.x = Math.min(RX - 0.4, Math.max(-RX + 0.4, p.x));
  p.z = Math.min(RZ1 - 0.4, Math.max(RZ0 + 0.4, p.z));
  rbox.forEach((b) => {
    const cx = Math.min(b.x1, Math.max(b.x0, p.x)),
      cz = Math.min(b.z1, Math.max(b.z0, p.z)),
      dx = p.x - cx,
      dz = p.z - cz,
      d = Math.hypot(dx, dz);
    if (d < R) {
      if (d > 1e-4) {
        p.x = cx + (dx / d) * R;
        p.z = cz + (dz / d) * R;
      } else {
        const l = p.x - b.x0,
          r = b.x1 - p.x,
          t = p.z - b.z0,
          f = b.z1 - p.z,
          m = Math.min(l, r, t, f);
        if (m === l) p.x = b.x0 - R;
        else if (m === r) p.x = b.x1 + R;
        else if (m === t) p.z = b.z0 - R;
        else p.z = b.z1 + R;
      }
    }
  });
}
function roomFrame(dt, now, still) {
  const xr = renderer.xr.isPresenting;
  if (!xr) {
    const a = innerWidth / innerHeight;
    if (Math.abs(rcam.aspect - a) > 0.001) {
      rcam.aspect = a;
      rcam.updateProjectionMatrix();
    }
  }
  if (!still) {
    let mx = (rkey.d ? 1 : 0) - (rkey.a ? 1 : 0) + rjoy.x,
      mz =
        (rkey.s ? 1 : 0) -
        (rkey.w ? 1 : 0) +
        rjoy.y +
        (rkey.arrowdown ? 1 : 0) -
        (rkey.arrowup ? 1 : 0),
      spd = rkey.shift ? 3.4 : 1.8;
    if (rkey.arrowleft) ryaw += dt * 1.8;
    if (rkey.arrowright) ryaw -= dt * 1.8;
    let yaw = ryaw;
    if (xr) {
      const ss = renderer.xr.getSession();
      if (ss)
        ss.inputSources.forEach((s) => {
          const a = s.gamepad && s.gamepad.axes;
          if (!a || a.length < 4) return;
          if (s.handedness === 'left') {
            mx += a[2];
            mz += a[3];
          } else if (s.handedness === 'right') {
            if (Math.abs(a[2]) > 0.7 && !rsnap) {
              rsnap = 1;
              const p0 = new THREE.Vector3();
              rcam.getWorldPosition(p0);
              rig.rotation.y += a[2] > 0 ? -Math.PI / 6 : Math.PI / 6;
              rig.updateMatrixWorld(true);
              const p1 = new THREE.Vector3();
              rcam.getWorldPosition(p1);
              rig.position.add(p0.sub(p1));
            } else if (Math.abs(a[2]) < 0.3) rsnap = 0;
          }
        });
      rcam.getWorldDirection(rv);
      yaw = Math.atan2(-rv.x, -rv.z);
      spd = 2;
    }
    const L = Math.hypot(mx, mz);
    if (L > 0.08) {
      if (L > 1) {
        mx /= L;
        mz /= L;
      }
      const c = Math.cos(yaw),
        s = Math.sin(yaw),
        md = Math.min(dt, 0.1),
        dx = (c * mx + s * mz) * spd * md,
        dz = (-s * mx + c * mz) * spd * md,
        n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.05));
      for (let k = 0; k < n; k++) {
        rig.position.x += dx / n;
        rig.position.z += dz / n;
        rslide(rig.position);
      }
    }
    if (!xr) {
      rig.rotation.y = ryaw;
      rcam.rotation.x = rpit;
    }
  }
  rzone.forEach((on, i) => {
    rzk[i] += ((on ? 1 : 0) - rzk[i]) * Math.min(1, dt * 6);
    rpl[i].intensity = 0.42 * rzk[i];
  });
  rhemi.intensity = 0.16 + (0.5 * (rzk[0] + rzk[1] + rzk[2] + rzk[3])) / 4;
  rlights.forEach(([zi, m]) => (m.material.emissiveIntensity = rzk[zi]));
  racs.forEach((a) => {
    const on = rac[a.i];
    a.fl.rotation.x += ((on ? -0.75 : 0) - a.fl.rotation.x) * Math.min(1, dt * 5);
    a.led.material.emissive.setHex(on ? 0x2fe08a : 0x000000);
    a.led.material.emissiveIntensity = on ? 1.2 : 0;
  });
  rsw.forEach(([t, get]) => (t.rotation.x = get() ? -0.35 : 0.35));
  rtt += dt;
  const slow = rtt > 0.1;
  if (slow) rtt = 0;
  rtabs.forEach((t) => {
    if (t.sim.running) t.sim.tick(now);
    if (slow) {
      t.lit = t.sim.lit();
      if (t.sim.running) t.draw();
    }
    t.fxs.forEach((r) => {
      const on = t.lit[r.c.id];
      if (r.glow) {
        const m = r.glow.material;
        m.emissiveIntensity += ((on ? 2.2 : 0.05) - m.emissiveIntensity) * Math.min(1, dt * 14);
      }
      if (r.buz) r.buz.scale.setScalar(on ? 1 + 0.06 * Math.sin(now / 30) : 1);
      if (r.spin && on) r.spin.rotation.x += dt * 14;
    });
  });
  if (slow && !still) {
    let b = -1,
      bd = 2.2;
    rtabs.forEach((t, i) => {
      const col = i % 7,
        row = (i / 7) | 0,
        d = Math.hypot(rig.position.x - (-9 + col * 3), rig.position.z - (-3 + row * 6));
      if (d < bd) {
        bd = d;
        b = i;
      }
    });
    if (b !== rnear) {
      rnear = b;
      const be = $('redit');
      be.hidden = b < 0;
      if (b >= 0) be.textContent = 'Edit table ' + (b + 1) + ' circuit';
    }
  }
}
/* ---- input ---- */
addEventListener('keydown', (e) => {
  if (view === 'room' && e.target.tagName !== 'INPUT') {
    rkey[e.key.toLowerCase()] = 1;
    if (e.key.toLowerCase() === 'e' && rscene) {
      rrc.setFromCamera(new THREE.Vector2(0, 0), rcam);
      rfire();
    }
  }
});
addEventListener('keyup', (e) => {
  rkey[e.key.toLowerCase()] = 0;
});
addEventListener('blur', () => {
  for (const k in rkey) rkey[k] = 0;
});
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (view !== 'room') return;
  try {
    renderer.domElement.setPointerCapture(e.pointerId);
  } catch (x) {}
  rdrag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, id: e.pointerId };
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (view !== 'room' || !rdrag || rdrag.id !== e.pointerId) return;
  ryaw -= (e.clientX - rdrag.x) * 0.005;
  rpit = Math.max(-1.3, Math.min(1.3, rpit - (e.clientY - rdrag.y) * 0.005));
  rdrag.x = e.clientX;
  rdrag.y = e.clientY;
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (view !== 'room' || !rdrag || rdrag.id !== e.pointerId) return;
  const m = Math.hypot(e.clientX - rdrag.sx, e.clientY - rdrag.sy);
  rdrag = null;
  if (m < 7 && rscene) rpick(e);
});
(function () {
  const j = $('joy'),
    k = j.firstElementChild;
  let id = null;
  const set = (e) => {
    const r = j.getBoundingClientRect();
    let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2 - 14),
      dy = (e.clientY - r.top - r.height / 2) / (r.height / 2 - 14);
    const l = Math.hypot(dx, dy);
    if (l > 1) {
      dx /= l;
      dy /= l;
    }
    rjoy.x = dx;
    rjoy.y = dy;
    k.style.transform = 'translate(' + dx * 34 + 'px,' + dy * 34 + 'px)';
  };
  j.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    try {
      j.setPointerCapture(id);
    } catch (x) {}
    set(e);
  });
  j.addEventListener('pointermove', (e) => {
    if (e.pointerId === id) set(e);
  });
  const end = (e) => {
    if (e.pointerId === id) {
      id = null;
      rjoy.x = rjoy.y = 0;
      k.style.transform = '';
    }
  };
  j.addEventListener('pointerup', end);
  j.addEventListener('pointercancel', end);
})();
let rcur = -1;
function rattach(t) {
  rscene.add(root);
  lab.visible = false;
  root.position.set(t.x - 0.22, 0.755, t.z - 0.02);
  root.scale.setScalar(t.K);
  root.add(camera);
  camera.near = 0.02;
  camera.far = 300;
  camera.updateProjectionMatrix();
  PAD = 2;
  rattached = 1;
  root.updateMatrixWorld(true);
}
function rdetach() {
  if (!rattached) return;
  rscene.remove(root);
  scene.add(root);
  root.position.set(0, 0, 0);
  root.scale.setScalar(1);
  root.remove(camera);
  camera.near = 0.1;
  camera.far = 800;
  camera.updateProjectionMatrix();
  lab.visible = true;
  PAD = 10;
  rattached = 0;
}
function reditTable(i) {
  const t = rtabs[i];
  t.sim.stop();
  t.circ.visible = false;
  t.draw();
  rcur = i;
  rattach(t);
  openExp(JSON.parse(JSON.stringify(t.e)));
  $('pname').value = t.e.title;
  show('bench');
}
function rleave() {
  const i = rcur,
    t = rtabs[i],
    e = JSON.parse(JSON.stringify(exp));
  e.defaultCode = $('cd').value;
  e.tips = t.e.tips || [];
  const was = dirty;
  stop();
  rdetach();
  rsetup(t, e);
  rcur = -1;
  rnear = -2;
  show('room');
  rt(
    was
      ? 'Table updated. Use Save while editing to keep it in My projects.'
      : 'Back in the classroom.',
  );
}
function rgo(i) {
  const t = rtabs[i];
  rig.position.set(t.x, 0, t.z + 1.45);
  ryaw = 0;
  rpit = -0.5;
  rnear = -2;
}
function rputProject(i, e) {
  rsetup(rtabs[i], e);
}
function enterRoom() {
  if (!rbuilt) {
    buildRoom();
    rbuilt = 1;
  }
  ryaw = 0;
  rpit = 0;
  rig.position.set(0, 0, 9);
  rig.rotation.set(0, 0, 0);
  rcam.rotation.set(0, 0, 0);
  rnear = -2;
  show('room');
}
function exitRoom() {
  const s = renderer.xr.getSession && renderer.xr.getSession();
  if (s) s.end();
  renderDash();
  show('dash');
  heroOn = 0;
  hero();
}
$('rexit').onclick = exitRoom;
$('rhelp').onclick = () => ($('rhint').hidden = !$('rhint').hidden);
$('redit').onclick = () => {
  if (rnear < 0) return;
  const i = rnear,
    s = renderer.xr.getSession && renderer.xr.getSession();
  if (s) s.end();
  cur = { id: null };
  reditTable(i);
};
(async () => {
  try {
    if (navigator.xr && (await navigator.xr.isSessionSupported('immersive-vr')))
      $('rvr').hidden = false;
  } catch (e) {}
})();
$('rvr').onclick = async () => {
  try {
    const s = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor', 'bounded-floor'],
    });
    await renderer.xr.setSession(s);
    xrMode = 'vr';
    rcam.position.set(0, 0, 0);
    s.addEventListener('end', () => {
      xrMode = null;
      rcam.position.set(0, 1.65, 0);
      rig.rotation.y = ryaw;
    });
  } catch (e) {
    rt('Couldn’t start VR here. Open the page link directly in the Quest Browser.');
  }
};
