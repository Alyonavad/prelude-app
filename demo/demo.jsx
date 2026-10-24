import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { SCREENS, DeviceChrome, INITIAL, JUMPS } from '../src/app.jsx'
import '../src/styles.css'
import './demo.css'

/*
  The happy path as one continuous take (docs/screens/video/01–06), on a fixed timeline.
  Everything is a function of time `t`: screen changes and taps are events at fixed moments,
  the camera is computed per frame, and every CSS animation is paused and set to its exact age.
  The same frame always looks the same, so recordings are repeatable.

  ?capture: no autoplay; the recorder calls window.demo.seek(ms) before each screenshot.
*/

const SLOW = 1.25 // the whole take, stretched: longer holds, slower zooms and reveals
const T = (ms) => ms * SLOW
const TOTAL = T(15000) // one loop, ms (18.75s)
const BASE = 0.86 // phone at ~70% of the 1080 canvas: 880 x 0.86 = 757px
const CAPTURE = new URLSearchParams(location.search).has('capture')

// cubic-bezier easing, solved by bisection
function bezier(x1, y1, x2, y2) {
  const at = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (at(mid, x1, x2) < x) lo = mid
      else hi = mid
    }
    return at((lo + hi) / 2, y1, y2)
  }
}
const EASE = bezier(0.22, 1, 0.36, 1) // settles
const CALM = bezier(0.6, 0, 0.3, 1) // camera moves: slow in, slow out
const clamp01 = (x) => Math.min(1, Math.max(0, x))

// the six screens, in the prototype's own states (its tester jumps v1–v6)
const jump = (id) => {
  const j = JUMPS.flatMap(([, items]) => items).find((x) => x[0] === id)
  return { ...INITIAL, ...j[2](INITIAL) }
}
const BEATS = [
  { at: T(0), state: jump('v1'), tone: '' }, // 01 Meet Alex
  { at: T(2300), state: jump('v2'), tone: 'lilac' }, // 02 Conversation
  { at: T(5000), state: jump('v3'), tone: 'lilac' }, // 03 Share faces?
  { at: T(7300), state: jump('v4'), tone: 'lilac' }, // 04 Faces reveal
  { at: T(9300), state: jump('v5'), tone: 'lilac', walk: true }, // 05 Side by Side
  { at: T(11800), state: jump('v6'), tone: 'night' }, // 06 Power down
]

// the finger: press (fade in, 1.1 → 0.9), hold, lift (0.9 → 1.15, fading out)
const TAP_PRESS = 180
const TAP_HOLD = 120
const TAP_LIFT = 300
const TAP_MS = TAP_PRESS + TAP_HOLD + TAP_LIFT

// Camera shots: ease in on `sel`, hold (tap at `tap`), ease back out.
const SHOTS = [
  { sel: '.actions .ui-primary', zoom: 1.7, in: 1050, inDur: 650, tap: 1800, out: 1950, outDur: 750 },
  { sel: '.reveal-later .answer-play', zoom: 1.8, in: 3650, inDur: 600, tap: 4250, out: 4700, outDur: 750, play: true },
  { sel: '.actions .ui-primary', zoom: 1.7, in: 5850, inDur: 650, tap: 6600, out: 6750, outDur: 750 },
  { sel: '.reveal-faces', zoom: 1.3, in: 7400, inDur: 700, out: 8400, outDur: 900 }, // faces arrive, then pull out wide
  { sel: '.actions .ui-primary', zoom: 1.7, in: 10450, inDur: 650, tap: 11200, out: 11350, outDur: 750 },
].map((s) => ({ ...s, in: T(s.in), inDur: T(s.inDur), tap: s.tap && T(s.tap), out: T(s.out), outDur: T(s.outDur) }))
// the camera holds until the finger has lifted
SHOTS.forEach((s) => s.tap && (s.out = Math.max(s.out, s.tap + TAP_MS)))

// the 3D turn as each screen changes: ~1.2s, peaking as the screens swap
const TILT = { before: 450, after: 750, y: 12, x: 3 }
const FADE = 200 // each screen fades out just before the turn's peak, the next fades in just after

/* ---------- React: the phone and its screen layers ---------- */

let setView = () => {}
const noop = () => {}

function Demo() {
  const [view, set] = useState({ loop: 0, tone: '', layers: [] })
  setView = set
  const fit = CAPTURE ? 1 : Math.min(window.innerWidth, window.innerHeight) / 1080
  return (
    <div className="stage" style={{ transform: `scale(${fit})` }}>
      <div className="rig">
        <div className={`phone ${view.tone}`} key={view.loop}>
          <DeviceChrome />
          {view.layers.map(({ key, state }, i) => {
            const Screen = SCREENS[state.screen]
            return (
              <div className={`screen s-${state.screen}`} key={key} data-current={i === view.layers.length - 1 ? '1' : '0'}>
                <Screen s={state} set={noop} />
              </div>
            )
          })}
          <div className="tap" />
        </div>
      </div>
    </div>
  )
}

