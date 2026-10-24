# Prelude — UI rules: interactive vs illustrative

Anything you can tap looks like a control; anything that's decoration looks like a sticker. Never mix the two.

## The rule

Every element on a screen belongs to exactly one of three kinds. The kind decides how it looks.

|  | Interactive | Content | Illustrative |
| --- | --- | --- | --- |
| What it is | Things you tap or type in | Information you read or respond to | Decoration that sets the mood |
| Examples | Buttons, yes / not quite, answer chips, inputs, voice/writing toggle, record | Questions, answers, tendencies, match card, Side by Side plan | Flower, moon, smiley, tags like "by voice", world photos as decoration |
| Rotation | Never | Never (straight) | Yes, 2–8° |
| Outline | Solid black, 2.5px | Solid black 2px, or none | Black + dashed inner border |
| White halo | No | No | Yes |
| Fill | White or black | Conversation colour or white | Any tag colour |
| Text | See typography below | See typography below | Lowercase, sticker font |
| Motion | Press feedback only | Fade/slide in | Pop, sway, float |

Two checks for any element: if it rotates or has a halo, it must never be tappable. If it's tappable, it never rotates or has a halo.

## Typography, shape and spacing

Each role has one fixed style, so a title, a piece of content, an input and a button can never look alike.

| Role | Font | Size / line height | Case |
| --- | --- | --- | --- |
| Screen title | Dharma Gothic E Bold | 69 / 53 (can be smaller on busy screens) | Uppercase |
| Content text (cards, tendencies) | Anton Regular | 20 / 20 | Uppercase |
| Input text and placeholder | Anton Regular | 18 / 18, always vertically centred | As typed |
| Button and pill labels | DIN Pro Medium | 16 / 16, always | Sentence case |
| Caption / hint | Anton Regular | 15 / 18, always centred | As typed |

Shape and spacing:

- Corners: 16px radius with 60% corner smoothing (iOS style) on cards, inputs and buttons.
- Primary (full-width) button: 23px vertical padding, so 62px tall.
- Inputs: fixed height with equal top and bottom padding; text never sits low.
- Gap between stacked cards: 6–8px.
- Space between an illustration and the content below it: at least 16px; stickers never touch cards.
- Side margins: 16px on every screen.
- Device frame: iPhone 16 (393 × 852 pt), with Dynamic Island (126 × 37 pt, 11pt from the top), status bar (9:41, signal, wifi, battery) and home indicator; content respects the safe areas (top ~59pt, bottom ~34pt).
- Design references for each screen live in docs/screens/ (one PNG per state); match them closely.

## Interactive components

About ten components cover the whole app. Every one has the same states, so a person always knows what will happen when they tap.

| Component | Default | Pressed | Selected | Disabled |
| --- | --- | --- | --- | --- |
| Primary button | Black fill, white text, full-width pill, 62px tall | Moves down 2px, slightly darker | — | Dimmed black: black at ~60% opacity, white text at ~60% (reads dark navy on blue, grey on white sheets) |
| Secondary button | White fill, black outline | Light grey fill | — | Grey outline and text |
| Choice pill (yes / not quite, answer chips) | White fill, black outline | Light grey fill | Black fill, white text, small check | Grey outline |
| Segmented toggle (voice / writing) | Two halves in one outline | — | Selected half black | — |
| Text input | White, black outline, 16px+ text | — | Focus: thicker outline (3px) | Grey |
| Record button | Black circle with mic | Grows slightly, pulses while recording | — | — |
| Text link (listen, record again, skip) | Underlined, black | Lighter | — | — |
| Icon button (back, close, menu) | 44×44px tap area, no outline | Light grey circle behind | — | — |

Shared rules:

- Minimum tap area 44×44px, even when the visible pill is smaller.
- Keyboard focus: a 2px black dashed ring outside the element (focus-visible only).
- One primary button per screen, always at the bottom.
- Inputs that have no button to commit them (e.g. "Not quite") autosave ~0.6s after the person stops typing and show the green check. Inputs on screens with a commit button (e.g. "Send & next question") show no check: the button is the save.
- Status icons (e.g. "saved": icons/check-circle.svg, green #379A01) are never styled or behave like buttons: small (~20px), no pointer cursor, not focusable, not clickable.

## Answer composer (reference: reflective questions)

Whenever the person answers something (reflections, prelude conversation), use the composer instead of separate toggles and buttons. Reference mockups: docs/screens/group-1/composer-*.png.

- The question is the hero: title font, large, left-aligned; a small flower sticker above it is fine.
- One composer bar pinned to the bottom, all elements 52px tall: "+" (photos) · text field (grows up to ~5 lines) · one round black button that is a mic when empty and a send arrow when there's text or a recording.
- Voice: mic → recording (red dot, timer, "Cancel", stop button) → recorded (delete, playable voice note, send).
- Photos: "+" opens the action sheet ("Take photo" / "Choose from library" / "Cancel"); up to 6. Thumbnails sit in a row just above the bar, starting at the left margin; the row scrolls sideways and runs off the right edge, never clipped on the left.
- Send is the save: no autosave check here.

## Example: the portrait screen

| Element | Now | After |
| --- | --- | --- |
| Headline | "HERE'S YOUR FLOWER." | "HERE'S WHAT WE NOTICED." |
| Flower | Illustrative, fine | Unchanged: sticker, halo, gentle sway |
| Tendencies | Rotated stickers with halo and dashed border, alternating left/right | Content cards: straight, full width, tag-colour fill, solid 2px outline, no halo |
| Yes / not quite | Separate floating pills under each sticker | A choice pill pair inside each card, bottom-right; selected = black fill with check |
| "Not quite" | — | Opens a text input inside the card. ~0.6s after the person stops typing, the text autosaves and a green check status icon (icons/check-circle.svg) appears in the input. On blur, the input closes and the card shows "In your words" + their text + an "Edit" link, which reopens the input |
| Hint | Floating line of text | Small text under the last card |
| Find your people | Faded blue, looks broken | Disabled style until all three are answered, then black primary |

The result: one card per tendency, each with its own answer, and the only sticker on the screen is the flower.

## Screens to apply the rule to

Keep the screen logic as it is; change only how elements look.

- [x] Welcome
- [x] Reflective questions (composer)
- [x] Portrait ("Here's what we noticed") — reference screen: match this one
- [ ] Mutual matching cards
- [ ] Waiting / question of the day
- [ ] Match arrives ("Meet Alex")
- [ ] Home: your preludes
- [ ] Prelude conversation
- [ ] Afterglow moments (photos, faces, ready to meet)
- [ ] Side by Side suggestion
- [ ] Power down
- [ ] After the meeting
- [ ] Prelude ended
