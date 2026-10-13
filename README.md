# Prelude · wireframe prototype

A clickable, greyscale wireframe of the Prelude mobile app, for testing the **flow only**.
No visual design, no backend. All data is mocked in [src/data.js](src/data.js).

- On desktop the app renders in a 390×844 phone frame, with tester controls (Restart, Jump to screen) beside it.
- On a phone (viewport under 500px) the frame and tester controls disappear and the app fills the screen.
- `npm run build` writes one self-contained file, `dist/index.html`, which also opens straight from disk.
- Progress is kept in `localStorage`, so a refresh doesn't lose your place. "Restart" clears it.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173). To try it on your phone on the same Wi-Fi, run `npm run dev -- --host` and open the "Network" URL.

## Deploy (static site)

`npm run build` produces a plain static site in `dist/`. Any static host works. Pick one:

### Vercel (one command)

```bash
npm run deploy
```

The first run asks you to log in and confirm the project name. It then prints the public URL to send to testers.

### Netlify

```bash
npm run deploy:netlify
```

The first run asks you to log in and create or pick a site. Alternatively, run `npm run build` and drag the `dist/` folder onto https://app.netlify.com/drop.

### GitHub Pages

Requires this folder to be a git repo with a GitHub remote (`origin`).

```bash
npm run deploy:gh-pages
```

This pushes `dist/` to a `gh-pages` branch. In the repo, go to Settings → Pages and choose that branch as the source. The build uses relative asset paths, so it works under `username.github.io/repo-name/` without extra config.

## What is simulated

| Thing | How |
| --- | --- |
| Voice recording | A timer and a grey bar, then a placeholder transcript. No microphone is used. |
| Photo upload | The chosen file is previewed locally (in greyscale) and never uploaded. |
| Mirror card | Three fixed guesses. Confirmed or rewritten guesses feed "why you resonated" and the meeting suggestion. |
| Mutual match | Arrives about 6 seconds after you reach the waiting screen, whatever you chose. |
| Plum's answers | Appear about 3 seconds after you send yours. |
| Plum's Afterglow answers | Set in the tester panel (default "yes"), answered about 2.5 seconds later. A "not yet" from Plum is never shown in the app. |
| Plum after the meeting | "How did it feel?" and "meet again?" are set in the tester panel. Only the overlap is shown. |
| Fern | A card on Home only; the prelude isn't built. |
| Paywall | A placeholder. "continue" goes back to matching, and the next match is Plum again with a fresh prelude. |

Timings are constants at the top of [src/App.jsx](src/App.jsx). The only colours are the prelude backgrounds (lilac for Plum, mint for Fern), defined in [src/data.js](src/data.js).

## Tester panel (desktop only)

- **Restart** clears saved progress.
- **Jump to screen** goes straight to any screen, grouped by section. Some screens are only reachable this way, e.g. "Ended (what the other person sees)".
- **Plum's Afterglow answers**: yes / not yet for world photos, faces, ready to meet and numbers. If you are waiting on a "not yet", switching it to "yes" makes the mutual moment arrive.
- **Plum after the meeting**: Plum's answer to "how did it feel?" and "meet again?".
- **Your photo preference**: changes the flow live. "from the start" shows faces from question 1 and skips the faces Afterglow; "only when we meet" skips it and never shows faces.

Inside the phone, two prototype-only links also show on mobile:

- **[tester] skip ahead →** under each conversation question moves on without answering. It still stops at the Afterglow moments after questions 4, 8 and 12.
- **[prototype] the day after →** on the power-down screen leads to "after the meeting".

## Structure

```
index.html
src/
  main.jsx     entry
  App.jsx      state, tester controls and every screen
  data.js      all copy and mock content
  styles.css   greyscale wireframe styles
```
