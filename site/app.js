(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  // ---------- Settings ----------
  const DEFAULTS = {
    matchMin: 20,
    intervalSec: 60,
    intervalSound: 'buzzer',
    endSound: 'roar',
    length: 2,
    volume: 100
  };
  const S = Object.assign({}, DEFAULTS);
  try { Object.assign(S, JSON.parse(localStorage.getItem('ylBuzzer') || '{}')); } catch (e) {}
  const saveSettings = () => { try { localStorage.setItem('ylBuzzer', JSON.stringify(S)); } catch (e) {} };

  const matchMs = () => S.matchMin * 60000;
  const intervalMs = () => S.intervalSec * 1000;

  // ---------- Audio ----------
  let ac = null;
  let customBuffer = null;
  let customName = '';

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

  // Lion roar: a low, growling voice that swells up and falls away,
  // with breath noise, through "mouth" formant filters that open and close.
  function playRoar(dur, vol) {
    const a = audio();
    const T = Math.max(1.4, dur * 1.25);
    const t0 = a.currentTime + 0.02, tEnd = t0 + T;

    const out = a.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(vol * 0.6, t0 + 0.12);
    out.gain.linearRampToValueAtTime(vol, t0 + 0.3 * T);
    out.gain.setValueAtTime(vol, t0 + 0.55 * T);
    out.gain.exponentialRampToValueAtTime(0.0005, tEnd);
    out.connect(a.destination);

    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
    const makeup = a.createGain(); makeup.gain.value = 2.2;
    lp.connect(compressor(a)).connect(makeup).connect(out);

    const shaper = a.createWaveShaper(); shaper.curve = distortion(8); shaper.oversample = '4x';

    // Formant bank (the throat/mouth). The first formant moves as the mouth opens.
    [[280, 3, 1.0, true], [900, 5, 0.7], [2300, 6, 0.3]].forEach(([f, q, g, moves]) => {
      const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
      if (moves) {
        bp.frequency.setValueAtTime(240, t0);
        bp.frequency.linearRampToValueAtTime(620, t0 + 0.3 * T);
        bp.frequency.linearRampToValueAtTime(420, t0 + 0.7 * T);
        bp.frequency.linearRampToValueAtTime(230, tEnd);
      } else {
        bp.frequency.value = f;
      }
      const gn = a.createGain(); gn.gain.value = g;
      shaper.connect(bp).connect(gn).connect(lp);
    });
    const body = a.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 700;
    const bodyGain = a.createGain(); bodyGain.gain.value = 0.5;
    shaper.connect(body).connect(bodyGain).connect(lp);

    // Growl: amplitude flutter of the voice.
    const voice = a.createGain(); voice.gain.value = 0.6;
    voice.connect(shaper);
    const growl = a.createOscillator(); growl.type = 'sine';
    growl.frequency.setValueAtTime(22, t0);
    growl.frequency.linearRampToValueAtTime(34, t0 + 0.35 * T);
    growl.frequency.linearRampToValueAtTime(18, tEnd);
    const growlDepth = a.createGain(); growlDepth.gain.value = 0.45;
    growl.connect(growlDepth).connect(voice.gain);

    // Pitch wobble for an organic sound.
    const wobble = a.createOscillator(); wobble.frequency.value = 6.5;
    const wobbleDepth = a.createGain(); wobbleDepth.gain.value = 30; // cents

    const sources = [growl, wobble];
    wobble.connect(wobbleDepth);
    [['sawtooth', 1, 0.6], ['sawtooth', 0.5, 0.45], ['triangle', 2, 0.25]].forEach(([type, mult, g]) => {
      const o = a.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(75 * mult, t0);
      o.frequency.linearRampToValueAtTime(165 * mult, t0 + 0.25 * T);
      o.frequency.linearRampToValueAtTime(135 * mult, t0 + 0.65 * T);
      o.frequency.linearRampToValueAtTime(60 * mult, tEnd);
      wobbleDepth.connect(o.detune);
      const gn = a.createGain(); gn.gain.value = g;
      o.connect(gn).connect(voice);
      sources.push(o);
    });

    // Breath noise.
    const len = Math.floor(a.sampleRate * 1.0);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = a.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const nbp = a.createBiquadFilter(); nbp.type = 'bandpass'; nbp.frequency.value = 700; nbp.Q.value = 0.8;
    const ng = a.createGain();
    ng.gain.setValueAtTime(0, t0);
    ng.gain.linearRampToValueAtTime(0.35, t0 + 0.2 * T);
    ng.gain.linearRampToValueAtTime(0.22, t0 + 0.7 * T);
    ng.gain.linearRampToValueAtTime(0, tEnd);
    noise.connect(nbp).connect(ng).connect(shaper);
    sources.push(noise);

    sources.forEach(s => { s.start(t0); s.stop(tEnd + 0.1); });
    return handle(a, out, sources, T + 0.1);
  }

  function playCustom(vol) {
    if (!customBuffer) return null;
    const a = audio();
    const src = a.createBufferSource(); src.buffer = customBuffer;
    const out = a.createGain(); out.gain.value = vol;
    src.connect(out).connect(a.destination);
    src.start();
    return handle(a, out, [src], customBuffer.duration);
  }

  function play(name) {
    const vol = S.volume / 100;
    if (name === 'buzzer') return playBuzzer(S.length, vol);
    if (name === 'roar') return playRoar(S.length, vol);
    if (name === 'custom') return playCustom(vol);
    return null;
  }

  // ---------- Custom sound, kept in this browser (IndexedDB) ----------
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

  async function loadCustom(name, data) {
    customBuffer = await audio().decodeAudioData(data.slice(0));
    customName = name;
    renderCustom();
  }

  async function restoreCustom() {
    try {
      const rec = await dbDo('readonly', st => st.get('custom'));
      if (rec) await loadCustom(rec.name, rec.data);
    } catch (e) { /* no stored sound */ }
  }

  // ---------- Match / interval state ----------
  const st = {
    running: false,
    acc: 0,          // ms elapsed before the current run segment
    startedAt: 0,    // performance.now() when the current segment started
    intStart: 0,     // elapsed ms at which the current interval began
    intNo: 1,
    ended: false
  };
  const elapsed = () => st.acc + (st.running ? performance.now() - st.startedAt : 0);

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
    Object.assign(st, { running: false, acc: 0, startedAt: 0, intStart: 0, intNo: 1, ended: false });
    $('fulltime').hidden = true;
    keepAwake(false);
    render();
  }

  function intervalSignal() {
    play(S.intervalSound);
    flash();
  }

  function nextInterval() {
    if (st.ended) return;
    st.intStart = elapsed();
    st.intNo++;
    intervalSignal();
    render();
  }

  function endMatch() {
    st.running = false;
    st.acc = matchMs();
    st.ended = true;
    keepAwake(false);
    play(S.endSound);
    flash();
    $('ftSub').textContent = S.matchMin + ' min · ' + st.intNo + (st.intNo === 1 ? ' interval' : ' intervals');
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
      let fired = false;
      while (e >= st.intStart + intervalMs()) {
        st.intStart += intervalMs();
        st.intNo++;
        fired = true;
      }
      if (fired) intervalSignal();
    }
    render();
  }

  // ---------- Rendering ----------
  const mmss = ms => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const matchFmt = ms => {
    if (ms > 0 && ms < 60000) return (Math.ceil(ms / 100) / 10).toFixed(1);
    return mmss(ms);
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
    const mLeft = matchMs() - e;
    const intEnd = Math.min(st.intStart + intervalMs(), matchMs());
    const intLen = Math.max(1, intEnd - st.intStart);
    const iLeft = Math.max(0, intEnd - e);

    setText('matchClock', matchFmt(mLeft));
    setText('intClock', mmss(iLeft));
    setText('intNo', String(st.intNo));
    setText('intLen', 'every ' + mmss(intervalMs()));
    setText('matchLen', S.matchMin + ' min');
    setText('matchState', st.ended ? 'Full time' : st.running ? 'Running' : e > 0 ? 'Paused' : 'Ready');
    $('matchProgress').style.width = (e / matchMs() * 100).toFixed(2) + '%';
    ring.style.strokeDashoffset = (C * (1 - iLeft / intLen)).toFixed(1);
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
    });
  });

  document.addEventListener('keydown', e => {
    if ($('settings').open || e.repeat) return;
    const k = e.key.toLowerCase();
    if (e.code === 'Space') { e.preventDefault(); st.running ? pause() : start(); }
    else if (k === 'n') nextInterval();
    else if (k === 'b') document.querySelector('.pad-buzzer').click();
    else if (k === 'r') document.querySelector('.pad-roar').click();
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
  $('settingsBtn').addEventListener('click', () => { renderSettings(); sheet.showModal(); });
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });

  const fmtSetting = {
    matchMin: v => v + ' min',
    intervalSec: v => mmss(v * 1000)
  };

  function setSetting(key, v) {
    S[key] = v;
    saveSettings();
    renderSettings();
    render();
  }

  function renderSettings() {
    $('matchMinOut').textContent = fmtSetting.matchMin(S.matchMin);
    $('intervalSecOut').textContent = fmtSetting.intervalSec(S.intervalSec);
    document.querySelectorAll('.chips, .seg').forEach(group => {
      const val = String(S[group.dataset.key]);
      group.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === val));
    });
    document.querySelectorAll('.needs-custom').forEach(b => { b.disabled = !customBuffer; });
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

  document.querySelectorAll('.chips, .seg').forEach(group => {
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

  function renderCustom() {
    const has = !!customBuffer;
    $('customName').textContent = has ? customName : 'No file loaded';
    $('customRemove').hidden = !has;
    document.querySelector('.pad-custom').hidden = !has;
    $('customPadName').textContent = has ? customName.replace(/\.[^.]+$/, '').toUpperCase() : 'CUSTOM';
    renderSettings();
  }

  $('customFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      await loadCustom(file.name, data);
      try { await dbDo('readwrite', s => s.put({ name: file.name, data }, 'custom')); } catch (err) {}
    } catch (err) {
      $('customName').textContent = 'Could not read that file';
    }
  });

  $('customRemove').addEventListener('click', async () => {
    customBuffer = null; customName = '';
    try { await dbDo('readwrite', s => s.delete('custom')); } catch (e) {}
    if (S.intervalSound === 'custom') S.intervalSound = DEFAULTS.intervalSound;
    if (S.endSound === 'custom') S.endSound = DEFAULTS.endSound;
    saveSettings();
    renderCustom();
  });

  // Use the club's own logo if a logo.png is placed next to this page.
  const logo = document.querySelector('.emblem-img');
  logo.addEventListener('load', () => {
    logo.hidden = false;
    document.querySelector('.top .emblem').style.display = 'none';
  });

  // Offline support when served over http(s), e.g. GitHub Pages.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  renderSettings();
  renderCustom();
  restoreCustom();
  render();
})();
