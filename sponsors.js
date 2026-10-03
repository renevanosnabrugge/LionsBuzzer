// Sponsors: a subtle strip of logo "boards" at the bottom (faded while the clock runs),
// a popup with the sponsor's details, and the app sponsors on the About page.
//
// App sponsors (every team) live in config.json under "sponsors".
// Team sponsors live in profiles.json under that team's "sponsors"; they only show while that
// team is selected, and never on the About page.
// A sponsor is { "name", "logo", "url", "text" }. Empty slots invite new sponsors.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SLOTS = 4;
  let cfg = {};
  let team = window.__lbTeam || { name: '', sponsors: [] };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

  function sponsorTile(s, kind) {
    const b = el('button', 'board-slot');
    b.type = 'button';
    b.setAttribute('aria-label', s.name);
    if (s.logo) { const img = el('img'); img.src = s.logo; img.alt = s.name; b.appendChild(img); }
    else b.textContent = s.name;
    b.addEventListener('click', () => showSponsor(s, kind));
    return b;
  }
  function placeholderTile(cls) {
    const b = el('button', cls, 'Your logo here');
    b.type = 'button';
    b.addEventListener('click', showInvite);
    return b;
  }

  function render() {
    const slots = $('boardSlots');
    slots.textContent = '';
    const list = (team.sponsors || []).map(s => [s, 'team']).concat((cfg.sponsors || []).map(s => [s, 'app'])).slice(0, SLOTS);
    list.forEach(([s, kind]) => slots.appendChild(sponsorTile(s, kind)));
    for (let i = list.length; i < SLOTS; i++) slots.appendChild(placeholderTile('board-slot empty'));

    // About page: app sponsors only.
    const grid = $('aboutSponsors');
    grid.textContent = '';
    const app = cfg.sponsors || [];
    app.forEach(s => { const t = sponsorTile(s, 'app'); t.className = 'about-tile'; grid.appendChild(t); });
    for (let i = app.length; i < SLOTS; i++) grid.appendChild(placeholderTile('about-tile empty'));
  }

  function open(build) {
    const card = $('sponsorCard');
    card.textContent = '';
    build(card);
    const close = el('button', 'btn small ghost', 'CLOSE');
    close.type = 'button';
    close.addEventListener('click', () => $('sponsorModal').close());
    card.querySelector('.sponsor-actions').appendChild(close);
    if ($('about').open) $('about').close();
    $('sponsorModal').showModal();
  }

  function showSponsor(s, kind) {
    open(card => {
      card.appendChild(el('div', 'sponsor-tag', kind === 'team' ? 'Team sponsor · ' + team.name : 'App sponsor'));
      if (s.logo) { const img = el('img', 'sponsor-logo'); img.src = s.logo; img.alt = s.name; card.appendChild(img); }
      card.appendChild(el('h3', '', s.name));
      if (s.text) card.appendChild(el('p', '', s.text));
      const actions = el('div', 'sponsor-actions');
      if (s.url) {
        const a = el('a', 'btn small start', 'VISIT WEBSITE');
        a.href = /^https?:\/\//.test(s.url) ? s.url : 'https://' + s.url;
        a.target = '_blank'; a.rel = 'noopener';
        actions.appendChild(a);
      }
      card.appendChild(actions);
    });
  }

  function showInvite() {
    open(card => {
      card.appendChild(el('div', 'sponsor-tag', 'Sponsoring'));
      card.appendChild(el('div', 'sponsor-dash', 'YOUR LOGO HERE'));
      card.appendChild(el('h3', '', 'Sponsor the buzzer'));
      card.appendChild(el('p', '', 'This buzzer is made by volunteers of Dordrecht Lions. Sponsor one team, or the whole app, and your logo appears here.'));
      const actions = el('div', 'sponsor-actions');
      if (cfg.contactEmail) {
        const p = el('p', '', 'Mail us at ');
        const a = el('a', '', cfg.contactEmail);
        a.href = 'mailto:' + cfg.contactEmail + '?subject=' + encodeURIComponent('Sponsoring Lions Buzzer');
        p.appendChild(a); p.append('.');
        card.appendChild(p);
        const btn = el('a', 'btn small start', 'MAIL US');
        btn.href = a.href;
        actions.appendChild(btn);
      }
      card.appendChild(actions);
    });
  }

  $('sponsorModal').addEventListener('click', e => { if (e.target === $('sponsorModal')) $('sponsorModal').close(); });

  window.addEventListener('lb:profile', e => { team = e.detail || team; render(); });
  fetch('config.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then(c => { cfg = c || {}; render(); });
  render();
})();
