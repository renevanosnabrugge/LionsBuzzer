# Yeti Lion Alliance Buzzer 🦁🏒

A loud interval buzzer and match clock for ice hockey, in the Yeti Lion Alliance colours.
It's built for an iPad and also works on phones and laptops.

## Features

- **Match clock**: configurable match length. Shows tenths in the last minute and plays the end-of-match sound at full time.
- **Interval clock**: configurable interval, with a countdown ring that pulses in the last 5 seconds. The interval sound plays and the screen flashes at every interval.
- **Next interval**: sounds the signal right away and starts a new interval. The match clock keeps running.
- **Sounds**: a loud arena **buzzer** (default for intervals) and a **lion roar** (default for the end of the match). You can upload your own mp3/wav, which is remembered on the device. Each sound has a big tap pad; tap again to stop it.
- Sound length and volume are adjustable. All settings are remembered on the device.
- Touch-first: large buttons, hold-to-repeat steppers, no zoom on double-tap. Works in landscape and portrait, and keeps the screen awake while the clock runs.
- Works offline after the first visit, and installs to the home screen (Share → *Add to Home Screen* on iPad).

Keyboard: `Space` start/pause · `N` next interval · `B` buzzer · `R` roar.

### Using the real club logo

The emblem in the app is a simplified drawing. To use the official logo, add it as `site/logo.png` (square or wide, transparent background). The header picks it up automatically.

## Deploying to GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the `site/` folder whenever `main` changes. One-time setup:

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge to `main`, or run the *Deploy to GitHub Pages* workflow by hand from the Actions tab.

The app will be live at `https://renevanosnabrugge.github.io/LionsBuzzer/`.

## Running locally

Open `site/index.html` in a browser, or serve the folder, for example with `python3 -m http.server -d site`.

## Notes

- The buzzer and roar are synthesized in the browser (Web Audio), so there are no audio files and no copyright issues.
- On iPhone/iPad, sound plays even with the silent switch on (iOS 17+). Turn the device volume up, and use a Bluetooth speaker or the rink PA for real volume.
- Fonts: Anton and Barlow Condensed (SIL Open Font License, see `site/fonts/`).
