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

  window.lbTrack = (name, data) => {
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
})();
