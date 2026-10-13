# Prelude · prototype

A high-fidelity, clickable mobile prototype of Prelude. No backend: all data, recording and matching are simulated.

The deliverable is one self-contained file, [index.html](index.html). Open it in a
browser or put it on any static host (it is served at the root URL). Script, styles and both fonts are inlined, so it works offline and from disk.

On desktop it shows in a phone frame; on a phone it fills the screen. Progress is kept in `localStorage`.

## Run and rebuild

```bash
npm install
npm run dev
```

```bash
npm run build
```

`npm run build` writes `dist/index.html` and copies it to `index.html` at the project root. Do not edit that
file by hand; the source entry is `src/index.html`.

## Structure

```
index.html     the built prototype (open this)
src/
  index.html   source entry
  main.jsx     entry script
  app.jsx      state, tester panel and every screen
  art.js       sticker SVG: flower, bubble, moon, voice note, photos, faces, path
  data.js      all copy and mock content
  styles.css   tokens, type, pills, tags, flower, motion
  fonts/       Anton, Boldnova-Demo
```

Design tokens, pills, tags, speech bubbles, flower states and the sticker artwork are ported from the Prelude
landing page.

## Tester panel

A small "tester" pill in the top-right corner of the page (desktop). It opens Restart, Jump to screen,
"Skip this question" (inside a prelude) and Plum's simulated answers: matching, each Afterglow, meet again.
A "no" from Plum is never shown in the app; switching it to "yes" while you wait makes the mutual moment arrive.

On a phone the pill is hidden. Add `#tester` to the URL to show it there.

## What is simulated

- Recording: a timer and moving bars. No microphone. "See transcript" shows a canned line per question.
- Photos and faces: illustrated placeholders.
- Matching: the first answer you say yes to becomes Plum, about 6 seconds after you reach the waiting screen.
- Fern: a card on home only.

## Notes

- Boldnova-Demo is a demo font; check its licence before wider distribution. Anton is open source (SIL OFL).
- The earlier grey wireframe versions are in this repository's git history.
