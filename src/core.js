function bbNet(id) {
  if (id.startsWith('rail_top_neg')) return 'rail_top_neg';
  if (id.startsWith('rail_top_pos')) return 'rail_top_pos';
  if (id.startsWith('rail_bot_pos')) return 'rail_bot_pos';
  if (id.startsWith('rail_bot_neg')) return 'rail_bot_neg';
  if (id.startsWith('hole_')) {
    const p = id.split('_');
    if (p.length === 3) return ('fghij'.includes(p[1]) ? 'term_upper_' : 'term_lower_') + p[2];
  }
  return null;
}
function pinAbs(c, d, p) {
  const cx = c.x + d.width / 2,
    cy = c.y + d.height / 2,
    rx = p.x - d.width / 2,
    ry = p.y - d.height / 2,
    r = (c.rotation * Math.PI) / 180;
  return [cx + rx * Math.cos(r) - ry * Math.sin(r), cy + rx * Math.sin(r) + ry * Math.cos(r)];
}
function prep(code) {
  const defs = {};
  code = code.replace(/^\s*#define\s+(\w+)\s+(\S+)/gm, (m, n, v) => {
    defs[n] = isNaN(v) ? v : Number(v);
    return m;
  });
  code = code.replace(
    /\b(unsigned\s+long|unsigned\s+int|long|byte|uint8_t|uint16_t|uint32_t|size_t)\s+(?=\w+\s*=)/g,
    'int ',
  );
  return { code, defs };
}
class VInterp extends CircuitInterpreter {
  skipArduinoBlock() {
    let c = 1,
      i = this.pc + 1;
    const L = this.parsedLines;
    while (i < L.length) {
      const t = L[i].text;
      for (let k = 0; k < t.length; k++) {
        const ch = t[k];
        if (ch === '{') c++;
        else if (ch === '}') {
          c--;
          if (c === 0) {
            if (/^\s*else\b/.test(t.slice(k + 1))) {
              this.pc = i - 1;
              this.viaSkip = true;
            } else this.pc = i;
            return;
          }
        }
      }
      i++;
    }
  }
  executeLine(line) {
    const t = line.endsWith(';') ? line.slice(0, -1).trim() : line;
    const m = /^\}\s*else\b\s*(?:if\s*\((.+)\))?\s*\{?$/.exec(t);
    if (m) {
      if (this.viaSkip) {
        this.viaSkip = false;
        if (m[1] && !this.evaluateExpression(m[1].trim())) this.skipArduinoBlock();
        return;
      }
      this.skipArduinoBlock();
      while (this.viaSkip) {
        this.viaSkip = false;
        this.pc++;
        this.skipArduinoBlock();
      }
      return;
    }
    return super.executeLine(line);
  }
  evaluateExpression(e) {
    const t = String(e).trim(),
      sc = { ...this.globals, ...this.locals };
    if (this.platform === 'Arduino') {
      if (t === 'LOW') return 0;
      if (t === 'HIGH') return 1;
    }
    let m = /^(not\s+)?([A-Za-z_]\w*)$/.exec(t);
    if (m && Array.isArray(sc[m[2]])) {
      const v = sc[m[2]].length > 0;
      return m[1] ? !v : v;
    }
    m = /^([A-Za-z_]\w*)\[(\d+)\]$/.exec(t);
    if (m && Array.isArray(sc[m[1]])) return sc[m[1]][+m[2]];
    return super.evaluateExpression(e);
  }
}
function makeSim(exp, DEFS) {
  const comps = exp.defaultComponents,
    wires = exp.defaultWires,
    bb = comps.find((c) => c.type === 'breadboard'),
    par = {},
    onBb = new Set();
  const f = (k) => {
      if (!(k in par)) par[k] = k;
      while (par[k] !== k) {
        par[k] = par[par[k]];
        k = par[k];
      }
      return k;
    },
    u = (a, b) => {
      par[f(a)] = f(b);
    };
  const key = (c, p) => {
    if (bb && c === bb.id) {
      const n = bbNet(p);
      if (n) return 'bb:' + n;
    }
    return c + '/' + p;
  };
  wires.forEach((w) => u(key(w.fromComponentId, w.fromPinId), key(w.toComponentId, w.toPinId)));
  if (bb) {
    const bd = DEFS.breadboard;
    comps.forEach((c) => {
      if (c === bb) return;
      const d = DEFS[c.type];
      if (!d) return;
      if (!(
        c.x > bb.x - 30 &&
        c.x < bb.x + bd.width + 10 &&
        c.y > bb.y - 30 &&
        c.y < bb.y + bd.height + 10
      ))
        return;
      onBb.add(c.id);
      d.pins.forEach((p) => {
        const [ax, ay] = pinAbs(c, d, p);
        for (const h of bd.pins) {
          if (Math.hypot(ax - bb.x - h.x, ay - bb.y - h.y) < 5) {
            const n = bbNet(h.id);
            if (n) u(c.id + '/' + p.id, 'bb:' + n);
            break;
          }
        }
      });
    });
  }
  const ctrl = comps.find((c) => c.type === 'arduino' || c.type === 'raspberry_pi'),
    net = (c, p) => f(c + '/' + p);
  const cpid = (s) => {
    s = String(s);
    if (!ctrl) return null;
    if (ctrl.type === 'arduino')
      return /^\d+$/.test(s)
        ? 'arduino-D' + s
        : /^A\d+$/i.test(s)
          ? 'arduino-' + s.toUpperCase()
          : null;
    return 'GP' + s.replace(/^GP/i, '');
  };
  const adj = {};
  comps
    .filter((c) => c.type === 'resistor')
    .forEach((c) => {
      const a = net(c.id, 'p1'),
        b = net(c.id, 'p2');
      (adj[a] = adj[a] || []).push(b);
      (adj[b] = adj[b] || []).push(a);
    });
  const pinv = {},
    serial = [],
    inp = {
      temperature: 24,
      humidity: 45,
      distance: 50,
      motion: 0,
      waterFlowLPM: 0,
      buttonInput: 0,
      flaskToggleInput: 0,
      bpmInput: 72,
      tempProbe: 25,
    };
  const dht = comps.find((c) => c.type === 'dht11');
  if (dht && dht.properties.temperature != null) {
    inp.temperature = dht.properties.temperature;
    inp.humidity = dht.properties.humidity ?? 45;
  }
  const spread = (s) => {
    const q = [...s];
    while (q.length) {
      const k = q.pop();
      (adj[k] || []).forEach((n) => {
        if (!s.has(n)) {
          s.add(n);
          q.push(n);
        }
      });
    }
  };
  function power() {
    const H = new Set(),
      L = new Set();
    if (ctrl) {
      DEFS[ctrl.type].pins.forEach((p) => {
        const k = net(ctrl.id, p.id);
        if (p.type === 'gnd') L.add(k);
        else if (p.type === 'power' && /5V|3V3|3\.3V/i.test(p.id + p.name)) H.add(k);
      });
      Object.entries(pinv).forEach(([s, v]) => {
        const id = cpid(s);
        if (id) (v ? H : L).add(net(ctrl.id, id));
      });
    }
    spread(H);
    spread(L);
    return { H, L };
  }
  function lit() {
    const { H, L } = power(),
      out = {};
    comps.forEach((c) => {
      if (!['led', 'buzzer', 'lightbulb', 'dc_motor'].includes(c.type)) return;
      const p = DEFS[c.type].pins,
        a = net(c.id, p[0].id),
        b = net(c.id, p[1].id);
      out[c.id] =
        (H.has(a) && L.has(b) && !L.has(a)) ||
        (c.type !== 'led' && c.type !== 'buzzer' && H.has(b) && L.has(a) && !L.has(b));
    });
    return out;
  }
  let it;
  const read = (s) => {
    const id = cpid(s);
    if (!id) return 0;
    const k = net(ctrl.id, id),
      { H, L } = power();
    for (const c of comps) {
      const d = DEFS[c.type];
      if (!d) continue;
      if (c.type === 'dht11' && net(c.id, 'data') === k) return 999;
      if (c.type === 'ds18b20' && net(c.id, 'dq') === k) return 998;
      if (c.type === 'pir_sensor' && net(c.id, 'out') === k) return inp.motion ? 1 : 0;
      if (c.type === 'push_button') {
        const side = ['1a', '1b'].some((x) => net(c.id, 'pin' + x) === k)
          ? ['2a', '2b']
          : ['2a', '2b'].some((x) => net(c.id, 'pin' + x) === k)
            ? ['1a', '1b']
            : null;
        if (side) {
          if (inp.buttonInput || c.properties.pressed) {
            const o = net(c.id, 'pin' + side[0]);
            return H.has(o) ? 1 : L.has(o) ? 0 : 1;
          }
          const m = String(it.pinModes[String(s)]);
          return /PULLUP|PUD_UP|PULL_UP/.test(m) ? 1 : 0;
        }
      }
    }
    return 0;
  };
  it = new VInterp(
    (p, v) => {
      pinv[String(p)] = v === true || v === 1 || v === 'HIGH' || Number(v) > 0 ? 1 : 0;
    },
    read,
    (m) => {
      serial.push(String(m));
      if (serial.length > 200) serial.shift();
    },
    () => {},
  );
  return {
    comps,
    wires,
    onBb,
    inp,
    serial,
    pinv,
    lit,
    power,
    net,
    get it() {
      return it;
    },
    reset(code) {
      Object.keys(pinv).forEach((k) => delete pinv[k]);
      serial.length = 0;
      const r = prep(code);
      it.reset(exp.platform, r.code);
      Object.assign(it.globals, r.defs);
      it.running = false;
      if (exp.platform === 'Arduino') {
        const lim = Math.min(
          ...[it.setupStartPc, it.loopStartPc].filter((x) => x >= 0),
          it.parsedLines.length,
        );
        for (let i = 0; i < lim; i++) {
          const t = it.parsedLines[i].text;
          if (/^(const\s+)?(int|float|double|char|boolean|String)\s+\w+\s*=/.test(t)) {
            try {
              it.executeLine(t);
            } catch (e) {}
          }
        }
      }
    },
    start() {
      if (!it.running) {
        it.running = true;
        it.paused = false;
      }
    },
    stop() {
      it.running = false;
    },
    get running() {
      return it.running;
    },
    tick(now) {
      if (!it.running) return;
      const g = it.globals;
      g.temperature = inp.temperature;
      g.humidity = inp.humidity;
      g.distance = inp.distance;
      g.motionDetected = inp.motion ? 1 : 0;
      g.waterFlowLPM = inp.waterFlowLPM;
      g.buttonInput = inp.buttonInput ? 1 : 0;
      g.flaskToggleInput = inp.flaskToggleInput ? 1 : 0;
      g.bpmInput = inp.bpmInput;
      g.tempProbe = inp.tempProbe;
      let n = 0;
      while (n++ < 300 && it.running && !it.paused && now >= it.delayUntil) it.step();
    },
  };
}
