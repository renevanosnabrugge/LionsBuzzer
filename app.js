(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  // ---------- Settings ----------
  const DEFAULTS = {
    matchMin: 20,
    intervalSec: 60,
    intervalSound: 'buzzer',
    endSound: 'horn',
    length: 2,
    volume: 100,
    direction: 'desc'
  };
  const S = Object.assign({}, DEFAULTS);
  try { Object.assign(S, JSON.parse(localStorage.getItem('ylBuzzer') || '{}')); } catch (e) {}
  // Older versions had a lion roar and a separate custom sound.
  ['intervalSound', 'endSound'].forEach(k => {
    if (S[k] === 'roar') S[k] = 'horn';
    if (!['buzzer', 'horn', 'none'].includes(S[k])) S[k] = DEFAULTS[k];
  });
  const saveSettings = () => { try { localStorage.setItem('ylBuzzer', JSON.stringify(S)); } catch (e) {} };

  const matchMs = () => S.matchMin * 60000;
  const intervalMs = () => S.intervalSec * 1000;

  // ---------- Audio ----------
  let ac = null;
  const custom = {};   // sound name -> { buffer, fileName } uploaded on this device

  // On iPhone/iPad this makes sound play even when the silent switch is on.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

  function audio() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state !== 'running') ac.resume().catch(() => {});
    return ac;
  }

  // iOS only allows audio after a touch; unlock it on the first one.
  const unlock = () => {
    const a = audio();
    const b = a.createBuffer(1, 1, 22050);
    const s = a.createBufferSource();
    s.buffer = b; s.connect(a.destination); s.start(0);
    window.removeEventListener('pointerdown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);

  function distortion(amount) {
    const n = 2048, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
    }
    return curve;
  }

  function compressor(a) {
    const c = a.createDynamicsCompressor();
    c.threshold.value = -18; c.knee.value = 6; c.ratio.value = 12;
    c.attack.value = 0.003; c.release.value = 0.12;
    return c;
  }

  // A handle lets a pad stop its own sound when tapped again.
  function handle(a, out, sources, seconds) {
    return {
      endsAt: performance.now() + seconds * 1000,
      stop() {
        const t = a.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.linearRampToValueAtTime(0, t + 0.08);
        sources.forEach(s => { try { s.stop(t + 0.1); } catch (e) {} });
      }
    };
  }

  // Arena horn: stacked, detuned sawtooth/square tones, overdriven and compressed.
  function playBuzzer(dur, vol) {
    const a = audio();
    const t0 = a.currentTime + 0.01, t1 = t0 + dur;

    const out = a.createGain();
    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(vol, t0 + 0.03);
    out.gain.setValueAtTime(vol, t1);
    out.gain.linearRampToValueAtTime(0, t1 + 0.12);
    out.connect(a.destination);

    const pre = a.createGain(); pre.gain.value = 0.35;
    const shaper = a.createWaveShaper(); shaper.curve = distortion(30); shaper.oversample = '4x';
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4000;
    const presence = a.createBiquadFilter();
    presence.type = 'peaking'; presence.frequency.value = 1200; presence.Q.value = 0.8; presence.gain.value = 6;
    pre.connect(shaper).connect(lp).connect(presence).connect(compressor(a)).connect(out);

    const sources = [
      [110, 'sawtooth', 0], [110, 'square', 7], [165, 'sawtooth', -5],
      [220, 'sawtooth', 4], [220, 'square', -8], [330, 'sawtooth', 3]
    ].map(([f, type, cents]) => {
      const o = a.createOscillator();
      o.type = type; o.frequency.value = f; o.detune.value = cents;
      o.connect(pre); o.start(t0); o.stop(t1 + 0.15);
      return o;
    });
    return handle(a, out, sources, dur + 0.15);
  }

  // Goal horn: a long, deep, brassy chord (like an arena goal horn) that blooms up
  // to pitch, with a slight air-horn waver, overdriven and compressed to be loud.
  const HORN_SECONDS = 4.5;
  function playGoalHorn(vol) {
    const a = audio();
    const t0 = a.currentTime + 0.01, t1 = t0 + HORN_SECONDS;

    const out = a.createGain();
    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(vol, t0 + 0.12);
    out.gain.setValueAtTime(vol, t1);
    out.gain.linearRampToValueAtTime(0, t1 + 0.35);
    out.connect(a.destination);

    const pre = a.createGain(); pre.gain.value = 0.22;
    const shaper = a.createWaveShaper(); shaper.curve = distortion(12); shaper.oversample = '4x';
    const brass = a.createBiquadFilter(); brass.type = 'lowpass'; brass.frequency.value = 2200; brass.Q.value = 2;
    const body = a.createBiquadFilter();
    body.type = 'peaking'; body.frequency.value = 500; body.Q.value = 0.9; body.gain.value = 5;
    const makeup = a.createGain(); makeup.gain.value = 1.6;
    pre.connect(shaper).connect(brass).connect(body).connect(compressor(a)).connect(makeup).connect(out);

    // Air-horn waver.
    const lfo = a.createOscillator(); lfo.frequency.value = 5.5;
    const lfoDepth = a.createGain(); lfoDepth.gain.value = 0.03;
    lfo.connect(lfoDepth).connect(pre.gain);

    // B-flat major chord with a sub-octave.
    const sources = [lfo];
    [[58.3, 'sawtooth', 0.5, 0], [116.5, 'sawtooth', 1, 0], [116.5, 'square', 0.45, 6],
     [146.8, 'sawtooth', 0.8, -4], [174.6, 'sawtooth', 0.7, 3], [233.1, 'sawtooth', 0.35, -6]
    ].forEach(([f, type, g, cents]) => {
      const o = a.createOscillator(); o.type = type; o.detune.value = cents;
      o.frequency.setValueAtTime(f * 0.94, t0);
      o.frequency.exponentialRampToValueAtTime(f, t0 + 0.18);
      o.frequency.setValueAtTime(f, t1);
      o.frequency.exponentialRampToValueAtTime(f * 0.97, t1 + 0.35);
      const gn = a.createGain(); gn.gain.value = g;
      o.connect(gn).connect(pre);
      sources.push(o);
    });

    // A little air noise on top.
    const len = a.sampleRate;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = a.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const nbp = a.createBiquadFilter(); nbp.type = 'bandpass'; nbp.frequency.value = 1400; nbp.Q.value = 0.7;
    const ng = a.createGain(); ng.gain.value = 0.05;
    noise.connect(nbp).connect(ng).connect(pre);
    sources.push(noise);

    sources.forEach(o => { o.start(t0); o.stop(t1 + 0.4); });
    return handle(a, out, sources, HORN_SECONDS + 0.4);
  }

  function playBuffer(buffer, vol) {
    const a = audio();
    const src = a.createBufferSource(); src.buffer = buffer;
    const out = a.createGain(); out.gain.value = vol;
    src.connect(out).connect(a.destination);
    src.start();
    return handle(a, out, [src], buffer.duration);
  }

  // Real recordings shipped with the site replace the synthesized sounds:
  // drop sounds/goal-horn.mp3 or sounds/buzzer.mp3 into the site folder.
  const recorded = {};
  async function loadRecorded(name, url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      recorded[name] = await audio().decodeAudioData(await res.arrayBuffer());
    } catch (e) { /* not present (or opened from file://): keep the synthesized sound */ }
  }

  function play(name) {
    const vol = S.volume / 100;
    // A sound uploaded on this device wins, then a recording shipped with the site, then the synth.
    if (custom[name]) return playBuffer(custom[name].buffer, vol);
    if (recorded[name]) return playBuffer(recorded[name], vol);
    if (name === 'buzzer') return playBuzzer(S.length, vol);
    if (name === 'horn') return playGoalHorn(vol);
    return null;
  }

  // ---------- Custom sounds, kept in this browser (IndexedDB) ----------
  const DB = 'ylBuzzer', STORE = 'files';
  function db() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function dbDo(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
    });
  }

  const SOUNDS = ['buzzer', 'horn'];

  async function loadCustom(name, fileName, data) {
    custom[name] = { buffer: await audio().decodeAudioData(data.slice(0)), fileName };
    renderSounds();
  }

  async function restoreCustom() {
    for (const name of SOUNDS) {
      try {
        const rec = await dbDo('readonly', st => st.get('custom-' + name));
        if (rec) await loadCustom(name, rec.name, rec.data);
      } catch (e) { /* no stored sound */ }
    }
    // Clean up the single custom slot of older versions.
    try { await dbDo('readwrite', st => st.delete('custom')); } catch (e) {}
  }

  // ---------- Match / interval state ----------
  const st = {
    running: false,
    acc: 0,          // ms elapsed before the current run segment
    startedAt: 0,    // performance.now() when the current segment started
    lastIdx: 0,      // interval index at the last tick, to detect boundaries
    ended: false
  };
  const elapsed = () => st.acc + (st.running ? performance.now() - st.startedAt : 0);
  const desc = () => S.direction !== 'asc';

  // Intervals line up with the clock as displayed: counting down they end at
  // whole multiples of the interval of time remaining (14:00, 13:00, ...),
  // counting up at multiples of time played (1:00, 2:00, ...).
  // Returns the current interval's index and its [lo, hi) range in elapsed ms.
  function slot(e) {
    const M = matchMs(), I = intervalMs();
    if (desc()) {
      const k = Math.ceil((M - e) / I);
      const idx = Math.max(0, Math.ceil(M / I) - k);
      return { idx, lo: M - Math.min(k * I, M), hi: Math.min(M, M - (k - 1) * I) };
    }
    const idx = Math.floor(e / I);
    return { idx, lo: idx * I, hi: Math.min(M, (idx + 1) * I) };
  }

  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) {}
  }

  function start() {
    if (st.ended) return;
    audio();
    st.running = true;
    st.startedAt = performance.now();
    keepAwake(true);
    render();
  }

  function pause() {
    st.acc = elapsed();
    st.running = false;
    keepAwake(false);
    render();
  }

  function reset(ask) {
    if (ask && elapsed() > 0 && !st.ended && !confirm('Reset the match clock?')) return;
    Object.assign(st, { running: false, acc: 0, startedAt: 0, lastIdx: 0, ended: false });
    $('fulltime').hidden = true;
    keepAwake(false);
    render();
  }

  function intervalSignal() {
    play(S.intervalSound);
    flash();
  }

  // Jump the clock to the end of the current interval (e.g. 14:32 -> 14:00),
  // to bring it back in line with the rink clock. Silent: it is a correction.
  function nextInterval() {
    if (st.ended) return;
    const target = slot(elapsed()).hi;
    if (target >= matchMs()) { endMatch(); return; }
    st.acc = target;
    st.startedAt = performance.now();
    st.lastIdx = slot(target).idx;
    const c = $('matchClock');
    c.classList.remove('jump'); void c.offsetWidth; c.classList.add('jump');
    render();
  }

  function endMatch() {
    st.running = false;
    st.acc = matchMs();
    st.ended = true;
    keepAwake(false);
    play(S.endSound);
    flash();
    const n = Math.ceil(matchMs() / intervalMs());
    $('ftSub').textContent = S.matchMin + ' min · ' + n + (n === 1 ? ' interval' : ' intervals');
    setTimeout(() => { if (st.ended) $('fulltime').hidden = false; }, 600);
    render();
  }

  function flash() {
    const f = $('flash');
    f.classList.remove('on');
    void f.offsetWidth;
    f.classList.add('on');
  }

  // Deadline based, so it never drifts and catches up if the browser throttles timers.
  function tick() {
    if (st.running) {
      const e = elapsed();
      if (e >= matchMs()) {
        endMatch();
        return;
      }
      const idx = slot(e).idx;
      if (idx > st.lastIdx) intervalSignal();
      st.lastIdx = idx;
    }
    render();
  }

  // ---------- Rendering ----------
  const clock = (ms, round) => {
    const s = Math.max(0, round(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const mmss = ms => clock(ms, Math.ceil);
  const matchFmt = (left, played) => {
    if (!desc()) return clock(played, Math.floor);
    if (left > 0 && left < 60000) return (Math.ceil(left / 100) / 10).toFixed(1);
    return mmss(left);
  };

  const ring = $('ringFill');
  const C = 2 * Math.PI * 96;
  ring.style.strokeDasharray = C;

  let lastText = {};
  function setText(id, text) {
    if (lastText[id] !== text) { $(id).textContent = text; lastText[id] = text; }
  }

  function render() {
    const e = Math.min(elapsed(), matchMs());
    const cur = slot(Math.min(e, matchMs() - 1));
    const len = Math.max(1, cur.hi - cur.lo);
    const iLeft = Math.max(0, cur.hi - e);
    const iDone = Math.max(0, e - cur.lo);

    setText('matchClock', matchFmt(matchMs() - e, e));
    setText('intClock', desc() ? mmss(iLeft) : clock(iDone, Math.floor));
    setText('intNo', String(cur.idx + 1));
    setText('intLen', 'every ' + mmss(intervalMs()));
    setText('matchLen', S.matchMin + ' min ' + (desc() ? '▼' : '▲'));
    setText('matchState', st.ended ? 'Full time' : st.running ? 'Running' : e > 0 ? 'Paused' : 'Ready');
    $('matchProgress').style.width = (e / matchMs() * 100).toFixed(2) + '%';
    const frac = desc() ? iLeft / len : iDone / len;
    ring.style.strokeDashoffset = (C * (1 - frac)).toFixed(1);
    $('ringWrap').classList.toggle('warn', st.running && iLeft <= 5000 && iLeft > 0);
    document.body.classList.toggle('paused', !st.running && e > 0 && !st.ended);

    const sb = $('startBtn');
    const label = st.running ? 'PAUSE' : e > 0 && !st.ended ? 'RESUME' : 'START';
    if (sb.dataset.label !== label) {
      sb.dataset.label = label;
      sb.querySelector('span').textContent = label;
      sb.querySelector('use').setAttribute('href', st.running ? '#i-pause' : '#i-play');
      sb.classList.toggle('running', st.running);
    }
    sb.disabled = st.ended;
    $('nextBtn').disabled = st.ended;
  }

  function loop() {
    tick();
    requestAnimationFrame(loop);
  }
  // rAF for smooth display, plus a timer so sounds still fire when rAF is paused.
  requestAnimationFrame(loop);
  setInterval(tick, 250);

  // ---------- Controls ----------
  $('startBtn').addEventListener('click', () => (st.running ? pause() : start()));
  $('nextBtn').addEventListener('click', nextInterval);
  $('resetBtn').addEventListener('click', () => reset(true));
  $('ftReset').addEventListener('click', () => reset(false));
  $('ftClose').addEventListener('click', () => { $('fulltime').hidden = true; });

  // Sound pads: tap to play, tap again to stop.
  document.querySelectorAll('.pad').forEach(pad => {
    let h = null, timer = null;
    pad.addEventListener('click', () => {
      if (h && performance.now() < h.endsAt) {
        h.stop(); h = null;
        pad.classList.remove('playing'); clearTimeout(timer);
        return;
      }
      h = play(pad.dataset.sound);
      if (!h) return;
      pad.classList.add('playing');
      clearTimeout(timer);
      timer = setTimeout(() => pad.classList.remove('playing'), h.endsAt - performance.now());
      if (pad.dataset.sound === 'horn') goal(h, () => { h = null; pad.classList.remove('playing'); clearTimeout(timer); });
    });
  });

  // GOAL! light show while the goal horn plays. Tap it to stop.
  let goalTimer = null;
  function goal(h, onStop) {
    const g = $('goal');
    $('goalTeam').textContent = $('wmTitle').textContent;
    g.hidden = false;
    g.classList.remove('on'); void g.offsetWidth; g.classList.add('on');
    clearTimeout(goalTimer);
    const hide = () => { g.hidden = true; g.onclick = null; };
    goalTimer = setTimeout(hide, Math.max(1500, h.endsAt - performance.now()));
    g.onclick = () => { clearTimeout(goalTimer); h.stop(); onStop(); hide(); };
  }

  document.addEventListener('keydown', e => {
    if ($('settings').open || e.repeat) return;
    const k = e.key.toLowerCase();
    if (e.code === 'Space') { e.preventDefault(); st.running ? pause() : start(); }
    else if (k === 'n') nextInterval();
    else if (k === 'b') document.querySelector('.pad-buzzer').click();
    else if (k === 'g') document.querySelector('.pad-horn').click();
  });

  // Stop Space from also "clicking" whichever button has focus.
  document.addEventListener('keyup', e => {
    if (e.code === 'Space' && !$('settings').open) e.preventDefault();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && st.running) keepAwake(true);
  });

  // ---------- Settings sheet ----------
  const sheet = $('settings');
  // Tabs: Match (used most), Sounds, Team. Settings always opens on Match.
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('on', t.dataset.tab === name);
      t.setAttribute('aria-selected', t.dataset.tab === name);
    });
    document.querySelectorAll('.tab-panel').forEach(p => { p.hidden = p.dataset.panel !== name; });
    sheet.querySelector('.sheet-inner').scrollTop = 0;
  }
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  $('settingsBtn').addEventListener('click', () => { renderSettings(); showTab('match'); sheet.showModal(); sheet.scrollTop = 0; });
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });

  const fmtSetting = {
    matchMin: v => v + ' min',
    intervalSec: v => mmss(v * 1000)
  };

  function setSetting(key, v) {
    S[key] = v;
    saveSettings();
    if (!st.ended) st.lastIdx = slot(Math.min(elapsed(), matchMs() - 1)).idx;
    renderSettings();
    render();
  }

  function renderSettings() {
    $('matchMinOut').textContent = fmtSetting.matchMin(S.matchMin);
    $('intervalSecOut').textContent = fmtSetting.intervalSec(S.intervalSec);
    document.querySelectorAll('.chips[data-key], .seg[data-key]').forEach(group => {
      const val = String(S[group.dataset.key]);
      group.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === val));
    });
    $('length').value = S.length;
    $('volume').value = S.volume;
    $('lengthOut').textContent = Number(S.length).toFixed(1) + ' s';
    $('volumeOut').textContent = S.volume + '%';
  }

  // Steppers: tap for one step, hold to repeat.
  document.querySelectorAll('.stepper').forEach(sp => {
    const key = sp.dataset.key, step = +sp.dataset.step, min = +sp.dataset.min, max = +sp.dataset.max;
    sp.querySelectorAll('button').forEach(btn => {
      const dir = +btn.dataset.dir;
      let hold = null, rep = null;
      const bump = () => {
        const cur = S[key];
        const snapped = dir > 0 ? Math.floor(cur / step) * step + step : Math.ceil(cur / step) * step - step;
        setSetting(key, Math.min(max, Math.max(min, snapped)));
      };
      const stop = () => { clearTimeout(hold); clearInterval(rep); };
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        bump();
        hold = setTimeout(() => { rep = setInterval(bump, 90); }, 450);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => btn.addEventListener(t, stop));
      // Keyboard activation (no pointer involved).
      btn.addEventListener('click', e => { e.preventDefault(); if (e.detail === 0) bump(); });
    });
  });

  document.querySelectorAll('.chips[data-key], .seg[data-key]').forEach(group => {
    const key = group.dataset.key;
    group.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      const v = typeof DEFAULTS[key] === 'number' ? Number(b.dataset.v) : b.dataset.v;
      setSetting(key, v);
    });
  });

  document.querySelectorAll('.test-btn').forEach(b =>
    b.addEventListener('click', () => play(S[b.dataset.test])));

  $('length').addEventListener('input', e => setSetting('length', Number(e.target.value)));
  $('volume').addEventListener('input', e => setSetting('volume', Number(e.target.value)));

  // Settings: replace the buzzer or goal horn with an uploaded sound.
  function renderSounds() {
    document.querySelectorAll('.sound-row').forEach(row => {
      const name = row.dataset.sound;
      const c = custom[name];
      row.querySelector('.custom-name').textContent =
        c ? c.fileName : recorded[name] ? 'Recording (site)' : 'Built-in';
      row.querySelector('.use-builtin').classList.toggle('off', !c);
    });
  }

  document.querySelectorAll('.sound-row').forEach(row => {
    const name = row.dataset.sound;
    row.querySelector('.play-sound').addEventListener('click', () => play(name));
    row.querySelector('input[type=file]').addEventListener('change', async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const data = await file.arrayBuffer();
        await loadCustom(name, file.name, data);
        try { await dbDo('readwrite', st => st.put({ name: file.name, data }, 'custom-' + name)); } catch (err) {}
      } catch (err) {
        row.querySelector('.custom-name').textContent = 'Could not read that file';
      }
    });
    row.querySelector('.use-builtin').addEventListener('click', async () => {
      delete custom[name];
      try { await dbDo('readwrite', st => st.delete('custom-' + name)); } catch (e) {}
      renderSounds();
    });
  });

  // Offline support when served over http(s), e.g. GitHub Pages.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  renderSettings();
  renderSounds();
  restoreCustom();
  Promise.all([
    loadRecorded('horn', 'sounds/goal-horn.mp3'),
    loadRecorded('buzzer', 'sounds/buzzer.mp3')
  ]).then(renderSounds);
  render();
})();
