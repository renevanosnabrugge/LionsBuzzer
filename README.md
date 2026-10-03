# Lions Buzzer 🦁🏒

A loud interval buzzer and match clock for ice hockey, styled per team: Dordrecht Lions by default, plus the other Dutch Eredivisie clubs, YetiLions and a Neutral style.
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

The built-in buzzer and goal horn are synthesized. To use real recordings for everyone, add them to `sounds/`:
`goal-horn.mp3` replaces the Goal horn and `buzzer.mp3` replaces the Buzzer. Only use recordings you have the rights to (CC0 / public domain).
On a single device you can also upload a file under *Settings → Sounds*, which takes priority over both.

### Team profiles

Each profile has its own name, title, subtitle, logo and five colours (background, text, primary, secondary, accent). The timer works the same for every profile.
Open *Settings → Team* and pick a team from the dropdown, or tap **+ New profile** to create one; it starts as a copy of the selected profile and can be edited and deleted.

- The built-in profiles come from `profiles.json` in the repository root, with logos in `logos/`: **Dordrecht Lions** (the default, colours from its style book), the other 2025–26 Eredivisie clubs, **YetiLions** and **Neutral** (San Jose Sharks-style teal, black and orange). They are locked in the app; change them by editing `profiles.json`.
- The other Eredivisie clubs use their club colours with a generic crossed-sticks badge, not their real logos. A club can send its logo to replace the badge in `logos/`. Colours for Leeuwarden, Den Haag and Geleen could not be confirmed and may need adjusting.
- Profiles you create in the app are saved only on that device.
- **Export for website (.zip)** downloads `profiles.json` (the built-in profiles plus the ones on this device) and the uploaded logos as files in `logos/`. Unzip it into the repository root, commit and push, and those profiles become built-in for everyone.
- **Download profiles.json** and **Load profiles.json** copy profiles between devices; logos are embedded in that file.

### Team icons and share links

- The home-screen icon, tab icon and app name follow the selected team: choose the team first, then use *Add to Home Screen*.
- A link preview (WhatsApp, etc.) can't know which team you picked, so the main link shows the default team (Dordrecht Lions). Each built-in team has its own share link, `team/<id>/` (for example `…/LionsBuzzer/team/tilburg-trappers/`), with that team's logo in the preview; opening it starts the app with that team. *Settings → Team → Share link for this team* shares it.
- The icons in `icons/teams/` and the pages in `team/` are generated from `profiles.json` by `tools/build-assets.cjs` (needs Node and Playwright). Run it after changing `profiles.json` or a logo. If the site moves to a custom domain, change `BASE_URL` in that script (and the `og:` tags in `index.html`) and run it again.

### Help and About

The **?** icon opens a help page with screenshots (`help/`). The **coffee** icon opens the About page: who made the app, a **Buy me a puck** donation button (Ko-fi) and a sponsoring contact. The donation link, contact email and maker name are set in `config.json`; empty values are hidden.

## Deploying to GitHub Pages

The app is in the root of the repository, so GitHub Pages serves it straight from `main`
(**Settings → Pages → Deploy from a branch → `main` / root**). Every merge to `main` is published to
`https://renevanosnabrugge.github.io/LionsBuzzer/`.

To use a custom domain later, enter it under **Settings → Pages → Custom domain** and point the domain's DNS at GitHub Pages; GitHub then adds a `CNAME` file to the repository root. All paths in the app are relative, so it works on a custom domain without changes.

## Running locally

Open `index.html` in a browser, or serve the folder, for example with `python3 -m http.server`.

## Notes

- The buzzer and goal horn are synthesized in the browser (Web Audio), so there are no audio files and no copyright issues.
- On iPhone/iPad, sound plays even with the silent switch on (iOS 17+). Turn the device volume up, and use a Bluetooth speaker or the rink PA for real volume.
- Fonts: Anton and Barlow Condensed (SIL Open Font License, see `fonts/`).