/* ---------- the timeline ---------- */

const EVENTS = []
BEATS.forEach((b, n) => {
  EVENTS.push({
    at: b.at,
    run: (loop) =>
      setView((v) => ({
        loop,
        tone: b.tone,
        layers: [{ key: `${loop}-${n}`, state: b.state }],
      })),
  })
})
SHOTS.filter((s) => s.play).forEach((s) => EVENTS.push({ at: s.tap, run: () => current(s.sel)?.click() }))
EVENTS.sort((a, b) => a.at - b.at)

const current = (sel) => document.querySelector(`.screen[data-current="1"] ${sel}`)

// CSS animations: each one is paused and set to its age on the demo clock
const born = new WeakMap()
function adopt(now) {
  for (const a of document.getAnimations()) {
    if (!born.has(a)) born.set(a, now)
  }
}
function syncAnimations(now) {
  for (const a of document.getAnimations()) {
    if (!born.has(a)) born.set(a, now)
    a.pause()
    // the prototype's own reveals run 25% slower; the demo's sway keeps its real speed
    const rate = a.animationName?.startsWith('demo-') ? 1 : 1 / SLOW
    a.currentTime = (now - born.get(a)) * rate
  }
}

let loop = -1
let next = 0
let lastAbs = -1

// Moves the demo to absolute time `abs` (ms since start; only forwards).
function seek(abs) {
  if (abs < lastAbs) return
  lastAbs = abs
  const l = Math.floor(abs / TOTAL)
  if (l !== loop) {
    loop = l
    next = 0
    SHOTS.forEach((s) => (s.f = null))
  }
  const start = loop * TOTAL
  const t = abs - start
  while (next < EVENTS.length && EVENTS[next].at <= t) {
    const e = EVENTS[next++]
    window.__clock.advanceTo(start + e.at)
    flushSync(() => e.run(loop))
    adopt(start + e.at)
  }
  window.__clock.advanceTo(abs)
  syncAnimations(abs)
  frame(t)
}

// where `sel` sits on the flat, unzoomed phone: offset from the phone's centre, in phone px
function measure(rig, sel) {
  const el = current(sel)
  if (!el) return null
  const saved = rig.style.transform
  rig.style.transform = 'none'
  const p = rig.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  rig.style.transform = saved
  const k = p.width / 408 // the stage's own fit scale in live mode
  return { x: (r.left + r.width / 2 - p.left) / k - 204, y: (r.top + r.height / 2 - p.top) / k - 440 }
}

function envelope(s, t) {
  if (t < s.in) return 0
  if (t < s.in + s.inDur) return CALM((t - s.in) / s.inDur)
  if (t < s.out) return 1
  if (t < s.out + s.outDur) return 1 - CALM((t - s.out) / s.outDur)
  return 0
}

function frame(t) {
  const rig = document.querySelector('.rig')
  const tap = document.querySelector('.tap')
  if (!rig || !tap) return

  // zoom and pan: at p = 1 the element sits in the middle of the canvas
  let p = 0
  let shot = null
  for (const s of SHOTS) {
    const e = envelope(s, t)
    if (e > 0) {
      p = e
      shot = s
    }
  }
  if (shot && !shot.f) shot.f = measure(rig, shot.sel)
  const f = (shot && shot.f) || { x: 0, y: 0 }
  const z = 1 + p * ((shot ? shot.zoom : 1) - 1)

  // tilt around each screen change: ease up to the turn, settle back flat
  let ry = 0
  let rx = 0
  BEATS.slice(1).forEach((b, n) => {
    const u = (t - (b.at - TILT.before)) / (TILT.before + TILT.after)
    if (u <= 0 || u >= 1) return
    const peak = TILT.before / (TILT.before + TILT.after)
    const amount = u < peak ? CALM(u / peak) : 1 - EASE((u - peak) / (1 - peak))
    ry = (n % 2 ? -1 : 1) * TILT.y * amount
    rx = TILT.x * amount
  })

  // in from the brand blue at the start, back out to it at the end, so the loop has no cut
  const fadeIn = EASE(clamp01(t / T(700)))
  const fadeOut = CALM(clamp01((t - T(14400)) / T(600)))
  const settle = 0.94 + 0.06 * EASE(clamp01(t / T(1100))) - 0.04 * fadeOut
  const S = BASE * z * settle
  rig.style.opacity = String(fadeIn * (1 - fadeOut))
  rig.style.transform = `translate(${-f.x * BASE * z * p}px, ${-f.y * BASE * z * p}px) scale(${S}) rotateY(${ry}deg) rotateX(${rx}deg)`

  // a short dip between screens, hidden by the turn
  const screen = document.querySelector('.screen[data-current="1"]')
  if (screen) {
    const n = BEATS.findLastIndex((b) => b.at <= t)
    const into = n > 0 ? clamp01((t - BEATS[n].at) / FADE) : 1
    const out = BEATS[n + 1] ? clamp01((BEATS[n + 1].at - t) / FADE) : 1
    screen.style.opacity = String(Math.min(into, out))
  }

  // the finger, and the button's pressed state (moves down 2px, slightly darker)
  const tapping = SHOTS.find((s) => s.tap != null && t >= s.tap && t < s.tap + TAP_MS)
  if (tapping && tapping.f) {
    const a = t - tapping.tap
    const press = EASE(clamp01(a / TAP_PRESS))
    const lift = EASE(clamp01((a - TAP_PRESS - TAP_HOLD) / TAP_LIFT))
    tap.style.left = `${201 + tapping.f.x - 23}px`
    tap.style.top = `${437 + tapping.f.y - 23}px`
    tap.style.transform = `scale(${lift > 0 ? 0.9 + 0.25 * lift : 1.1 - 0.2 * press})`
    tap.style.opacity = String(press * (1 - lift))
  } else tap.style.opacity = '0'
  // the tapped element presses in while the finger is down (press and hold)
  SHOTS.forEach((s) => {
    if (!s.tap) return
    const el = current(s.sel)
    if (el) el.style.transform = t >= s.tap && t < s.tap + TAP_PRESS + TAP_HOLD ? 'scale(0.97)' : ''
  })

  walk(t)
}

