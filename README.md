# IJshockeyklok 🦁🏒

Live at **https://ijshockeyklok.nl/**. Made by volunteers of Dordrecht Lions.

A loud interval buzzer and match clock for ice hockey, styled per team: Dordrecht Lions by default, plus Dutch and Belgian clubs, YetiLions and a Neutral style.
It's built for an iPad and also works on phones and laptops.

## Features

- **Match clock**: configurable match length. Shows tenths in the last minute and plays the end-of-match sound at full time.
- **Interval clock**: configurable interval, with a countdown ring that pulses in the last 5 seconds. The interval sound plays and the screen flashes at every interval.
- **Clock direction**: count down (default) or count up, set in the settings.
- **Next interval**: moves the clock to the next whole interval, to keep it in line with the rink clock. Counting down with a 1-minute interval: 14:32 → 14:00, 9:01 → 9:00, 14:00 → 13:00. Counting up: 5:28 → 6:00. This is a silent correction; the clock keeps its running or paused state. Intervals always line up with the clock as displayed.
- **Sounds**: a loud arena **buzzer** (default for intervals) and an arena **goal horn** (default for the end of the match). Each has a big tap pad; tap again to stop it. The Goal horn pad also starts a full-screen **GOAL!** light show (tap to stop). You can replace the buzzer and the goal horn with your own mp3/wav under *Settings → Sounds*; the files are remembered on the device.
- Sound length and volume are adjustable. All settings are remembered on the device.
- Touch-first: large buttons, hold-to-repeat steppers, no zoom on double-tap. Works in landscape and portrait, and keeps the screen awake while the clock runs.
- Works offline after the first visit, and installs to the home screen (Share → *Add to Home Screen* on iPad).

Keyboard: `Space` start/pause · `N` next interval · `B` buzzer · `G` goal horn.

### Using real recordings

The built-in buzzer and goal horn are synthesized. To use real recordings for everyone, add them to `sounds/` and list them in `config.json` under `"sounds"` (for example `"horn": "sounds/goal-horn.mp3"`). Empty values keep the built-in sound. Only use recordings you have the rights to (CC0 / public domain).
On a single device you can also upload a file under *Settings → Sounds*, which takes priority over both.

### Team profiles

Each profile has its own name, title, subtitle, logo and five colours (background, text, primary, secondary, accent). The timer works the same for every profile.
Tap the **team name** at the top of the screen (▾) to switch teams quickly; on the first visit a bubble points this out. Switching is disabled while the clock runs. Below the list, *Don't see your team?* offers **Make your own team** (opens Settings → Team) and **Ask us to add it** (a prefilled email asking for the team details and the exported profile or logo). For more, open *Settings → Team*: pick a team from the dropdown, or tap **+ New profile** to create one; it starts as a copy of the selected profile and can be edited and deleted.

- The built-in profiles come from `profiles.json` in the repository root, with logos in `logos/`: **Dordrecht Lions** (the default), Dutch and Belgian clubs (Alcmaria Flames, Amsterdam Tigers, Antwerpen Phantoms, Breda Yetis, Capitals Leeuwarden, Coldplay Sharks, Dragons Utrecht, Eindhoven Kemphanen, Heerenveen Flyers, HYC Herentals, Gijs Groningen, Leiden Lions, HIJS Den Haag, Nijmegen Devils, Red Eagles Den Bosch, Smoke Eaters Geleen, Tilburg Trappers, Zoetermeer Panters), **YetiLions** and **Neutral**. They are locked in the app; change them by editing `profiles.json`.
- Logos in `logos/` are named after the team id (`logos/<id>.png`), trimmed and at most 640 px. Logos with a white background have it removed; logos with dark lines or text (Amsterdam, Utrecht, Tilburg) sit on a white plate so they show on dark backgrounds. The files as supplied are kept in `logos/originals/`.
- The app keeps text readable whatever the team colours: a very light accent or secondary colour is toned down where white text sits on it, and a buzzer colour that blends into the background is lightened.
- Profiles you create in the app are saved only on that device.
- **Export for website (.zip)** downloads `profiles.json` (the built-in profiles plus the ones on this device) and the uploaded logos as files in `logos/`. Unzip it into the repository root, commit and push, and those profiles become built-in for everyone.
- **Download profiles.json** and **Load profiles.json** copy profiles between devices; logos are embedded in that file.

