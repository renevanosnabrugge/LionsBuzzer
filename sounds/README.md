# Recorded sounds

Put real recordings here to replace the sounds the app synthesizes, and list them in `config.json`:

```json
"sounds": { "buzzer": "sounds/buzzer.mp3", "horn": "sounds/goal-horn.mp3" }
```

Leave a value empty (`""`) to keep the built-in sound. The app only loads files that are listed,
and they work offline after the first visit.
Only use recordings you have the rights to, such as CC0 / public domain sounds.
For a real file, the sound-length slider doesn't apply: the whole file plays.