/* ---------- 05: the two flowers walk along the path ---------- */

// like the landing page's "Meet when it already feels familiar": position and angle from the path itself
let road = null
function walk(t) {
  const n = BEATS.findLastIndex((b) => b.at <= t)
  if (!BEATS[n]?.walk) {
    road = null
    return
  }
  const screen = document.querySelector('.screen[data-current="1"]')
  const box = screen?.querySelector('.plan-walk')
  const svg = box?.querySelector('svg.path')
  const walkers = box?.querySelectorAll('.walker')
  if (!svg || walkers.length < 2) return
  if (!road) {
    // the path's place in the walk box, on the flat phone (layout px)
    const rig = document.querySelector('.rig')
    const saved = rig.style.transform
    rig.style.transform = 'none'
    const k = rig.getBoundingClientRect().width / 408
    const b = box.getBoundingClientRect()
    const s = svg.getBoundingClientRect()
    rig.style.transform = saved
    const vb = Math.min(s.width / 1000, s.height / 200) // viewBox 0 0 1000 200, meet
    road = {
      path: svg.querySelector('path'),
      x0: (s.left - b.left) / k + (s.width / k - 1000 * vb / k) / 2,
      y0: (s.top - b.top) / k + (s.height / k - 200 * vb / k) / 2,
      u: vb / k, // px per path unit
      w: walkers[0].offsetWidth,
    }
    road.len = road.path.getTotalLength()
    road.at = (x) => {
      // the arc length where the path reaches x (the path runs left to right)
      let lo = 0
      let hi = road.len
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2
        if (road.path.getPointAtLength(mid).x < x) lo = mid
        else hi = mid
      }
      return lo
    }
  }
  const u = clamp01((t - BEATS[n].at) / (BEATS[n + 1].at - BEATS[n].at))
  const halfW = road.w / road.u / 2 // half a flower, in path units
  const gap = road.w * 0.85 / road.u // the second walks slightly behind
  const lead = road.at(60 + halfW + gap) + (road.at(940 - halfW) - road.at(60 + halfW + gap)) * (0.08 + 0.84 * u)
  ;[lead, lead - gap].forEach((len, i) => {
    const p = road.path.getPointAtLength(len)
    const q = road.path.getPointAtLength(len + 6)
    const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI
    const step = Math.sin(t / 190 + i * 1.6) // a gentle bob as they walk
    const el = walkers[i]
    el.style.left = `${road.x0 + p.x * road.u - road.w / 2}px`
    el.style.top = `${road.y0 + p.y * road.u - el.offsetHeight + 6}px`
    el.style.bottom = 'auto'
    el.style.transformOrigin = '50% 100%'
    el.style.transform = `rotate(${angle + step * 4}deg) translateY(${-Math.abs(step) * 3}px)`
  })
}

/* ---------- start ---------- */

createRoot(document.getElementById('root')).render(<Demo />)

window.demo = { seek, TOTAL, ready: document.fonts.ready }

if (!CAPTURE) {
  document.fonts.ready.then(() => {
    const t0 = performance.now()
    const tick = () => {
      seek(performance.now() - t0)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}
