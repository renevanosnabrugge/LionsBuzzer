# Lions Buzzer 🦁🏒

A loud interval buzzer and match clock for ice hockey, styled per team (YetiLions by default, plus Dordrecht Lions).
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

The built-in buzzer and goal horn are synthesized. To use real recordings for everyone, add them to `site/sounds/`:
`goal-horn.mp3` replaces the Goal horn and `buzzer.mp3` replaces the Buzzer. Only use recordings you have the rights to (CC0 / public domain).
On a single device you can also upload a file under *Settings → Sounds*, which takes priority over both.

### Team profiles

Each profile has its own name, title, subtitle, logo and five colours (background, text, primary, secondary, accent). The timer works the same for every profile.
Open *Settings → Team profile* to select, create, edit or delete a profile.

- The built-in profiles are in `site/profiles.json`, with logos in `site/logos/`. **YetiLions** is the default, and **Dordrecht Lions** (colours from its style book) is the second profile.
- A static website can't save files on the server, so changes made in the app are saved on that device.
- To publish profiles for everyone, tap **Download profiles.json** and commit that file as `site/profiles.json`.
- **Load profiles.json** loads profiles from a file onto another device.
- Uploaded logos are embedded in the downloaded file. You can also put a logo in `site/logos/` and refer to it by its path, as the built-in profiles do.

## Deploying to GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the `site/` folder whenever `main` changes. One-time setup:

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge to `main`, or run the *Deploy to GitHub Pages* workflow by hand from the Actions tab.

The app will be live at `https://renevanosnabrugge.github.io/LionsBuzzer/`.

## Running locally

Open `site/index.html` in a browser, or serve the folder, for example with `python3 -m http.server -d site`.

## Notes

- The buzzer and goal horn are synthesized in the browser (Web Audio), so there are no audio files and no copyright issues.
- On iPhone/iPad, sound plays even with the silent switch on (iOS 17+). Turn the device volume up, and use a Bluetooth speaker or the rink PA for real volume.
- Fonts: Anton and Barlow Condensed (SIL Open Font License, see `site/fonts/`).
