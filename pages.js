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

  // ---------- Report a problem: email or GitHub issue, with technical details filled in ----------
  const REPO = 'https://github.com/renevanosnabrugge/ijshockeyklok';
  let contactEmail = '';
  function diagnostics() {
    let settings = {};
    try { settings = JSON.parse(localStorage.getItem('ylBuzzer') || '{}'); } catch (e) {}
    const a = window.__lbAudio && window.__lbAudio();
    const version = (document.querySelector('meta[name=app-version]') || {}).content || '?';
    const installed = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    return [
      'App version: ' + version,
      'Page: ' + location.href,
      'Team: ' + $('wmTitle').textContent,
      'Settings: ' + JSON.stringify(settings),
      'Sound: ' + (a ? a.state : 'not started yet'),
      'Added to home screen: ' + (installed ? 'yes' : 'no'),
      'Screen: ' + screen.width + 'x' + screen.height + ' (window ' + innerWidth + 'x' + innerHeight + ', ' + devicePixelRatio + 'x)',
      'Browser: ' + navigator.userAgent,
      'Time: ' + new Date().toISOString()
    ].join('\n');
  }
  function openReport() {
    const diag = diagnostics();
    const mail = $('reportMail');
    mail.hidden = !contactEmail;
    mail.href = 'mailto:' + contactEmail +
      '?subject=' + encodeURIComponent('Lions Buzzer: problem report') +
      '&body=' + encodeURIComponent('What happened?\n\n\nWhat did you expect to happen?\n\n\n---- technical details (please keep) ----\n' + diag);
    $('reportGithub').href = REPO + '/issues/new?template=bug_report.yml' +
      '&title=' + encodeURIComponent('[Bug] ') + '&diagnostics=' + encodeURIComponent(diag);
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    $('reportModal').showModal();
  }
  document.querySelectorAll('.report-btn').forEach(b => b.addEventListener('click', openReport));
  $('reportClose').addEventListener('click', () => $('reportModal').close());
  $('reportModal').addEventListener('click', e => { if (e.target === $('reportModal')) $('reportModal').close(); });

  // Donation link, contact and maker come from config.json, so they can be changed without code.
  fetch('config.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then(cfg => {
      if (cfg.coffeeUrl) {
        $('coffeeLink').href = cfg.coffeeUrl;
        $('coffeeLink').hidden = false;
      }
      contactEmail = cfg.contactEmail || '';
      if (cfg.maker) {
        $('aboutMaker').textContent = 'Made by ' + cfg.maker + '.';
        $('aboutMaker').hidden = false;
      }
    });
})();
