// Team profiles: name, title, logo and colours. The buzzer works the same for every profile.
//
// Built-in profiles come from profiles.json (published with the site) and are locked: they
// can't be edited or deleted in the app. "+ New profile" makes an editable copy. Profiles made
// in the app are saved on this device. "Download profiles.json" exports all profiles; commit
// that file to the repository root to publish them for everyone (and lock them).
(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  // Used only when profiles.json can't be fetched (e.g. opened from file://); profiles.json is the real list.
  const FALLBACK = {
    default: 'dordrecht-lions',
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
  // Relative luminance (0 = black, 1 = white) and a simple colour distance, to keep text readable.
  const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const dist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

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
      colors,
      // Team sponsors (optional): [{ name, logo, url, text }]
      sponsors: Array.isArray(p.sponsors) ? p.sponsors.filter(x => x && x.name).map(x => ({
        name: String(x.name).slice(0, 60), logo: String(x.logo || ''), url: String(x.url || ''), text: String(x.text || '').slice(0, 400)
      })) : []
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
    // White text sits on the pads: tone down a very light accent, and lift a buzzer colour that
    // disappears into the background (or is nearly black).
    const mid = lum(c.secondary) > 0.3 ? mix(c.secondary, '#000000', 0.35) : c.secondary;
    // A bright, saturated accent (yellow) is darkened towards gold so it stays a clear colour;
    // a pale one (near white) is blended with the secondary colour instead.
    const chroma = h => { const v = rgb(h), mx = Math.max(...v), mn = Math.min(...v); return mx ? (mx - mn) / mx : 0; };
    vars['--horn-top'] = lum(c.accent) > 0.55
      ? (chroma(c.accent) > 0.5 ? mix(c.accent, '#000000', 0.32) : mix(c.accent, mid, 0.55))
      : c.accent;
    vars['--horn-bottom'] = mid;
    const buzz = dist(c.primary, c.background) < 70 || lum(c.primary) < 0.01 ? mix(c.primary, '#ffffff', 0.3) : c.primary;
    vars['--buzz-top'] = mix(buzz, '#ffffff', 0.25);
    vars['--buzz-bottom'] = mix(buzz, '#000000', 0.25);
    // Same for the brand gradient behind START, the tabs and the selected chips.
    const end = vars['--horn-top'];
    vars['--grad'] = `linear-gradient(90deg, ${c.primary} 0%, ${mid} 62%, ${end} 100%)`;
    vars['--grad-diag'] = `linear-gradient(135deg, ${c.primary} 0%, ${mid} 62%, ${end} 100%)`;
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
    // Let the sponsor strip know which team is shown (team sponsors only count for built-in teams).
    window.__lbTeam = { name: p.name, builtin: isBuiltin(p.id), sponsors: isBuiltin(p.id) ? (p.sponsors || []) : [] };
    window.dispatchEvent(new CustomEvent('lb:profile', { detail: window.__lbTeam }));
    clearTimeout(iconTimer);
    iconTimer = setTimeout(() => setAppIcon(p), 300);
  }

  // Home-screen icon, tab icon and app name follow the selected team. Built-in teams have
  // pre-rendered icons (tools/build-assets.cjs); for your own profiles the icon is drawn here.
  let iconTimer = null, manifestUrl = null;
  const setHref = (sel, href) => { const el = document.querySelector(sel); if (el) el.href = href; };
  async function setAppIcon(p) {
    let i180, i192, i512;
    if (isBuiltin(p.id)) {
      const base = 'icons/teams/' + p.id + '-';
      [i180, i192, i512] = [base + '180.png', base + '192.png', base + '512.png'];
    } else {
      [i180, i192, i512] = await Promise.all([180, 192, 512].map(n => drawIcon(p, n)));
    }
    setHref('link[rel=apple-touch-icon]', i180);
    setHref('link[rel=icon]', i192);
    const title = document.querySelector('meta[name=apple-mobile-web-app-title]');
    if (title) title.content = p.name;
    const abs = u => new URL(u, location.href).href;
    const manifest = {
      name: p.name + ' Buzzer', short_name: p.name, description: 'Interval buzzer and match clock for ice hockey.',
      start_url: abs('./'), scope: abs('./'), display: 'fullscreen', orientation: 'any',
      background_color: p.colors.background, theme_color: p.colors.background,
      icons: [{ src: abs(i192), sizes: '192x192', type: 'image/png' }, { src: abs(i512), sizes: '512x512', type: 'image/png' }]
    };
    if (manifestUrl) URL.revokeObjectURL(manifestUrl);
    manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
    setHref('link[rel=manifest]', manifestUrl);
  }

  function drawIcon(p, size) {
    return new Promise(res => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = p.colors.background;
      ctx.fillRect(0, 0, size, size);
      if (!p.logo) { res(cv.toDataURL('image/png')); return; }
      const img = new Image();
      img.onload = () => {
        const k = Math.min(size * 0.8 / img.naturalWidth, size * 0.8 / img.naturalHeight);
        const w = img.naturalWidth * k, h = img.naturalHeight * k;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        res(cv.toDataURL('image/png'));
      };
      img.onerror = () => res(cv.toDataURL('image/png'));
      img.src = p.logo;
    });
  }

  // Share link for a built-in team: its page has a link preview with the team logo
  // and opens the app with that team selected.
  async function shareTeam() {
    const p = active();
    const url = new URL('team/' + p.id + '/', location.href).href;
    try {
      if (navigator.share) { await navigator.share({ title: p.name + ' Buzzer', url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); alert('Link copied:\n' + url); }
    catch (e) { prompt('Copy this link:', url); }
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

  // `how` is set when the person chose the team (picker or settings), for the usage statistics.
  function select(id, how) {
    const before = active().id;
    activeId = id;
    apply(active());
    save();
    render();
    if (how && id !== before) lbTrack('team-selected', { team: isBuiltin(id) ? active().name : 'custom', via: how });
  }

  // ---------- Settings UI ----------
  function render() {
    const p = active();
    // Built-in teams in a dropdown; profiles made on this device as buttons after it.
    const chips = $('profileChips');
    const sel = $('profileSelect');
    sel.textContent = '';
    if (!isBuiltin(p.id)) sel.add(new Option('Teams…', '', true, true));
    builtins.forEach(b => sel.add(new Option(b.name, b.id, false, b.id === p.id)));
    sel.parentElement.classList.toggle('on', isBuiltin(p.id));
    chips.querySelectorAll('button').forEach(b => b.remove());
    local.added.forEach(q => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = q.name;
      b.classList.toggle('on', q.id === p.id);
      b.addEventListener('click', () => select(q.id, 'settings'));
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
    $('pfShare').hidden = !locked;
    document.querySelector('.profile-edit').classList.toggle('locked', locked);
    document.querySelectorAll('.profile-edit .text-row input, .profile-edit [data-color], #pfLogoFile')
      .forEach(el => { el.disabled = locked; });
  }

  // Starts as a copy of the selected profile.
  function createProfile() {
    const base = active();
    const p = clean(Object.assign({}, base, { id: null, name: base.name + ' (copy)', sponsors: [] }));
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
      'Unzip into the root of the ijshockeyklok repository, replacing profiles.json,\n' +
      'then commit and push. The profiles from this device become built-in profiles\n' +
      'on the website (' + added.map(p => p.name).join(', ') + ').\n') });
    download(zip(files), 'ijshockeyklok-profiles.zip');
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
  $('profileSelect').addEventListener('change', e => { if (e.target.value) select(e.target.value, 'settings'); });
  $('pfShare').addEventListener('click', shareTeam);
  $('pfExport').addEventListener('click', exportProfiles);
  $('pfExportSite').addEventListener('click', exportForWebsite);
  $('pfImport').addEventListener('change', e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) importProfiles(file);
  });

  // ---------- Team picker: tap the team name in the header ----------
  function renderPicker() {
    const box = $('teamList');
    box.textContent = '';
    const cur = active().id;
    list().forEach(q => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'team-item' + (q.id === cur ? ' on' : '');
      const logo = document.createElement('span');
      logo.className = 'team-logo';
      logo.style.background = q.colors.background;
      if (q.logo) { const i = new Image(); i.src = q.logo; i.alt = ''; logo.appendChild(i); }
      else logo.textContent = initials(q);
      const name = document.createElement('span');
      name.className = 'team-name';
      name.textContent = q.name;
      b.append(logo, name);
      b.addEventListener('click', () => { select(q.id, 'picker'); $('teamPicker').close(); });
      box.appendChild(b);
    });
  }
  $('teamSwitch').addEventListener('click', () => {
    if (document.body.classList.contains('running')) return; // no switching during play
    hideHint();
    renderPicker();
    $('teamPicker').showModal();
    const on = $('teamList').querySelector('.on');
    if (on) on.scrollIntoView({ block: 'center' });
  });
  $('teamPickerClose').addEventListener('click', () => $('teamPicker').close());

  // "Don't see your team?": make your own (Settings → Team) or ask us to add it.
  $('teamMake').addEventListener('click', () => {
    $('teamPicker').close();
    $('settingsBtn').click();
    const tab = document.querySelector('.tab[data-tab=team]');
    if (tab) tab.click();
  });
  fetch('config.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(cfg => {
    const ask = $('teamAsk');
    if (!cfg.contactEmail) { ask.hidden = true; return; }
    ask.href = 'mailto:' + cfg.contactEmail +
      '?subject=' + encodeURIComponent('Please add our team to the buzzer') +
      '&body=' + encodeURIComponent([
        'Hi! Please add our team to the buzzer.', '',
        'Team name:', 'City:', 'Club colours:', 'Website:', '',
        'Attached: our logo (a PNG with a transparent background works best),',
        'or the team we made in the app (Settings → Team → Export for website (.zip)).'
      ].join('\n'));
  });
  $('teamPicker').addEventListener('click', e => { if (e.target === $('teamPicker')) $('teamPicker').close(); });

  // One-time hint bubble under the team name. Shown once, on the first visit.
  const HINT_KEY = 'ylTeamHintSeen';
  let hintTimer = null;
  function hideHint() {
    clearTimeout(hintTimer);
    $('teamHint').hidden = true;
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
  }
  let hintSeen = false;
  try { hintSeen = localStorage.getItem(HINT_KEY) === '1'; } catch (e) {}
  if (!hintSeen) {
    setTimeout(() => {
      if (document.body.classList.contains('running')) return;
      $('teamHint').hidden = false;
      hintTimer = setTimeout(hideHint, 15000);
    }, 1200);
  }
  $('teamHint').addEventListener('click', () => $('teamSwitch').click());

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
