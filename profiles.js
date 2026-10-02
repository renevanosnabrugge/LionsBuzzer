// Team profiles: name, title, logo and colours. The buzzer works the same for every profile.
//
// Built-in profiles come from profiles.json (published with the site) and are locked: they
// can't be edited or deleted in the app. "+ New profile" makes an editable copy. Profiles made
// in the app are saved on this device. "Download profiles.json" exports all profiles; commit
// that file to the repository root to publish them for everyone (and lock them).
(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  // Used when profiles.json can't be fetched (e.g. opened from file://). Keep in sync with profiles.json.
  const FALLBACK = {
    default: 'yetilions',
    profiles: [
      {
        id: 'yetilions', name: 'YetiLions', title: 'YETI LION', subtitle: 'ALLIANCE',
        logo: 'logos/yetilions.png',
        colors: { background: '#10294b', text: '#ffffff', primary: '#10a1dc', secondary: '#0e7e3f', accent: '#79be60' }
      },
      {
        id: 'dordrecht-lions', name: 'Dordrecht Lions', title: 'DORDRECHT LIONS', subtitle: 'IJSHOCKEY',
        logo: 'logos/dordrecht-lions.png',
        colors: { background: '#103073', text: '#ffffff', primary: '#0053a1', secondary: '#007d32', accent: '#568ec2' }
      },
      {
        id: 'neutral', name: 'Neutral', title: 'ICE HOCKEY', subtitle: 'MATCH CLOCK',
        logo: 'logos/neutral.svg',
        colors: { background: '#0b1c20', text: '#ffffff', primary: '#006d75', secondary: '#00525a', accent: '#ea7200' }
      }
    ]
  };
  const COLOR_KEYS = ['background', 'text', 'primary', 'secondary', 'accent'];
  const KEY_ACTIVE = 'ylProfile';
  const KEY_CACHE = 'ylProfileCache';

  let builtins = FALLBACK.profiles;
  let defaultId = FALLBACK.default;
  // Profiles made on this device. (Older versions also kept edits/deletions of built-ins.)
  let local = { added: [] };
  let activeId = null;
  try { activeId = localStorage.getItem(KEY_ACTIVE); } catch (e) {}

  // ---------- Colour helpers ----------
  const normHex = h => {
    h = String(h || '').trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map(c => c + c).join('');
    return /^[0-9a-f]{6}$/i.test(h) ? '#' + h.toLowerCase() : null;
  };
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const hex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };

  function clean(p) {
    const base = FALLBACK.profiles[0];
    const colors = {};
    COLOR_KEYS.forEach(k => { colors[k] = normHex(p.colors && p.colors[k]) || base.colors[k]; });
    return {
      id: String(p.id || ('p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6))),
      name: String(p.name || 'Team').slice(0, 40),
      title: String(p.title != null ? p.title : p.name || '').slice(0, 30),
      subtitle: String(p.subtitle || '').slice(0, 30),
      logo: typeof p.logo === 'string' ? p.logo : '',
      colors
    };
  }

  // ---------- Applying a profile ----------
  function initials(p) {
    const words = (p.title || p.name || '').trim().split(/\s+/).filter(Boolean);
    return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
  }

  function showLogo(img, fallback, src) {
    if (src) {
      img.onload = () => { img.hidden = false; fallback.style.display = 'none'; };
      img.onerror = () => { img.hidden = true; fallback.style.display = ''; };
      if (img.getAttribute('src') !== src) img.src = src;
      else if (img.complete && img.naturalWidth) img.onload();
    } else {
      img.removeAttribute('src');
      img.hidden = true;
      fallback.style.display = '';
    }
  }

  function apply(p) {
    const c = p.colors;
    const lo = mix(c.background, '#000000', 0.32);
    const vars = {
      '--navy': c.background,
      '--navy-hi': mix(c.background, '#ffffff', 0.08),
      '--navy-lo': lo,
      '--white': c.text,
      '--muted': mix(c.text, c.background, 0.38),
      '--blue': c.primary,
      '--blue-l': mix(c.primary, '#ffffff', 0.25),
      '--blue-d': mix(c.primary, '#000000', 0.25),
      '--green': c.accent,
      '--green-d': c.secondary,
      '--blue-rgb': rgb(c.primary).join(', '),
      '--green-rgb': rgb(c.accent).join(', '),
      '--green-d-rgb': rgb(c.secondary).join(', '),
      '--navy-lo-rgb': rgb(lo).join(', ')
    };
    const st = document.documentElement.style;
    Object.keys(vars).forEach(k => st.setProperty(k, vars[k]));
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = c.background;

    $('wmTitle').textContent = p.title || p.name;
    $('wmSub').textContent = p.subtitle || '';
    document.title = p.name + ' Buzzer';
    document.querySelectorAll('.emblem-initials').forEach(t => { t.textContent = initials(p); });
    showLogo($('logoImg'), $('logoFallback'), p.logo);
    showLogo($('ftLogo'), $('ftFallback'), p.logo);
  }

  // ---------- Profile list ----------
  const isBuiltin = id => builtins.some(b => b.id === id);
  const list = () => builtins.concat(local.added);
  function active() {
    const all = list();
    return all.find(p => p.id === activeId) || all.find(p => p.id === defaultId) || all[0] || clean(FALLBACK.profiles[0]);
  }

  // ---------- Saving (IndexedDB for profiles incl. logos, localStorage for the active id) ----------
  function db() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('ylBuzzerProfiles', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idb(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction('kv', mode);
      const req = fn(tx.objectStore('kv'));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
    });
  }

  let saveTimer = null;
  function save() {
    const p = active();
    try {
      localStorage.setItem(KEY_ACTIVE, p.id);
      localStorage.setItem(KEY_CACHE, JSON.stringify(p));
    } catch (e) {
      // A large uploaded logo may not fit; cache the rest so the colours still load instantly.
      try { localStorage.setItem(KEY_CACHE, JSON.stringify(Object.assign({}, p, { logo: '' }))); } catch (e2) {}
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { idb('readwrite', s => s.put(local, 'local')).catch(() => {}); }, 250);
  }

  // Replace the active profile with an edited copy. Built-in profiles are locked.
  function update(changes) {
    if (isBuiltin(active().id)) { render(); return; }
    const p = clean(Object.assign({}, active(), changes));
    p.colors = Object.assign({}, active().colors, changes.colors || {});
    local.added = local.added.map(a => (a.id === p.id ? p : a));
    apply(p);
    save();
    render();
  }

  function select(id) {
    activeId = id;
    apply(active());
    save();
    render();
  }

  // ---------- Settings UI ----------
  function render() {
    const p = active();
    const chips = $('profileChips');
    chips.textContent = '';
    list().forEach(q => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = q.name;
      b.classList.toggle('on', q.id === p.id);
      b.addEventListener('click', () => select(q.id));
      chips.appendChild(b);
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'add';
    add.textContent = '+ New profile';
    add.addEventListener('click', createProfile);
    chips.appendChild(add);

    const setVal = (id, v) => { const el = $(id); if (document.activeElement !== el) el.value = v; };
    setVal('pfName', p.name);
    setVal('pfTitle', p.title);
    setVal('pfSubtitle', p.subtitle);
    document.querySelectorAll('[data-color]').forEach(inp => { inp.value = p.colors[inp.dataset.color]; });
    const thumb = $('pfLogoThumb');
    if (p.logo) { thumb.src = p.logo; thumb.hidden = false; } else { thumb.removeAttribute('src'); thumb.hidden = true; }
    const locked = isBuiltin(p.id);
    $('pfLogoRemove').hidden = !p.logo || locked;
    $('pfLocked').hidden = !locked;
    $('pfDelete').hidden = locked;
    document.querySelector('.profile-edit').classList.toggle('locked', locked);
    document.querySelectorAll('.profile-edit .text-row input, .profile-edit [data-color], #pfLogoFile')
      .forEach(el => { el.disabled = locked; });
  }

  // Starts as a copy of the selected profile.
  function createProfile() {
    const base = active();
    const p = clean(Object.assign({}, base, { id: null, name: base.name + ' (copy)' }));
    local.added.push(p);
    select(p.id);
    $('pfName').focus();
    $('pfName').select();
  }

  function deleteProfile() {
    const p = active();
    if (isBuiltin(p.id) || !confirm('Delete profile "' + p.name + '"?')) return;
    local.added = local.added.filter(a => a.id !== p.id);
    activeId = null;
    select(active().id);
  }

  // Logos are scaled down and stored as PNG data URLs (keeps transparency).
  function readLogo(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 512, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.naturalWidth * k);
        cv.height = Math.round(img.naturalHeight * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        res(cv.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
      img.src = url;
    });
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // All profiles in one file, logos embedded: for moving profiles to another device.
  function exportProfiles() {
    const data = { version: 1, default: active().id, profiles: list() };
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'profiles.json');
  }

  // A zip to unpack into the repository root: profiles.json with the built-in profiles plus
  // the ones made on this device (which then become built-in), and their logos as files.
  function exportForWebsite() {
    const enc = new TextEncoder();
    const files = [];
    const used = new Set(builtins.map(b => b.id));
    const slug = name => {
      const base = (name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team');
      let id = base, n = 2;
      while (used.has(id)) id = base + '-' + n++;
      used.add(id);
      return id;
    };
    const added = local.added.map(p => {
      const q = Object.assign({}, p, { id: slug(p.name) });
      const m = /^data:image\/(png|jpe?g|webp|svg\+xml);base64,(.*)$/.exec(p.logo || '');
      if (m) {
        const ext = m[1] === 'svg+xml' ? 'svg' : m[1].replace('jpeg', 'jpg');
        const path = 'logos/' + q.id + '.' + ext;
        files.push({ name: path, data: Uint8Array.from(atob(m[2]), c => c.charCodeAt(0)) });
        q.logo = path;
      }
      return q;
    });
    const data = { version: 1, default: defaultId, profiles: builtins.concat(added) };
    files.unshift({ name: 'profiles.json', data: enc.encode(JSON.stringify(data, null, 2) + '\n') });
    files.push({ name: 'README.txt', data: enc.encode(
      'Unzip into the root of the LionsBuzzer repository, replacing profiles.json,\n' +
      'then commit and push. The profiles from this device become built-in profiles\n' +
      'on the website (' + added.map(p => p.name).join(', ') + ').\n') });
    download(zip(files), 'lionsbuzzer-profiles.zip');
  }

  // Minimal zip writer (no compression), enough for a few small files.
  function zip(files) {
    const crcTable = new Uint32Array(256).map((_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c;
    });
    const crc32 = d => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = crcTable[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    files.forEach(f => {
      const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true);
      local.setUint32(14, crc, true); local.setUint32(18, size, true); local.setUint32(22, size, true);
      local.setUint16(26, name.length, true);
      parts.push(local.buffer, name, f.data);
      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true);
      cd.setUint32(16, crc, true); cd.setUint32(20, size, true); cd.setUint32(24, size, true);
      cd.setUint16(28, name.length, true); cd.setUint32(42, offset, true);
      central.push(cd.buffer, name);
      offset += 30 + name.length + size;
    });
    const cdSize = central.reduce((n, p) => n + p.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
  }

  async function importProfiles(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { alert('That is not a valid profiles.json file.'); return; }
    const incoming = (Array.isArray(data) ? data : data && data.profiles) || [];
    if (!incoming.length) { alert('No profiles found in that file.'); return; }
    let first = null;
    incoming.forEach(raw => {
      if (!raw || typeof raw !== 'object') return;
      const p = clean(raw);
      if (isBuiltin(p.id)) return; // built-ins come from the site and stay locked
      if (local.added.some(a => a.id === p.id)) {
        local.added = local.added.map(a => (a.id === p.id ? p : a));
      } else {
        local.added.push(p);
      }
      if (!first) first = p.id;
    });
    if (first) select(data.default && list().some(p => p.id === data.default) ? data.default : first);
    else alert('Only the built-in profiles were in that file; nothing new to load.');
  }

  // ---------- Wiring ----------
  const textFields = { pfName: 'name', pfTitle: 'title', pfSubtitle: 'subtitle' };
  Object.keys(textFields).forEach(id => {
    const el = $(id);
    el.addEventListener('input', () => update({ [textFields[id]]: el.value }));
    // Enter would submit (and close) the settings form.
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  });
  document.querySelectorAll('[data-color]').forEach(inp => {
    inp.addEventListener('input', () => update({ colors: { [inp.dataset.color]: inp.value } }));
  });
  $('pfLogoFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { update({ logo: await readLogo(file) }); } catch (err) { alert('Could not read that image.'); }
  });
  $('pfLogoRemove').addEventListener('click', () => update({ logo: '' }));
  $('pfDelete').addEventListener('click', deleteProfile);
  $('pfExport').addEventListener('click', exportProfiles);
  $('pfExportSite').addEventListener('click', exportForWebsite);
  $('pfImport').addEventListener('change', e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) importProfiles(file);
  });

  // ---------- Start-up ----------
  // Apply the last used profile straight away to avoid a flash of the wrong colours.
  try {
    const cached = JSON.parse(localStorage.getItem(KEY_CACHE) || 'null');
    apply(cached ? clean(cached) : active());
  } catch (e) { apply(active()); }
  render();

  (async () => {
    try {
      const res = await fetch('profiles.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.profiles) && data.profiles.length) {
          builtins = data.profiles.map(clean);
          defaultId = data.default || builtins[0].id;
        }
      }
    } catch (e) { /* offline or file:// — use the built-in copy */ }
    try {
      const stored = await idb('readonly', s => s.get('local'));
      if (stored) {
        local = { added: Array.isArray(stored.added) ? stored.added.map(clean) : [] };
        // Built-ins are locked now: keep any earlier edits to them as editable copies.
        Object.values(stored.edits || {}).forEach(e => {
          if (isBuiltin(e.id)) local.added.push(clean(Object.assign({}, e, { id: null, name: e.name + ' (my changes)' })));
        });
        // A profile exported for the website and published is now built-in: drop the device copy.
        const same = (a, b) => a.name === b.name && JSON.stringify(a.colors) === JSON.stringify(b.colors);
        local.added = local.added.filter(a => !builtins.some(b => same(a, b)));
      }
    } catch (e) {}
    apply(active());
    save();
    render();
  })();
})();
