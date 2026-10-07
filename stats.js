// Anonymous usage statistics with Umami (cookieless, no personal data, "Do Not Track" respected).
// The Umami script is loaded in index.html. lbTrack(name, data) sends a custom event; events are
// queued until the script has loaded, and silently dropped when it can't load (offline, blocked).
(() => {
  'use strict';
  const queue = [];

  function flush() {
    const u = window.umami;
    if (!u || typeof u.track !== 'function') return;
    while (queue.length) {
      const [name, data] = queue.shift();
      try { u.track(name, data); } catch (e) { /* never break the app for statistics */ }
    }
  }

  const log = [];   // last events, for the troubleshooting view (#stats)
  window.lbTrack = (name, data) => {
    log.push({ name, data, at: new Date() });
    if (log.length > 12) log.shift();
    queue.push([name, data]);
    if (queue.length > 40) queue.shift();
    flush();
  };

  // Built-in teams are reported by name; a team made on a device is only reported as "custom".
  window.lbTeamLabel = () => (window.__lbTeam && window.__lbTeam.builtin ? window.__lbTeam.name : 'custom');

  const tag = document.getElementById('umami');
  if (tag) tag.addEventListener('load', flush);
  window.addEventListener('load', () => setTimeout(flush, 800));

  // Arrived through a team share link (team/<id>/ sets this flag, then opens the app).
  try {
    const id = sessionStorage.getItem('ylFromLink');
    if (id) { sessionStorage.removeItem('ylFromLink'); window.lbTrack('team-link', { team: id }); }
  } catch (e) {}

  // Opened from the home screen (installed app).
  try {
    if ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone) window.lbTrack('opened-as-app');
  } catch (e) {}

  // ---------- Troubleshooting: open the app with #stats to see why statistics might not arrive ----------
  function showDiagnostics() {
    const tagEl = document.getElementById('umami');
    const domains = ((tagEl && tagEl.dataset.domains) || '').split(',').map(x => x.trim()).filter(Boolean);
    const dntRaw = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    const dnt = dntRaw === '1' || dntRaw === 1 || dntRaw === 'yes';
    let disabled = null;
    try { disabled = localStorage.getItem('umami.disabled'); } catch (e) {}

    const box = document.createElement('div');
    box.id = 'statsDebug';
    const title = document.createElement('div');
    title.className = 'sd-title';
    title.textContent = 'Statistics check';
    const rows = document.createElement('div');
    const events = document.createElement('pre');
    const actions = document.createElement('div');
    actions.className = 'sd-actions';
    const test = document.createElement('button');
    test.textContent = 'Send test event';
    const close = document.createElement('button');
    close.textContent = 'Close';
    actions.append(test, close);
    box.append(title, rows, events, actions);
    document.body.appendChild(box);

    const row = (label, value, ok) => {
      const r = document.createElement('div');
      r.className = 'sd-row ' + (ok === true ? 'ok' : ok === false ? 'bad' : '');
      const l = document.createElement('span'); l.textContent = label;
      const v = document.createElement('b'); v.textContent = value;
      r.append(l, v);
      return r;
    };
    let reach;   // undefined = still checking
    function render() {
      const loaded = !!(window.umami && typeof window.umami.track === 'function');
      const counted = !domains.length || domains.includes(location.hostname);
      rows.textContent = '';
      rows.append(
        row('Address', location.hostname + (counted ? '' : '  (not counted: only ' + domains.join(', ') + ')'), counted),
        row('Do Not Track', dntRaw ? String(dntRaw) + (dnt ? '  (statistics are OFF for you)' : '') : 'not set', !dnt),
        row('Switched off by hand', disabled ? 'yes (umami.disabled)' : 'no', !disabled),
        row('Umami script reachable', reach === undefined ? 'checking…' : reach ? 'yes' : 'NO (blocked by an ad blocker, tracking prevention or the network)', reach === undefined ? null : reach),
        row('Umami script loaded', loaded ? 'yes' : 'NO', loaded)
      );
      events.textContent = log.length
        ? log.slice().reverse().map(e => e.at.toTimeString().slice(0, 8) + '  ' + e.name + (e.data ? ' ' + JSON.stringify(e.data) : '')).join('\n')
        : 'No events yet. Tap something.';
    }
    render();
    fetch('https://cloud.umami.is/script.js', { mode: 'no-cors', cache: 'no-store' })
      .then(() => { reach = true; render(); }, () => { reach = false; render(); });
    test.addEventListener('click', () => { window.lbTrack('stats-test'); render(); setTimeout(render, 1500); });
    close.addEventListener('click', () => box.remove());
    setInterval(() => { if (box.isConnected) render(); }, 3000);
  }
  if (location.hash === '#stats') window.addEventListener('DOMContentLoaded', showDiagnostics);
})();
