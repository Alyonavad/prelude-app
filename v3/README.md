# Prelude · prototype v3 (high fidelity)

The deliverable is one self-contained file: [../prelude-prototype-v3.html](../prelude-prototype-v3.html).
Open it in a browser, or host it on any static host. Script, styles and both fonts are inlined, so it
works offline and from disk.

This folder is its source. The v1/v2 wireframe (`../src`, `../dist`) is not touched by it.

## Rebuild

Run from the `prelude` folder:

```bash
npx vite build --config v3/vite.config.js && cp v3/out/index.html prelude-prototype-v3.html
```

## Where things come from

Design tokens, pills, tags, speech bubbles, flower states and all sticker artwork are ported from the
landing page (`../../product page`): `styles.css` and `art.js` here mirror its `styles.css` and `script.js`.
Fonts are copies of its `fonts/` (Anton, Boldnova-Demo).

```
app.jsx      state, tester panel and every screen
art.js       sticker SVG: flower, bubble, moon, voice note, photos, faces, path
data.js      all copy and mock content
styles.css   tokens, type, pills, tags, flower, motion
```

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
