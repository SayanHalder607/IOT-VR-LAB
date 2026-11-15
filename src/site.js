let user = null,
  cur = { id: null },
  heroOn = 0,
  leave = 0;
const mem = {},
  stg = {
    g(k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return mem[k] ?? null;
      }
    },
    s(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {
        mem[k] = v;
      }
    },
  };
const rd = (k, f) => {
    try {
      const v = JSON.parse(stg.g(k));
      return v == null ? f : v;
    } catch (e) {
      return f;
    }
  },
  clone = (o) => JSON.parse(JSON.stringify(o));
const users = () => rd('vl_users', {}),
  plist = () => rd('vl_proj_' + user.email, []),
  psave = (l) => stg.s('vl_proj_' + user.email, JSON.stringify(l));
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
async function hp(pw, salt) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, [
    'deriveBits',
  ]);
  return hex(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 150000, hash: 'SHA-256' },
      k,
      256,
    ),
  );
}
function show(v) {
  view = v;
  ['auth', 'dash', 'bench', 'room'].forEach((n) => ($(n).hidden = n !== v));
  if (v !== 'bench') stop();
  else {
    heroOn = 0;
    resize();
  }
}
function hero() {
  if (heroOn) return;
  heroOn = 1;
  openExp(clone(EXPS[2]));
  sim.reset(exp.defaultCode);
  sim.start();
  el_ = 0.85;
  dist *= 1.4;
  placeCam();
}
let up = false;
function tab(u) {
  up = u;
  $('t-in').setAttribute('aria-selected', String(!u));
  $('t-up').setAttribute('aria-selected', String(u));
  $('nl').hidden = !u;
  $('asub').textContent = u ? 'Create account' : 'Sign in';
  $('ap').autocomplete = u ? 'new-password' : 'current-password';
  $('aerr').hidden = true;
}
$('t-in').onclick = () => tab(false);
$('t-up').onclick = () => tab(true);
const err = (m) => {
  const e = $('aerr');
  e.textContent = m;
  e.hidden = false;
};
function enterApp(u) {
  user = u;
  stg.s('vl_session', u.email);
  $('af').reset();
  $('aerr').hidden = true;
  renderDash();
  show('dash');
  hero();
}
$('af').onsubmit = async (e) => {
  e.preventDefault();
  const em = $('ae').value.trim().toLowerCase(),
    pw = $('ap').value,
    nm = $('an').value.trim();
  $('aerr').hidden = true;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return err('Enter a valid email address.');
  if (pw.length < 8) return err('Use a password of at least 8 characters.');
  if (!(window.crypto && crypto.subtle))
    return err('This browser can’t protect passwords here. Try the guest option.');
  const U = users();
  $('asub').disabled = true;
  try {
    if (up) {
      if (!nm) return err('Enter your name.');
      if (U[em]) return err('An account with this email already exists. Sign in instead.');
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      U[em] = { name: nm, salt, hash: await hp(pw, salt), created: Date.now() };
      stg.s('vl_users', JSON.stringify(U));
      enterApp({ email: em, name: nm });
    } else {
      const r = U[em];
      if (!r || (await hp(pw, r.salt)) !== r.hash) return err('Email or password is incorrect.');
      enterApp({ email: em, name: r.name });
    }
  } finally {
    $('asub').disabled = false;
  }
};
$('guest').onclick = () => enterApp({ email: 'guest', name: 'Guest', guest: true });
$('so').onclick = () => {
  stg.s('vl_session', '');
  user = null;
  show('auth');
  heroOn = 0;
  hero();
  tab(false);
};
function card(cls, title, meta, btns) {
  const c = el('article', { className: 'pc ' + cls }),
    h = el('h3');
  h.textContent = title;
  const m = el('p', { className: 'meta' });
  m.textContent = meta;
  const r = el('div', { className: 'btns' });
  btns.forEach((b) => r.appendChild(b));
  c.append(h, m, r);
  return c;
}
const btn = (t, f, c = '') => {
  const b = el('button', { className: c });
  b.textContent = t;
  b.onclick = f;
  return b;
};
function renderDash() {
  const n = user.name;
  $('wl').textContent = user.guest ? 'Welcome to the lab' : 'Welcome back, ' + n.split(' ')[0];
  $('un').textContent = n;
  $('av').textContent = n[0].toUpperCase();
  $('gn').hidden = !user.guest;
  const g = $('pg');
  g.textContent = '';
  const l = plist().sort((a, b) => b.updated - a.updated);
  if (!l.length)
    g.appendChild(
      el(
        'p',
        { className: 'empty' },
        'No saved projects yet. Start a new one above, or save any guided experiment from the bench.',
      ),
    );
  l.forEach((p) => {
    let ask = 0;
    const d = btn('Delete', () => {
      if (!ask) {
        ask = 1;
        d.textContent = 'Confirm delete';
        return;
      }
      psave(plist().filter((x) => x.id !== p.id));
      renderDash();
    });
    g.appendChild(
      card(
        '',
        p.name,
        p.platform +
          ' · ' +
          p.components.length +
          ' parts · ' +
          p.wires.length +
          ' wires · ' +
          new Date(p.updated).toLocaleDateString(),
        [btn('Open', () => openProject(p), 'primary'), d],
      ),
    );
  });
}
const eg = $('eg');
EXPS.forEach((e, i) => {
  const c = card(
    e.platform === 'Arduino' ? 'ard' : 'rpi',
    e.title,
    e.platform + ' · ' + e.defaultComponents.length + ' parts',
    [
      btn('Walk to table', () => {
        enterRoom();
        rgo(i);
      }),
    ],
  );
  c.insertBefore(el('span', { className: 'num' }, String(e.id).padStart(2, '0')), c.firstChild);
  eg.appendChild(c);
});
function openProject(p) {
  const idx = p.platform === 'Arduino' ? 12 : 13;
  enterRoom();
  rputProject(idx, {
    id: 0,
    title: p.name,
    platform: p.platform,
    tips: [],
    defaultCode: p.code,
    defaultComponents: clone(p.components),
    defaultWires: clone(p.wires),
  });
  rgo(idx);
  cur = { id: p.id };
  reditTable(idx);
  $('pname').value = p.name;
  setDirty(0);
}
document.querySelectorAll('[data-new]').forEach(
  (b) =>
    (b.onclick = () => {
      const idx = b.dataset.new === 'Arduino' ? 12 : 13,
        t = clone(EXPS[idx]);
      t.title = 'Untitled ' + b.dataset.new + ' project';
      enterRoom();
      rputProject(idx, t);
      rgo(idx);
      cur = { id: null };
      reditTable(idx);
      $('pname').value = t.title;
      setDirty(1);
    }),
);
$('save').onclick = () => {
  const l = plist(),
    rec = {
      id: cur.id || 'p' + Date.now().toString(36),
      name: ($('pname').value.trim() || 'Untitled project').slice(0, 60),
      platform: exp.platform,
      components: clone(exp.defaultComponents),
      wires: clone(exp.defaultWires),
      code: $('cd').value,
      updated: Date.now(),
    },
    i = l.findIndex((p) => p.id === rec.id);
  i >= 0 ? (l[i] = rec) : l.push(rec);
  psave(l);
  cur.id = rec.id;
  setDirty(0);
  toast(user.guest ? 'Saved. Guest projects stay in this browser only.' : 'Saved to My projects.');
};
$('pname').addEventListener('input', () => setDirty(1));
$('back').onclick = () => rleave();
addEventListener('pointerdown', () => {
  if (leave && !dirty) leave = 0;
});
$('goroom').onclick = enterRoom;
(function init() {
  const s = stg.g('vl_session');
  let u = null;
  if (s === 'guest') u = { email: 'guest', name: 'Guest', guest: true };
  else if (s && users()[s]) u = { email: s, name: users()[s].name };
  if (u) {
    user = u;
    renderDash();
    show('dash');
  } else show('auth');
  hero();
  if (location.hash === '#classroom') {
    if (!user) user = { email: 'guest', name: 'Guest', guest: true };
    renderDash();
    enterRoom();
  }
})();