### Team icons and share links

- The home-screen icon, tab icon and app name follow the selected team: choose the team first, then use *Add to Home Screen*.
- A link preview (WhatsApp, etc.) can't know which team you picked, so the main link shows the default team (Dordrecht Lions). Each built-in team has its own share link, `team/<id>/` (for example `https://ijshockeyklok.nl/team/tilburg-trappers/`), with that team's logo in the preview; opening it starts the app with that team. *Settings → Team → Share link for this team* shares it.
- The icons in `icons/teams/` and the pages in `team/` are generated from `profiles.json` by `tools/build-assets.cjs` (needs Node and Playwright). Run it after changing `profiles.json` or a logo. If the domain changes, change `BASE_URL` in that script (and the `og:` tags in `index.html`) and run it again.

### Sponsors

- A low strip at the bottom of the screen shows up to 4 sponsor logos, toned down, styled like rink boards. It fades out while the clock runs, so it never competes with the time. Empty slots show a dashed "Your logo here".
- Tapping a logo opens a popup with the sponsor's logo, name, text and website. Tapping "Your logo here" opens an invitation to sponsor, with the contact email from `config.json`.
- **App sponsors** (shown for every team) are listed in `config.json` under `"sponsors"`. They also appear on the About page.
- **Team sponsors** are listed in `profiles.json` under that team's `"sponsors"`. They only show in the strip while that team is selected, before the app sponsors, and never on the About page.
- A sponsor looks like `{ "name": "Xebia", "logo": "sponsors/xebia.png", "url": "https://www.xebia.com", "text": "…" }`. Put sponsor logos in `sponsors/`.

### Reporting problems

*Help* and *About* have a **Report a problem** button. It offers two ways, both with technical details filled in (app version, page, team, clock settings, sound state, device and browser; no personal data):

- **Email us**: a prefilled email to the contact address in `config.json`. No account needed.
- **GitHub issue**: opens a new issue in this repository with the *Report a problem* form (`.github/ISSUE_TEMPLATE/bug_report.yml`), with the technical details prefilled. Needs a GitHub account.

### Help and About

The **?** icon opens a help page with screenshots (`help/`). The **puck** icon opens the About page: who made the app, a **Buy me a puck** donation button (Ko-fi) and the app sponsors. The donation link, contact email and maker name are set in `config.json`; empty values are hidden.

## Deploying to GitHub Pages

The app is in the root of the repository, so GitHub Pages serves it straight from `main`
(**Settings → Pages → Deploy from a branch → `main` / root**). Every merge to `main` is published to
**https://ijshockeyklok.nl/** (custom domain, set by the `CNAME` file). The repository is `renevanosnabrugge/ijshockeyklok`.

All paths in the app are relative. Only the link previews need the full address: `BASE_URL` in `tools/build-assets.cjs` and the `og:` tags in `index.html` use `https://ijshockeyklok.nl/`. Change those (and run the script) if the domain ever changes.

## Running locally

Open `index.html` in a browser, or serve the folder, for example with `python3 -m http.server`.

## Notes

- The buzzer and goal horn are synthesized in the browser (Web Audio), so there are no audio files and no copyright issues.
- Phones can pause or break web audio (calls, notifications, other apps, the lock screen). The app checks the audio channel every second, rebuilds it when it is closed or stuck, repairs it on any tap, keeps it awake with an inaudible tone while the clock runs, and shows a banner when only a tap can bring the sound back.
- On iPhone/iPad, sound plays even with the silent switch on (iOS 17+). Turn the device volume up, and use a Bluetooth speaker or the rink PA for real volume.
- Fonts: Anton and Barlow Condensed (SIL Open Font License, see `fonts/`).
