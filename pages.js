// Help and About pages, opened from the header icons.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  function open(id) {
    const d = $(id);
    d.showModal();
    d.querySelector('.sheet-inner').scrollTop = 0;
  }
  $('helpBtn').addEventListener('click', () => open('help'));
  $('aboutBtn').addEventListener('click', () => open('about'));
  document.querySelectorAll('dialog.page').forEach(d => {
    d.querySelector('.close-page').addEventListener('click', () => d.close());
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
  });

  // Donation link, contact and maker come from config.json, so they can be changed without code.
  fetch('config.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then(cfg => {
      if (cfg.coffeeUrl) {
        $('coffeeLink').href = cfg.coffeeUrl;
        $('coffeeLink').hidden = false;
      }
      if (cfg.maker) {
        $('aboutMaker').textContent = 'Made by ' + cfg.maker + '.';
        $('aboutMaker').hidden = false;
      }
    });
})();
