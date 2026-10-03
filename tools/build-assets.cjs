// Builds the per-team app icons and share pages from profiles.json.
//
//   npm install playwright   (once)
//   node tools/build-assets.cjs
//
// Run it again after changing profiles.json or a logo, and commit the results:
//   icons/teams/<id>-180.png, -192.png, -512.png   home-screen icons and link-preview images
//   icons/icon-192.png, icon-512.png, apple-touch-icon.png   copies for the default team
//   team/<id>/index.html   share link per team (link preview with the team logo; opens the app with that team)
//
// Link previews (WhatsApp etc.) need absolute image URLs, so BASE_URL must be the site address.
// Change it if the site moves to a custom domain.
const BASE_URL = 'https://renevanosnabrugge.github.io/LionsBuzzer/';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'profiles.json'), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function logoDataUrl(logo) {
  if (!logo) return '';
  if (logo.startsWith('data:')) return logo;
  const file = path.join(root, logo);
  const type = logo.endsWith('.svg') ? 'image/svg+xml' : logo.endsWith('.jpg') || logo.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
  return 'data:' + type + ';base64,' + fs.readFileSync(file).toString('base64');
}

function teamPage(p) {
  const title = p.name + ' Buzzer';
  const img = BASE_URL + 'icons/teams/' + p.id + '-512.png';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="Interval buzzer and match clock for ice hockey.">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="Interval buzzer and match clock for ice hockey.">
<meta property="og:url" content="${BASE_URL}team/${p.id}/">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="${esc(p.colors.background)}">
<link rel="icon" href="../../icons/teams/${p.id}-192.png" type="image/png">
<link rel="apple-touch-icon" href="../../icons/teams/${p.id}-180.png">
<script>
  // Select this team in the app, then open it.
  try { localStorage.setItem('ylProfile', ${JSON.stringify(p.id)}); localStorage.removeItem('ylProfileCache'); } catch (e) {}
  location.replace('../../');
</script>
</head>
<body style="background:${esc(p.colors.background)};color:#fff;font-family:sans-serif;text-align:center;padding:40px">
<p><a style="color:#fff" href="../../">Open the ${esc(title)}</a></p>
</body>
</html>
`;
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  fs.mkdirSync(path.join(root, 'icons/teams'), { recursive: true });
  for (const p of data.profiles) {
    const logo = logoDataUrl(p.logo);
    for (const size of [180, 192, 512]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<html><body style="margin:0">
        <div style="width:${size}px;height:${size}px;background:${p.colors.background};display:flex;align-items:center;justify-content:center">
          ${logo ? `<img src="${logo}" style="max-width:80%;max-height:80%;object-fit:contain">` : ''}
        </div></body></html>`);
      await page.waitForLoadState('load');
      await page.screenshot({ path: path.join(root, `icons/teams/${p.id}-${size}.png`) });
    }
    fs.mkdirSync(path.join(root, 'team', p.id), { recursive: true });
    fs.writeFileSync(path.join(root, 'team', p.id, 'index.html'), teamPage(p));
    console.log('built', p.id);
  }
  // The default team's icons are the site's static icons.
  const def = data.default || data.profiles[0].id;
  for (const [src, dst] of [['180', 'apple-touch-icon'], ['192', 'icon-192'], ['512', 'icon-512']]) {
    fs.copyFileSync(path.join(root, `icons/teams/${def}-${src}.png`), path.join(root, `icons/${dst}.png`));
  }
  await browser.close();
})();
