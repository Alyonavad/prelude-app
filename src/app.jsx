import { useEffect, useMemo, useRef, useState } from 'react'
import checkCircle from './icons/check-circle.svg'
import windowPhoto from './photos/window.jpg'
import plantsPhoto from './photos/plants.jpg'
import roomPhoto from './photos/room.jpg'

const AUTOSAVE_MS = 600 // inputs autosave this long after the last keystroke (docs/ui-rules.md)
import { COLOURS, flowerSVG, bubbleSVG, MOON, voiceSVG, photoSVG, faceSVG, PATH } from './art.js'
import { YOUR_FLOWER, FERN_FLOWER, REFLECT, TENDENCIES, QOTD, ANON, QUESTIONS, AFTERGLOW, ACTIVITIES } from './data.js'

const STORAGE_KEY = 'prelude-prototype-v3'
// The other person's name on the demo-video screens (docs/screens/video/)
const THEM = 'Alex'
// The phone frame: iPhone 16 Pro, the size the designs in docs/screens/ are drawn at
// (a 402 x 874 screen plus the 3px frame)
const PHONE_W = 408
const PHONE_H = 880
const TOTAL = QUESTIONS.length
const MATCH_DELAY = 6000
const REPLY_DELAY = 2600
const MUTUAL_DELAY = 2400

const FRESH_CONVO = { q: 1, phase: 'read', glow: {}, mine: null }
const FRESH_AFTER = { step: 'self', self: null, again: null }

const INITIAL = {
  screen: 'welcome',
  mode: 'voice', // last choice on the answer screen
  reflect: 0,
  answers: [null, null, null],
  mirror: TENDENCIES.map(() => ({ status: null, text: '' })),
  picks: {},
  matchArrived: false,
  qotdDone: false,
  plumCard: null, // the anonymous answer that turned out to be plum
  status: 'none', // plum's prelude: none | active | plan | met | ended
  convo: FRESH_CONVO,
  area: '',
  plan: { step: 'where', activity: 0 },
  after: FRESH_AFTER,
  // the other person's simulated answers, set in the tester panel
  tester: { open: false, match: 'yes', world: 'yes', faces: 'yes', meet: 'yes', again: 'yes' },
}

const withPlum = (s) => ({ plumCard: s.plumCard || 'a' })
const convoAt = (q, phase, glow = {}) => (s) => ({
  ...withPlum(s),
  screen: 'conversation',
  status: 'active',
  convo: { ...FRESH_CONVO, q, phase, glow },
})

// Tester shortcuts. Each returns a patch applied on top of the current state.
const JUMPS = [
  ['Onboarding', [
    ['welcome', 'Welcome', () => ({ screen: 'welcome' })],
    ['reflect', 'Reflection 1 of 3', () => ({ screen: 'reflect', reflect: 0 })],
    ['reflect3', 'Reflection 3 of 3', () => ({ screen: 'reflect', reflect: 2 })],
    ['mirror', 'Your flower', () => ({ screen: 'mirror' })],
  ]],
  ['Matching', [
    ['matching', 'Mutual matching', () => ({ screen: 'matching', picks: {}, matchArrived: false })],
    ['waiting', 'Waiting', (s) => ({ screen: 'waiting', matchArrived: false, picks: Object.keys(s.picks).length ? s.picks : { a: 'yes' } })],
    ['qotd', 'Question of the day', () => ({ screen: 'qotd' })],
    ['banner', '"Someone is here" banner', (s) => ({ ...withPlum(s), screen: 'waiting', matchArrived: true })],
    ['match', 'Match arrives', (s) => ({ ...withPlum(s), screen: 'match', matchArrived: true })],
  ]],
  ['Home', [
    ['home', 'Home', (s) => ({ ...withPlum(s), screen: 'home', status: s.status === 'none' || s.status === 'ended' ? 'active' : s.status })],
  ]],
  ['The prelude', [
    ['q1', 'Question 1', convoAt(1, 'read')],
    ['answer', 'Answer screen', (s) => ({ ...convoAt(s.convo.q, 'answer', s.convo.glow)(s) })],
    ['reveal', 'Both answers revealed', convoAt(5, 'ready', { world: 'yes' })],
    ['glow4', 'Afterglow: world photos', convoAt(4, 'glow')],
    ['glow8', 'Afterglow: faces', convoAt(8, 'glow', { world: 'yes' })],
    ['faces', 'Faces reveal', convoAt(8, 'facesReveal', { world: 'yes', faces: 'yes' })],
    ['glow12', 'Afterglow: ready to meet', convoAt(12, 'glow', { world: 'yes', faces: 'yes' })],
    ['ending', 'Ending', (s) => ({ ...withPlum(s), screen: 'ending' })],
  ]],
  ['Video (docs/screens/video)', [
    ['v1', '01 Meet Alex', (s) => ({ ...withPlum(s), screen: 'match', matchArrived: true })],
    ['v2', '02 Conversation 1 of 12', (s) => ({ ...withPlum(s), screen: 'conversation', status: 'active', convo: { ...FRESH_CONVO, q: 1, phase: 'ready', mine: { kind: 'text', text: QUESTIONS[0].sample, photos: [] } } })],
    ['v3', '03 Share faces?', convoAt(8, 'glow', { world: 'yes' })],
    ['v4', '04 Faces reveal', convoAt(8, 'facesReveal', { world: 'yes', faces: 'yes' })],
    ['v5', '05 Side by Side', (s) => ({ ...withPlum(s), screen: 'plan', status: 'plan', plan: { step: 'suggest', activity: 0 } })],
    ['v6', '06 Power down', (s) => ({ ...withPlum(s), screen: 'powerdown', status: 'met' })],
  ]],
  ['Meeting', [
    ['where', 'Side by Side: where', (s) => ({ ...withPlum(s), screen: 'plan', status: 'plan', plan: { ...s.plan, step: 'where' } })],
    ['suggest', 'Side by Side: suggestion', (s) => ({ ...withPlum(s), screen: 'plan', status: 'plan', area: s.area || 'riverside', plan: { ...s.plan, step: 'suggest' } })],
    ['powerdown', 'Power down', (s) => ({ ...withPlum(s), screen: 'powerdown', status: 'met' })],
    ['after', 'After the meeting', (s) => ({ ...withPlum(s), screen: 'after', status: 'met', after: FRESH_AFTER })],
  ]],
]
const ALL_JUMPS = JUMPS.flatMap(([, items]) => items)

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && saved.screen) return { ...INITIAL, ...saved, tester: { ...INITIAL.tester, ...saved.tester } }
  } catch {
    // storage unavailable or corrupt: start fresh
  }
  return INITIAL
}

const plumOf = (s) => ANON.find((c) => c.id === s.plumCard) || ANON[0]

// A tendency as the tester left it: confirmed, rewritten, or (if skipped) the original guess.
const tendencyText = (s, i) => (s.mirror[i].status === 'edit' && s.mirror[i].text.trim()) || TENDENCIES[i].text

export default function App() {
  const [s, setS] = useState(load)
  const set = (patch) => setS((p) => ({ ...p, ...(typeof patch === 'function' ? patch(p) : patch) }))
  const scale = useFrameScale()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    } catch {
      // ignore: prototype still works in memory
    }
  }, [s])

  // Simulated mutual match: needs a yes from the tester and a yes from the other side.
  const waiting = s.screen === 'waiting' || s.screen === 'qotd'
  const firstYes = ANON.find((c) => s.picks[c.id] === 'yes')
  const willMatch = waiting && !s.matchArrived && firstYes && s.tester.match === 'yes'
  useEffect(() => {
    if (!willMatch) return
    const t = setTimeout(() => set({ matchArrived: true, plumCard: firstYes.id }), MATCH_DELAY)
    return () => clearTimeout(t)
  }, [willMatch])

  const restart = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setS({ ...INITIAL, tester: { ...INITIAL.tester, open: s.tester.open } })
  }
  const setTester = (patch) => set((p) => ({ tester: { ...p.tester, ...patch } }))

  const Screen = SCREENS[s.screen] || Welcome
  const tone = { conversation: 'lilac', plan: 'lilac', after: 'lilac', powerdown: 'night', ending: 'grey' }[s.screen] || ''
  const key = [s.screen, s.reflect, s.convo.q, s.convo.phase, s.plan.step, s.after.step].join('|')
  const forced = typeof location !== 'undefined' && location.hash === '#tester'

  return (
    <div className="page">
      <div className="slot" style={{ width: PHONE_W * scale, height: PHONE_H * scale }}>
        <div className={`phone ${tone}`} style={{ transform: `scale(${scale})` }}>
          <DeviceChrome />
          {waiting && s.matchArrived && (
            <button className="banner pop" onClick={() => set({ screen: 'match' })}>
              <span>Someone is here.</span>
              <span>→</span>
            </button>
          )}
          <div className={`screen s-${s.screen}`} key={key}>
            <Screen s={s} set={set} />
          </div>
        </div>
      </div>

      <aside className={`tester${forced ? ' forced' : ''}`}>
        <button className="tester-toggle" onClick={() => setTester({ open: !s.tester.open })}>
          tester {s.tester.open ? '×' : '▾'}
        </button>
        {s.tester.open && (
          <div className="tester-body">
            <button onClick={restart}>Restart</button>
            <select
              aria-label="Jump to screen"
              value=""
              onChange={(e) => {
                const j = ALL_JUMPS.find((x) => x[0] === e.target.value)
                if (j) set((p) => j[2](p))
              }}
            >
              <option value="" disabled>
                Jump to screen…
              </option>
              {JUMPS.map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {s.screen === 'conversation' && <button onClick={() => set(skipQuestion)}>Skip this question</button>}
            <b>Plum's answers</b>
            {[
              ['match', 'Matching', ['yes', 'no']],
              ['world', 'Afterglow: world photos', ['yes', 'not yet']],
              ['faces', 'Afterglow: faces', ['yes', 'not yet']],
              ['meet', 'Afterglow: ready to meet', ['yes', 'not yet']],
              ['again', 'Meet again', ['yes', 'not yet']],
            ].map(([k, label, options]) => (
              <label key={k}>
                {label}
                <select value={s.tester[k]} onChange={(e) => setTester({ [k]: e.target.value })}>
                  {options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}

// Shrinks the phone frame to fit short desktop windows.
function useFrameScale() {
  const calc = () => (window.innerWidth < 500 ? 1 : Math.min(1, (window.innerHeight - 52) / (PHONE_H + 6)))
  const [scale, setScale] = useState(calc)
  useEffect(() => {
    const onResize = () => setScale(calc())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}

// Starts at `from` and settles to `to` just after mount, so CSS can animate the change.
function useSettle(from, to, delay = 250) {
  const [v, setV] = useState(from)
  useEffect(() => {
    const t = setTimeout(() => setV(to), delay)
    return () => clearTimeout(t)
  }, [to])
  return v
}

/* ---------- device chrome: status bar, Dynamic Island, home indicator (desktop frame only) ---------- */

function DeviceChrome() {
  return (
    <>
      <div className="device-status" aria-hidden="true">
        <span className="device-time">9:41</span>
        <span className="device-icons">
          <svg viewBox="0 0 18 12" width="18" height="12">
            <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
            <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
            <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
          </svg>
          <svg viewBox="0 0 16 12" width="16" height="12">
            <path d="M8 2.2c2.4 0 4.6.9 6.2 2.4l1.2-1.2C13.4 1.5 10.8.4 8 .4S2.6 1.5.6 3.4l1.2 1.2C3.4 3.1 5.6 2.2 8 2.2zm0 3.4c1.4 0 2.8.5 3.8 1.4L13 5.8C11.7 4.5 9.9 3.8 8 3.8s-3.7.7-5 2l1.2 1.2c1-.9 2.4-1.4 3.8-1.4zm0 3.4c.6 0 1.1.2 1.5.6L8 11.1 6.5 9.6c.4-.4.9-.6 1.5-.6z" fill="currentColor" />
          </svg>
          <svg viewBox="0 0 27 13" width="27" height="13">
            <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity="0.4" />
            <rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" />
            <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity="0.4" />
          </svg>
        </span>
      </div>
      <div className="device-island" aria-hidden="true" />
      <div className="device-home" aria-hidden="true" />
    </>
  )
}

/* ---------- stickers ---------- */

function Sticker({ html, className = '', style, ...rest }) {
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} {...rest} />
}

function Flower({ spec = YOUR_FLOWER, fold = 0, eyes = 0, look = 0, size, className = '', style }) {
  const html = useMemo(() => flowerSVG(spec), [spec])
  return (
    <Sticker
      html={html}
      className={`flower ${className}`}
      style={{ width: size, '--fold': fold, '--eyes': eyes, '--look': look, ...style }}
      aria-hidden="true"
    />
  )
}

function Bubble({ text = '', flip, className = '', style }) {
  return <Sticker html={bubbleSVG(text)} className={`bubble ${flip ? 'flip ' : ''}${className}`} style={style} aria-hidden="true" />
}

function Photo({ kind, className = '', style }) {
  const html = useMemo(() => photoSVG(kind), [kind])
  return <Sticker html={html} className={`photo fixed ${className}`} style={style} aria-hidden="true" />
}

function Face({ who, className = '', style }) {
  const html = useMemo(
    () => faceSVG(who === 'plum' ? { bg: COLOURS.butter, hair: COLOURS.pink, style: 'bob', top: COLOURS.mint } : { bg: COLOURS.mint, hair: '#05060f', style: 'short', top: COLOURS.butter }),
    [who],
  )
  return <Sticker html={html} className={className} style={style} aria-hidden="true" />
}

// The landing page voice note. Tap to "listen": the bars move.
function Voice({ fill, playing, onToggle, style, label = 'listen' }) {
  const [own, setOwn] = useState(false)
  const html = useMemo(() => voiceSVG(fill), [fill])
  const on = playing ?? own
  return (
    <button
      className={`voice${on ? ' playing' : ''}`}
      style={style}
      aria-label={on ? 'pause' : label}
      onClick={() => (onToggle ? onToggle() : setOwn((v) => !v))}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function Progress({ value }) {
  return (
    <div className="progress">
      <i style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}

const fmt = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

/* ---------- the answer screen, used everywhere (design: docs/screens/group-1) ---------- */

const sentence = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const VOICE_BARS = [14, 26, 18, 34, 22, 12, 30, 20, 36, 16, 26, 12, 20, 30, 16, 24, 34, 18, 24, 14]

// A recorded voice note as content: a straight white bar with an interactive play button.
function VoiceNote({ length, playing, onToggle }) {
  return (
    <div className={`ui-voice${playing ? ' playing' : ''}`}>
      <button className="ui-play" aria-label={playing ? 'Pause' : 'Play'} onClick={onToggle}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          {playing ? <path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="#fff" /> : <path d="M7 4.5v11l9-5.5z" fill="#fff" />}
        </svg>
      </button>
      <svg className="ui-voice-bars" viewBox={`0 0 ${VOICE_BARS.length * 8} 40`} preserveAspectRatio="none" aria-hidden="true">
        {VOICE_BARS.map((h, i) => (
          <rect key={i} className="bar" style={{ '--i': i }} x={i * 8 + 2} y={20 - h / 2} width="4" height={h} rx="2" fill="#05060f" />
        ))}
      </svg>
      <span className="ui-voice-time">{length}</span>
    </div>
  )
}

const MicIcon = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <rect x="11.5" y="4" width="9" height="15" rx="4.5" fill="#fff" />
    <path d="M7.5 15.5a8.5 8.5 0 0 0 17 0M16 24v4.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
)
const StopIcon = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <rect x="9" y="9" width="14" height="14" rx="2.5" fill="#ff1f1f" />
  </svg>
)
const TrashIcon = ({ colour = '#fff' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4.5 6.5h15M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7M6.5 6.5l.8 12.2c.1.9.8 1.6 1.7 1.6h6c.9 0 1.6-.7 1.7-1.6l.8-12.2M10.3 10.5v6M13.7 10.5v6" fill="none" stroke={colour} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="#05060f" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)
const ArrowUpIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 19V5.5M6 11.5l6-6 6 6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// "A piece of your world": the prototype's sample photos stand in for the camera and the library.
const SAMPLE_PHOTOS = { window: windowPhoto, plants: plantsPhoto, room: roomPhoto }
const PHOTO_KEYS = Object.keys(SAMPLE_PHOTOS)
const MAX_PHOTOS = 6
// answers saved before photos were a list had one illustrated photo
const photosOf = (a) => (a.photos || (a.photo ? [a.photo === 'plant' ? 'plants' : a.photo] : [])).filter((k) => SAMPLE_PHOTOS[k])

// Photos as content: straight, no halo, thin black outline. `onRemove` adds a × to each.
function PhotoThumbs({ photos, small, onRemove }) {
  if (!photos.length) return null
  return (
    <div className={`ui-thumbs${small ? ' small' : ''}`}>
      {photos.map((key, n) => (
        <div className="ui-thumb" key={`${n}-${key}`}>
          <img src={SAMPLE_PHOTOS[key]} alt={`Photo: ${key}`} />
          {onRemove && (
            <button className="ui-remove" aria-label={`Remove photo ${n + 1}`} onClick={() => onRemove(n)}>
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// Prototype stand-in for the iOS photo picker: an action sheet, then a library grid.
function PhotoPicker({ room, onAdd, onClose }) {
  const [step, setStep] = useState('menu') // menu | library
  const [chosen, setChosen] = useState([])
  const toggle = (key) =>
    setChosen((c) => (c.includes(key) ? c.filter((k) => k !== key) : c.length < room ? [...c, key] : c))
  return (
    <div className="ui-scrim" onClick={onClose}>
      {step === 'menu' ? (
        <div className="ui-sheet" role="dialog" aria-label="Add a photo" onClick={(e) => e.stopPropagation()}>
          <div className="ui-list">
            <button onClick={() => onAdd([PHOTO_KEYS[Math.floor(Math.random() * PHOTO_KEYS.length)]])}>Take photo</button>
            <button onClick={() => setStep('library')}>Choose from library</button>
          </div>
          <button className="ui-sheet-cancel" onClick={onClose}>Cancel</button>
        </div>
      ) : (
        <div className="ui-library" role="dialog" aria-label="Choose from library" onClick={(e) => e.stopPropagation()}>
          <div className="ui-library-head">
            <button className="ui-link" onClick={onClose}>Cancel</button>
            <p className="ui-caption">{room === 1 ? 'You can add 1 more' : `Choose up to ${room}`}</p>
          </div>
          <div className="ui-grid">
            {PHOTO_KEYS.map((key) => (
              <button key={key} className="ui-pick" aria-label={`Photo: ${key}`} aria-pressed={chosen.includes(key)} onClick={() => toggle(key)}>
                <img src={SAMPLE_PHOTOS[key]} alt="" />
                {chosen.includes(key) && (
                  <span className="ui-pick-check" aria-hidden="true">
                    <svg viewBox="0 0 16 16">
                      <path d="M4 8.4 6.8 11.1 12 5.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
          <button className="ui-primary" disabled={!chosen.length} onClick={() => onAdd(chosen)}>
            Add
          </button>
        </div>
      )}
    </div>
  )
}

// `head` goes above the question card (the reflective questions put their progress and flower there).
function Answer({ s, set, head, label, question, sample, sendLabel = 'send', onSend }) {
  const mode = s.mode
  const [rec, setRec] = useState('idle') // idle | recording | done
  const [secs, setSecs] = useState(0)
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [picker, setPicker] = useState(false)
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    if (rec !== 'recording') return
    const t = setInterval(() => setSecs((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [rec])

  // "Send" is the save here, so the text box shows no autosave check (docs/ui-rules.md)
  const canSend = mode === 'voice' ? rec === 'done' : text.trim().length > 0
  const send = () => onSend({ kind: mode, text: mode === 'voice' ? sample : text.trim(), photos })
  const discard = () => {
    setRec('idle')
    setListening(false)
    setSecs(0)
  }

  return (
    <>
      {head}
      {label && <p className="ui-caption rise">{sentence(label)}</p>}
      <div className="content-card white answer-question rise" style={{ '--d': '60ms' }}>
        <p className="content-text">{question}</p>
      </div>

      <div className="ui-segmented answer-toggle rise" role="group" aria-label="Answer by" style={{ '--d': '120ms' }}>
        {['voice', 'writing'].map((m) => (
          <button key={m} aria-pressed={mode === m} onClick={() => set({ mode: m })}>
            {sentence(m)}
          </button>
        ))}
      </div>

      <div className="answer-input">
        {mode === 'voice' ? (
          rec === 'done' ? (
            <div className="answer-recorded">
              <VoiceNote playing={listening} onToggle={() => setListening((l) => !l)} length={fmt(Math.max(secs, 1))} />
              <button className="ui-delete" aria-label="Delete recording" onClick={discard}>
                <TrashIcon />
              </button>
            </div>
          ) : (
            <>
              <button
                className={`ui-record${rec === 'recording' ? ' on' : ''}`}
                aria-label={rec === 'recording' ? 'Stop recording' : 'Record'}
                onClick={() => (rec === 'recording' ? setRec('done') : (setSecs(0), setRec('recording')))}
              >
                {rec === 'recording' ? <StopIcon /> : <MicIcon />}
              </button>
              <p className="ui-caption" aria-live="polite">
                {rec === 'recording' ? fmt(secs) : 'Tap to record. Take your time.'}
              </p>
            </>
          )
        ) : (
          <textarea
            className="ui-input ui-textarea"
            aria-label="Your answer"
            placeholder="Write as much or as little as you like."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}
      </div>

      <div className="world">
        <p className="ui-caption world-caption">A piece of your world. Things, places, views. Not faces yet.</p>
        <div className="ui-photo-row">
          {photos.length < MAX_PHOTOS && (
            <button className="ui-add-tile" aria-label="Add a photo" onClick={() => setPicker(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="#05060f" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <PhotoThumbs photos={photos} onRemove={(n) => setPhotos((p) => p.filter((_, i) => i !== n))} />
        </div>
        {photos.length >= MAX_PHOTOS && <p className="ui-caption">That's plenty for one answer.</p>}
      </div>
      {picker && (
        <PhotoPicker
          room={MAX_PHOTOS - photos.length}
          onClose={() => setPicker(false)}
          onAdd={(keys) => {
            setPhotos((p) => [...p, ...keys].slice(0, MAX_PHOTOS))
            setPicker(false)
          }}
        />
      )}

      <div className="actions answer-actions">
        <button className="ui-primary" disabled={!canSend} onClick={send}>{sentence(sendLabel)}</button>
      </div>
    </>
  )
}

// An answer the tester gave, shown as a white note.
function Mine({ answer, fallback, r = 1 }) {
  const a = answer || { kind: 'voice', text: fallback }
  return (
    <div className="note pop" style={{ '--r': `${r}deg` }}>
      <div className="who">
        <Flower size={40} />
        <span className="small">you</span>
      </div>
      {a.kind === 'voice' && <Voice fill="#e6e9f0" style={{ '--w': '170px', margin: '6px 0 4px' }} />}
      <p className="body" style={{ marginTop: 6 }}>{a.text}</p>
      <PhotoThumbs photos={photosOf(a)} small />
    </div>
  )
}

/* ---------- 1. welcome ---------- */

// The four tags around the headline: position in % of the screen width / px below the headline,
// resting tilt, the side each one slides in from (dx) and when it arrives in the entrance sequence.
// Final positions from docs/screens/group-1/welcome-final.png.
const WELCOME_TAGS = [
  { text: 'no profiles', colour: 'lilac', x: '12.2%', y: 63, r: 3, dx: -40, d: 1200 },
  { text: 'in your own time', colour: 'pink', x: '64.2%', y: 64, r: -3, dx: 40, d: 1200 },
  { text: 'side by side', colour: 'mint', x: '11.9%', y: 402, r: 2, dx: -40, d: 1500 },
  { text: 'only a mutual yes', colour: 'butter', x: '57%', y: 406, r: -3, dx: 40, d: 1500 },
]

// Plays its entrance once each time the screen opens (CSS animations run on mount, not on re-render).
function Welcome({ set }) {
  return (
    <>
      <div className="welcome-hero">
        <h1 className="ui-title welcome-title w-head">NO<br />SMALL<br />TALK. NO<br />SHOW.</h1>
        <div className="welcome-flower w-flower" aria-hidden="true">
          <div className="w-sway">
            <Flower />
          </div>
        </div>
        {WELCOME_TAGS.map((t) => (
          <span
            key={t.text}
            className={`tag ${t.colour} welcome-tag w-tag`}
            aria-hidden="true"
            style={{ left: t.x, top: t.y, '--r': `${t.r}deg`, '--dx': `${t.dx}px`, '--d': `${t.d}ms` }}
          >
            {t.text}
          </span>
        ))}
      </div>
      <p className="content-text center welcome-line w-line">
        say it how it is. your answers only reach people who think like you.
      </p>
      <div className="actions">
        <button className="ui-primary w-fade" style={{ '--d': '2600ms' }} onClick={() => set({ screen: 'reflect', reflect: 0 })}>
          Start quietly
        </button>
      </div>
    </>
  )
}

/* ---------- 2. reflective questions: a Telegram-style composer (docs/screens/group-1/composer-*.png) ---------- */

const foldAfter = (answered) => Math.max(0, 1 - answered * 0.3)
// The small open flower of composer-idle.png (64pt on reflection 1); it opens further and grows a
// little on reflections 2 and 3
const REFLECT_FOLDS = [0.45, 0.3, 0.15]
const FLOWER_BOX = 91
// how much of its box the flower fills at a given fold (measured: 42% as a bud, 65% at fold 0.4)
const flowerVisible = (fold) => 0.794 - 0.37 * fold
const FIELD_LINE = 22 // the composer's text line height
const FIELD_MAX_LINES = 5

function Reflect({ s, set }) {
  const i = s.reflect
  const last = i === REFLECT.length - 1
  // the flower opens a little with each answer already given
  const fold = useSettle(REFLECT_FOLDS[Math.max(0, i - 1)], REFLECT_FOLDS[i])
  return (
    <Composer
      head={
        <>
          <div className="reflect-head">
            <p className="ui-caption">Reflection {i + 1} of {REFLECT.length}</p>
            <div className="reflect-steps" aria-hidden="true">
              {REFLECT.map((_, n) => (
                <i key={n} className={n === i ? 'on' : ''} />
              ))}
            </div>
          </div>
          <FlowerSlot fold={fold} />
        </>
      }
      question={REFLECT[i].q}
      sample={REFLECT[i].sample}
      sendLabel={last ? 'Send' : 'Send & next question'}
      onSend={(a) =>
        set((p) => ({
          answers: p.answers.map((x, n) => (n === i ? a : x)),
          ...(last ? { screen: 'mirror' } : { reflect: i + 1 }),
        }))
      }
    />
  )
}

// The small flower sticker above a hero question. Its visible bottom-left corner stays on the slot's,
// so as it opens it grows up and to the right, into empty space, and nothing else on the screen moves.
function FlowerSlot({ fold }) {
  const offset = (FLOWER_BOX * (1 - flowerVisible(fold))) / 2
  return (
    <div className="reflect-flower" aria-hidden="true">
      <div className="reflect-flower-box" style={{ width: FLOWER_BOX, transform: `translate(${-offset}px, ${offset}px)` }}>
        <Flower fold={fold} size={FLOWER_BOX} />
      </div>
    </div>
  )
}

// The question as the hero, and a composer pinned to the bottom: "+" (photos), a text field that
// grows up to five lines, and one round button that is the mic, the stop or the send.
// Text and voice are one or the other. Send is the save, so there is no autosave check here.
function Composer({ head, question, sample, sendLabel, onSend, note = 'Just for you. No one is waiting.' }) {
  const [rec, setRec] = useState('idle') // idle | recording | done
  const [secs, setSecs] = useState(0)
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [lines, setLines] = useState(1)
  const [photos, setPhotos] = useState([])
  const [picker, setPicker] = useState(false)
  const photoRow = useRef(null)

  // the photo row always shows its start, so the first photo is never clipped
  useEffect(() => {
    if (photoRow.current) photoRow.current.scrollLeft = 0
  }, [photos.length])

  useEffect(() => {
    if (rec !== 'recording') return
    const t = setInterval(() => setSecs((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [rec])

  // the field grows upward with its text, up to five lines, then scrolls inside
  const grow = (el) => {
    el.style.height = 'auto'
    const inner = Math.min(el.scrollHeight, FIELD_LINE * FIELD_MAX_LINES + 25)
    el.style.height = `${inner + 5}px`
    el.style.overflowY = el.scrollHeight > inner ? 'auto' : 'hidden'
    setLines(Math.max(1, Math.round((inner - 25) / FIELD_LINE)))
  }
  const discard = () => {
    setRec('idle')
    setListening(false)
    setSecs(0)
  }
  const hasText = text.trim().length > 0
  const canSend = hasText || rec === 'done'
  const send = () => onSend({ kind: rec === 'done' ? 'voice' : 'text', text: rec === 'done' ? sample : text.trim(), photos })
  // the question steps down a size when the composer grows, so the two never meet
  const compact = photos.length > 0 || lines > 1

  return (
    <>
      {head}
      <h1 className={`ui-title reflect-question${compact ? ' compact' : ''}`}>{question}</h1>
      <p className="ui-caption reflect-note">{note}</p>

      <div className="composer-wrap">
        {photos.length > 0 && (
          <div className="composer-photos" ref={photoRow}>
            <PhotoThumbs photos={photos} onRemove={(n) => setPhotos((p) => p.filter((_, k) => k !== n))} />
          </div>
        )}
        <div className="composer">
          {rec === 'done' ? (
            <button className="composer-side" aria-label="Delete recording" onClick={discard}>
              <TrashIcon colour="#05060f" />
            </button>
          ) : rec === 'idle' ? (
            <button className="composer-side" aria-label="Add a photo" disabled={photos.length >= MAX_PHOTOS} onClick={() => setPicker(true)}>
              <PlusIcon />
            </button>
          ) : null}

          {rec === 'recording' ? (
            <div className="composer-field composer-recording" role="status">
              <span className="composer-dot" aria-hidden="true" />
              <span className="composer-timer">{fmt(secs)}</span>
              <button className="ui-link composer-cancel" onClick={discard}>Cancel</button>
            </div>
          ) : rec === 'done' ? (
            <div className={`composer-field composer-voice${listening ? ' playing' : ''}`}>
              <button className="composer-play" aria-label={listening ? 'Pause' : 'Play'} onClick={() => setListening((l) => !l)}>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  {listening ? <path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="#fff" /> : <path d="M7 4.5v11l9-5.5z" fill="#fff" />}
                </svg>
              </button>
              <svg className="composer-bars" viewBox={`0 0 ${VOICE_BARS.length * 8} 40`} preserveAspectRatio="none" aria-hidden="true">
                {VOICE_BARS.map((h, n) => (
                  <rect key={n} className="bar" style={{ '--i': n }} x={n * 8 + 2} y={20 - h / 2} width="3.5" height={h} rx="1.75" fill="#05060f" />
                ))}
              </svg>
              <span className="composer-time">{fmt(Math.max(secs, 1))}</span>
            </div>
          ) : (
            <textarea
              className="composer-field composer-input"
              rows={1}
              aria-label="Your answer"
              placeholder="Write, or tap the mic…"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                grow(e.target)
              }}
            />
          )}

          {rec === 'recording' ? (
            <button className="composer-main stop" aria-label="Stop recording" onClick={() => setRec('done')}>
              <StopIcon />
            </button>
          ) : canSend ? (
            <button className="composer-main" aria-label={sendLabel} onClick={send}>
              <ArrowUpIcon />
            </button>
          ) : (
            <button className="composer-main" aria-label="Record" onClick={() => (setSecs(0), setRec('recording'))}>
              <MicIcon />
            </button>
          )}
        </div>
      </div>

      {picker && (
        <PhotoPicker
          room={MAX_PHOTOS - photos.length}
          onClose={() => setPicker(false)}
          onAdd={(keys) => {
            setPhotos((p) => [...p, ...keys].slice(0, MAX_PHOTOS))
            setPicker(false)
          }}
        />
      )}
    </>
  )
}

/* ---------- 4. your flower ---------- */

function Mirror({ s, set }) {
  const update = (i, patch) => set((p) => ({ mirror: p.mirror.map((m, n) => (n === i ? { ...m, ...patch } : m)) }))
  const fold = useSettle(foldAfter(2), 0)
  const timers = useRef({}) // autosave debounce, one per card
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const hasWords = (m) => m.saved && m.text.trim()
  // a card counts once it is "Yes", or "Not quite" with the person's own words saved
  const answered = (m) => m.status === 'yes' || (m.status === 'edit' && hasWords(m))
  const done = s.mirror.every(answered)

  // typing makes the text unsaved; it saves itself AUTOSAVE_MS after the last keystroke
  const type = (i, text) => {
    clearTimeout(timers.current[i])
    update(i, { text, saved: false, open: true })
    if (text.trim()) timers.current[i] = setTimeout(() => update(i, { saved: true }), AUTOSAVE_MS)
  }
  // leaving the input (or Enter): with text, save and close it; empty, it stays open and unanswered
  const leave = (i, text) => {
    clearTimeout(timers.current[i])
    if (text.trim()) update(i, { saved: true, open: false })
  }

  // Follows docs/ui-rules.md: the flower is the only sticker; tendencies are straight content
  // cards; yes / not quite are choice pills; inputs autosave; one primary button at the bottom.
  return (
    <>
      <h1 className="ui-title rise">HERE'S WHAT WE NOTICED.</h1>
      <div className="sway mirror-flower">
        <Flower fold={fold} />
      </div>
      <div className="portrait-cards">
        {TENDENCIES.map((t, i) => {
          const m = s.mirror[i]
          // "Not quite" shows the input until there are saved words, or after "Edit"
          const editing = m.status === 'edit' && (m.open || !hasWords(m))
          const ownWords = m.status === 'edit' && !editing
          return (
            <div className={`content-card ${t.colour} rise`} key={i} style={{ '--d': `${500 + i * 120}ms` }}>
              {ownWords ? (
                <div>
                  <p className="ui-caption">In your words</p>
                  <p className="content-text">{m.text.trim()}</p>
                </div>
              ) : (
                <p className="content-text">{t.text}</p>
              )}
              {editing && (
                <div className="ui-field">
                  <input
                    className="ui-input"
                    type="text"
                    enterKeyHint="done"
                    aria-label={`What would you say instead of: ${t.text}`}
                    placeholder="What would you say instead?"
                    autoFocus
                    value={m.text}
                    onFocus={(e) => {
                      const end = e.target.value.length
                      e.target.setSelectionRange(end, end)
                    }}
                    onChange={(e) => type(i, e.target.value)}
                    onBlur={(e) => leave(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                  />
                  {hasWords(m) && <img className="ui-saved" src={checkCircle} alt="" aria-hidden="true" />}
                  <span className="sr-only" aria-live="polite">
                    {hasWords(m) ? 'Saved' : ''}
                  </span>
                </div>
              )}
              <div className="choices">
                {ownWords && (
                  <button className="ui-link" onClick={() => update(i, { open: true })}>
                    Edit
                  </button>
                )}
                {[
                  ['yes', 'Yes'],
                  ['edit', 'Not quite'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className="ui-choice"
                    aria-pressed={m.status === value}
                    // "Not quite" opens the input unless there are saved words to show
                    onClick={() => update(i, value === 'edit' ? { status: value, open: !hasWords(m) } : { status: value })}
                  >
                    {m.status === value && <span className="ui-check" aria-hidden="true">✓</span>}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="ui-caption ui-hint">These are guesses. You can change them anytime.</p>
      <div className="actions">
        <button className="ui-primary" disabled={!done} onClick={() => set({ screen: 'matching', picks: {}, matchArrived: false })}>
          Find your people
        </button>
      </div>
    </>
  )
}

/* ---------- 5. mutual matching ---------- */

const VOICE_LENGTHS = { a: '0:14', b: '0:21', c: '0:17', d: '0:19' }

// A small flower as an avatar: illustrative (tilted, with its halo), never tappable.
function FlowerAvatar({ spec = YOUR_FLOWER, size = 40, r = -6 }) {
  return (
    <span className="flower-avatar" style={{ width: size, height: size, '--r': `${r}deg` }} aria-hidden="true">
      <Flower spec={spec} size={Math.round(size * 1.46)} fold={0.3} />
    </span>
  )
}

// A voice note inside an answer card: content, with an interactive play button.
function InlineVoice({ length, tone }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className={`answer-voice${tone ? ` ${tone}` : ''}${playing ? ' playing' : ''}`}>
      <button className="answer-play" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          {playing ? <path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="#fff" /> : <path d="M7 4.5v11l9-5.5z" fill="#fff" />}
        </svg>
      </button>
      <svg className="answer-voice-bars" viewBox={`0 0 ${VOICE_BARS.length * 8} 40`} preserveAspectRatio="none" aria-hidden="true">
        {VOICE_BARS.map((h, n) => (
          <rect key={n} className="bar" style={{ '--i': n }} x={n * 8 + 2} y={20 - h / 2} width="3.5" height={h} rx="1.75" fill="#05060f" />
        ))}
      </svg>
      <span className="answer-voice-time">{length}</span>
    </div>
  )
}

// An answer as content: a straight card (white or a conversation colour) with who wrote it,
// the question small on top, then the voice note, the text and the photos. `children` go last
// (choice pills, for example).
function AnswerCard({ colour = 'white', avatar, name, label, question, voice, voiceTone, text, textCase, photos = [], locked, className = '', style, children }) {
  return (
    <div className={`content-card ${colour} answer-card${locked ? ' locked' : ''} ${className}`} style={style}>
      {label && <p className="answer-label">{label}</p>}
      {(avatar || name) && (
        <div className="answer-who">
          {avatar && <FlowerAvatar spec={avatar} />}
          {name && <span className="ui-caption">{name}</span>}
        </div>
      )}
      {question && <p className="ui-caption answer-q">{question}</p>}
      {locked ? (
        <p className="content-text">{locked}</p>
      ) : (
        <>
          {voice && <InlineVoice length={voice} tone={voiceTone} />}
          {text && <p className={textCase === 'sentence' ? 'answer-text' : 'content-text'}>{text}</p>}
          <PhotoThumbs photos={photos} small />
        </>
      )}
      {children}
    </div>
  )
}

function Matching({ s, set }) {
  // tapping the chosen pill again takes the choice back (what "undo" did)
  const pick = (id, v) => set((p) => ({ picks: { ...p.picks, [id]: p.picks[id] === v ? undefined : v } }))
  const allDone = ANON.every((c) => s.picks[c.id])

  return (
    <>
      <h1 className="page-title rise">SOMEONE MIGHT FEEL FAMILIAR.</h1>
      <p className="ui-caption page-note rise">No names, no photos. Just how they answer.</p>

      <div className="portrait-cards page-cards">
        {ANON.map((c, i) => (
          <AnswerCard
            key={c.id}
            className="rise"
            style={{ '--d': `${120 + i * 80}ms` }}
            avatar={c.flower}
            question={sentence(REFLECT[c.reflect].q)}
            voice={VOICE_LENGTHS[c.id]}
            text={c.transcript}
          >
            <div className="choices">
              {[
                ['yes', "I'd like to hear more"],
                ['no', 'Not this one'],
              ].map(([value, label]) => (
                <button key={value} className="ui-choice" aria-pressed={s.picks[c.id] === value} onClick={() => pick(c.id, value)}>
                  {s.picks[c.id] === value && <span className="ui-check" aria-hidden="true">✓</span>}
                  {label}
                </button>
              ))}
            </div>
          </AnswerCard>
        ))}
      </div>
      <p className="ui-caption ui-hint">Only you know what you chose.</p>

      <div className="actions pinned">
        <button className="ui-primary" disabled={!allDone} onClick={() => set({ screen: 'waiting' })}>Done</button>
      </div>
    </>
  )
}

/* ---------- 6. waiting ---------- */

function Waiting({ s, set }) {
  const saidYes = ANON.some((c) => s.picks[c.id] === 'yes')
  return (
    <>
      <div className="waiting-hero">
        <div className="waiting-art" aria-hidden="true">
          <div className="sway">
            <Flower size={132} className="pop" />
          </div>
          <Sticker html={MOON} className="pop waiting-moon" style={{ '--d': '300ms' }} />
        </div>
        <h1 className="ui-title rise">NO RUSH.</h1>
        <p className="ui-caption rise" style={{ '--d': '100ms' }}>
          {saidYes ? "We'll let you know when it's mutual." : 'Nothing mutual yet. New answers arrive tomorrow.'}
        </p>
        <p className="ui-caption rise" style={{ '--d': '160ms' }}>A no is never shown to anyone. Theirs or yours.</p>
        {!saidYes && (
          <button className="ui-secondary rise" onClick={() => set({ screen: 'matching', picks: {} })}>Hear more answers</button>
        )}
      </div>

      <div className="content-card white qotd-card rise" style={{ '--d': '260ms' }}>
        <p className="ui-caption">While you wait · optional</p>
        {s.qotdDone ? (
          <p className="content-text">Kept. Just for you.</p>
        ) : (
          <>
            <p className="content-text">{QOTD.q}</p>
            <div className="choices">
              <button className="ui-secondary" onClick={() => set({ screen: 'qotd' })}>Answer it</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// The question of the day: the reflections' hero question and composer, with a way back.
function Qotd({ set }) {
  return (
    <Composer
      head={
        <>
          <div className="page-bar">
            <button className="ui-icon-button" aria-label="Back" onClick={() => set({ screen: 'waiting' })}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5.5 8.5 12l6.5 6.5" fill="none" stroke="#05060f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className="ui-caption">Question of the day</p>
            <span />
          </div>
          <FlowerSlot fold={REFLECT_FOLDS[0]} />
        </>
      }
      question={QOTD.q}
      sample={QOTD.sample}
      sendLabel="Keep it"
      onSend={() => set({ screen: 'waiting', qotdDone: true })}
    />
  )
}

/* ---------- 7. match arrives ---------- */

// Two flowers and, when they've spoken, their bubbles. They turn to each other when `turned`.
function Pair({ theirs, left, right, turned, eyes = 0 }) {
  return (
    <div className="stage pair" aria-hidden="true">
      <Flower className={`st flower-left${turned ? ' turned' : ''}`} eyes={eyes} style={{ '--x': '5%', '--y': '31%', '--w': '42%' }} />
      <Flower spec={theirs} className={`st flower-right${turned ? ' turned' : ''}`} eyes={eyes} style={{ '--x': '53%', '--y': '31%', '--w': '42%' }} />
      {left && <Bubble text={left} className="st pop" style={{ '--x': '21%', '--y': '0%', '--w': '21%', '--r': '-6deg' }} />}
      {right && <Bubble text={right} flip className="st pop" style={{ '--x': '58%', '--y': '0%', '--w': '21%', '--r': '6deg', '--d': '250ms' }} />}
    </div>
  )
}

function Match({ s, set }) {
  const begin = () =>
    set((p) => ({
      screen: 'home',
      ...(p.status === 'active' ? {} : { status: 'active', convo: FRESH_CONVO, plan: { step: 'where', activity: 0 }, after: FRESH_AFTER }),
    }))

  // docs/screens/video/01-meet-alex.png
  return (
    <>
      <p className="ui-caption video-kicker rise">A match. You both said yes.</p>
      <div className="video-flower pop" aria-hidden="true" style={{ '--d': '150ms' }}>
        <div className="sway">
          <Flower size={127} />
        </div>
      </div>
      <h1 className="video-title meet-title rise" style={{ '--d': '250ms' }}>SOMEONE IS HERE. MEET {THEM.toUpperCase()}.</h1>
      <p className="video-label rise" style={{ '--d': '350ms' }}>Why you resonated</p>
      <div className="video-cards">
        <div className="content-card lilac rise" style={{ '--d': '450ms' }}>
          <p className="video-card-text">You both open up when your hands are busy</p>
        </div>
        <div className="content-card mint rise" style={{ '--d': '550ms' }}>
          <p className="video-card-text">You both need one person, not a crowd</p>
        </div>
      </div>
      <div className="actions pinned">
        <button className="ui-primary" onClick={begin}>Begin your prelude</button>
      </div>
    </>
  )
}

// Plum's answer card: the lilac tag, used as a card.
function Theirs({ plum, text, photo, face, locked, r = -1 }) {
  return (
    <div className="tag card lilac pop" style={{ '--r': `${r}deg` }}>
      <div className="who">
        <Flower spec={plum.flower} size={44} fold={locked ? 0.6 : 0} />
        {face && <Face who="plum" className="avatar" />}
        <span className="small" style={{ textTransform: 'uppercase' }}>plum</span>
      </div>
      {locked ? (
        <p className="body" style={{ marginTop: 8 }}>{locked}</p>
      ) : (
        <>
          <Voice fill="#fff" style={{ '--w': '190px', margin: '8px 0' }} />
          <p className="body">{text}</p>
          {photo && <Photo kind={photo} style={{ '--w': '120px', '--r': '4deg', margin: '10px 0 0 auto' }} />}
        </>
      )}
    </div>
  )
}

// The conversation header (docs/screens/video/02–05): "‹ Home" · their name · "N of 12".
function ConvoHeader({ count, onHome }) {
  return (
    <div className="convo-header">
      <button className="convo-home" onClick={onHome}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 6 8.5 12l6 6" fill="none" stroke="#05060f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Home
      </button>
      <strong className="convo-name">{THEM}</strong>
      <span className="convo-count">{count}</span>
    </div>
  )
}

// A face as an illustrated placeholder (no photos of real people), cropped to fill a frame.
function FaceArt({ who }) {
  const html = useMemo(
    () =>
      faceSVG(who === 'them' ? { bg: COLOURS.butter, hair: COLOURS.pink, style: 'bob', top: COLOURS.mint } : { bg: COLOURS.mint, hair: '#05060f', style: 'short', top: COLOURS.butter }).replace(
        'viewBox="-6 -6 112 122"',
        'viewBox="9.3 9.3 81.4 81.4" preserveAspectRatio="xMidYMid slice"',
      ),
    [who],
  )
  return <span className="face-art" dangerouslySetInnerHTML={{ __html: html }} />
}

/* ---------- 8. home ---------- */

function Home({ s, set }) {
  const [fern, setFern] = useState(false)
  const plum = plumOf(s)
  const { q, phase } = s.convo
  const card = {
    active: { text: `question ${q} of ${TOTAL} · ${phase === 'sent' ? "plum's turn" : 'your turn'}`, to: { screen: 'conversation' } },
    plan: { text: 'side by side · making a plan', to: { screen: 'plan' } },
    met: { text: 'you met side by side', to: s.after.step === 'done' ? null : { screen: 'after' } },
  }[s.status]

  return (
    <>
      <div className="row between rise">
        <span className="wordmark">PRELUDE</span>
        <Flower size={56} />
      </div>
      <h1 className="display m rise" style={{ margin: '18px 0 20px', '--d': '60ms' }}>YOUR PRELUDES</h1>

      <div className="stack">
        {card && (
          <button className="tag card lilac prelude-card pop" style={{ '--r': '-1.5deg', '--d': '120ms' }} onClick={() => card.to && set(card.to)}>
            <Flower spec={plum.flower} size={70} />
            <span className="grow">
              <span className="name">Plum</span>
              <span className="small" style={{ display: 'block', marginTop: 4 }}>{card.text}</span>
              {s.status === 'active' && <Progress value={q / TOTAL} />}
            </span>
          </button>
        )}

        <button className="tag card mint prelude-card pop" style={{ '--r': '1deg', '--d': '220ms' }} onClick={() => setFern(true)}>
          <Flower spec={FERN_FLOWER} size={70} />
          <span className="grow">
            <span className="name">Fern</span>
            <span className="small" style={{ display: 'block', marginTop: 4 }}>
              {fern ? 'fern is resting in this prototype.' : `question 9 of ${TOTAL} · photos unlocked`}
            </span>
            <Progress value={9 / TOTAL} />
          </span>
        </button>

        <div className="slot-empty rise" style={{ '--d': '320ms' }}>
          <p className="body">one more space. we'll only fill it when you're ready.</p>
        </div>
      </div>
    </>
  )
}

/* ---------- 9. the prelude ---------- */

const milestoneOf = (c) => {
  const m = AFTERGLOW[c.q]
  return m && c.glow[m.key] !== 'yes' ? m : null
}

// Move on from the current question, stopping at an Afterglow moment if one is due.
function advance(p) {
  const c = p.convo
  if (milestoneOf(c)) return { convo: { ...c, phase: 'glow' } }
  if (c.q >= TOTAL) return { screen: 'plan', status: 'plan', plan: { step: 'where', activity: 0 } }
  return { convo: { ...c, q: c.q + 1, phase: 'read', mine: null } }
}
const nextQuestion = (p) =>
  p.convo.q >= TOTAL
    ? { screen: 'plan', status: 'plan', plan: { step: 'where', activity: 0 } }
    : { convo: { ...p.convo, q: p.convo.q + 1, phase: 'read', mine: null } }
const skipQuestion = (p) => (p.convo.phase.startsWith('glow') || p.convo.phase === 'facesReveal' ? nextQuestion(p) : advance(p))

function Conversation({ s, set }) {
  const { q, phase, glow, mine } = s.convo
  const item = QUESTIONS[q - 1]
  const plum = plumOf(s)
  const m = AFTERGLOW[q]
  const plumYes = m && s.tester[m.key] === 'yes'
  const plumFirst = q % 2 === 1 // taking turns: plum answers first on odd questions
  const setC = (patch) => set((p) => ({ convo: { ...p.convo, ...patch } }))

  useEffect(() => {
    if (phase === 'sent') {
      const t = setTimeout(() => setC({ phase: 'ready' }), plumFirst ? 1100 : REPLY_DELAY)
      return () => clearTimeout(t)
    }
    if (phase === 'glowWait' && plumYes) {
      const t = setTimeout(
        () =>
          set((p) => ({
            convo: { ...p.convo, phase: m.key === 'faces' ? 'facesReveal' : 'glowMutual', glow: { ...p.convo.glow, [m.key]: 'yes' } },
          })),
        MUTUAL_DELAY,
      )
      return () => clearTimeout(t)
    }
  }, [phase, plumYes])

  // leaving after both answers are in: the next question is "tomorrow", so it is waiting at home
  const goHome = () => set((p) => (p.convo.phase === 'ready' ? { ...advance(p), screen: 'home' } : { screen: 'home' }))
  const bar = <ConvoHeader count={`${q} of ${TOTAL}`} onHome={goHome} />

  if (phase === 'answer') {
    return (
      <>
        {bar}
        <Answer
          s={s}
          set={set}
          label="your turn"
          question={item.q}
          sample={item.sample}
          onSend={(a) => setC({ phase: 'sent', mine: a })}
        />
      </>
    )
  }

  // docs/screens/video/04-faces-reveal.png: the bubbles first, then both faces at the same moment
  if (phase === 'facesReveal') {
    return (
      <>
        {bar}
        <h1 className="video-title rise">IT'S MUTUAL.</h1>
        <p className="ui-caption video-caption rise" style={{ '--d': '80ms' }}>You both said yes.</p>
        <div className="reveal-faces">
          {[
            [THEM, 'them'],
            ['You', 'you'],
          ].map(([name, who]) => (
            <div className="reveal-face" key={who}>
              <span className="yes-bubble pop" style={{ '--d': '250ms' }} aria-hidden="true">yes</span>
              <div className="face-frame face-in">
                <FaceArt who={who} />
              </div>
              <p className="reveal-name face-in">{name}</p>
            </div>
          ))}
        </div>
        <div className="actions pinned">
          <button className="ui-primary" onClick={() => set(nextQuestion)}>Continue</button>
        </div>
      </>
    )
  }

  // docs/screens/video/03-share-faces.png
  if (phase === 'glow' && m && m.key === 'faces') {
    return (
      <>
        {bar}
        <h1 className="video-title rise">SHARE FACES?</h1>
        <p className="ui-caption video-caption rise" style={{ '--d': '80ms' }}>
          Only if you both say yes. A “not yet” is never shown to {THEM}.
        </p>
        <div className="faces-flowers pop" aria-hidden="true" style={{ '--d': '200ms' }}>
          <Flower size={127} />
          <Flower size={127} />
        </div>
        <div className="actions pinned">
          <button className="ui-primary" onClick={() => setC({ phase: 'glowWait' })}>Yes</button>
          <button className="ui-secondary block" onClick={() => setC({ phase: 'glowNo' })}>Not yet</button>
        </div>
      </>
    )
  }

  if (phase.startsWith('glow') && m) {
    const isMeet = m.key === 'meet'
    const mutual = phase === 'glowMutual'
    return (
      <>
        {bar}
        <Pair theirs={plum.flower} left={phase === 'glowWait' || mutual ? 'yes' : ''} right={mutual ? 'yes' : ''} turned={mutual} eyes={mutual ? 1 : 0} />
        <p className="small" style={{ marginTop: 10 }}>afterglow · only opens if you both say yes</p>
        {phase === 'glow' && (
          <>
            <h1 className="display m rise" style={{ margin: '8px 0 12px' }}>{m.ask}</h1>
            <p className="body">{m.detail}</p>
            <p className="small" style={{ marginTop: 10 }}>plum is asked the same. a no is never shown.</p>
            <div className="actions">
              <div className="row stretch" style={{ width: '100%' }}>
                <button className="pill pill-white" onClick={() => setC({ phase: 'glowNo' })}>not yet</button>
                <button className="pill pill-black" onClick={() => setC({ phase: 'glowWait' })}>yes</button>
              </div>
            </div>
          </>
        )}
        {phase === 'glowWait' && (
          <>
            <h1 className="display m rise" style={{ margin: '8px 0 12px' }}>WE'LL TELL YOU IF IT'S MUTUAL.</h1>
            <p className="body">no rush. nothing changes until then.</p>
            {!plumYes && (
              <div className="actions">
                {isMeet ? (
                  <button className="pill pill-white pill-block" onClick={() => set({ screen: 'home' })}>back home</button>
                ) : (
                  <button className="pill pill-black pill-block" onClick={() => set(nextQuestion)}>keep going</button>
                )}
              </div>
            )}
          </>
        )}
        {mutual && (
          <>
            <h1 className="display rise" style={{ margin: '8px 0 12px' }}>IT'S MUTUAL.</h1>
            <p className="body">{m.mutual}</p>
            <div className="actions">
              <button className="pill pill-black pill-block" onClick={() => set(nextQuestion)}>{isMeet ? 'see the plan' : 'continue'}</button>
            </div>
          </>
        )}
        {phase === 'glowNo' && (
          <>
            <h1 className="display m rise" style={{ margin: '8px 0 12px' }}>THAT'S OKAY.</h1>
            <p className="body">plum will never know. {isMeet ? "say the word when you're ready." : "we'll ask again later."}</p>
            <div className="actions">
              {isMeet ? (
                <div className="row stretch" style={{ width: '100%' }}>
                  <button className="pill pill-white" onClick={() => set({ screen: 'home' })}>back home</button>
                  <button className="pill pill-black" onClick={() => setC({ phase: 'glow' })}>ask me again</button>
                </div>
              ) : (
                <button className="pill pill-black pill-block" onClick={() => set(nextQuestion)}>continue</button>
              )}
            </div>
          </>
        )}
      </>
    )
  }

  const revealed = phase === 'ready'
  const nextIsGlow = !!milestoneOf(s.convo)

  // docs/screens/video/02-conversation.png: both answers in, the other one revealed after yours
  if (revealed) {
    const yours = mine || { kind: 'text', text: item.sample }
    const theirPhotos = item.photoAlways || glow.world === 'yes' ? photosOf({ photo: item.photo }) : []
    return (
      <>
        {bar}
        <h1 className="convo-question rise">{item.q}</h1>
        <div className="video-cards convo-cards">
          <AnswerCard label="You" text={yours.text} textCase="sentence" photos={photosOf(yours)} />
          <AnswerCard
            className="reveal-later"
            label={THEM}
            voice={item.length || '0:04'}
            voiceTone="grey"
            text={sentence(item.a)}
            textCase="sentence"
            photos={theirPhotos}
          />
        </div>
        <p className="ui-caption convo-tomorrow">Next question tomorrow. In your own time.</p>
      </>
    )
  }

  return (
    <>
      {bar}
      <Progress value={q / TOTAL} />
      <h1 className="question rise" style={{ margin: '18px 0 20px' }}>{item.q}</h1>

      <div className="stack">
        {revealed ? (
          <Theirs plum={plum} text={item.a} photo={glow.world === 'yes' ? item.photo : null} face={glow.faces === 'yes'} />
        ) : (
          <Theirs
            plum={plum}
            locked={
              plumFirst || phase === 'sent'
                ? plumFirst
                  ? "plum has answered. you'll hear it once you have too."
                  : 'plum is answering…'
                : 'plum is still thinking. you can go first.'
            }
          />
        )}
        {mine && <Mine answer={mine} />}
      </div>

      {phase === 'sent' && <p className="small center" style={{ marginTop: 18 }}>plum hears it only once you've both answered.</p>}

      <div className="actions">
        {phase === 'read' && (
          <button className="pill pill-black pill-block" onClick={() => setC({ phase: 'answer' })}>your turn</button>
        )}
        {revealed && (
          <button className="pill pill-black pill-block" onClick={() => set(advance)}>
            {q < TOTAL && !nextIsGlow ? 'next question' : 'continue'}
          </button>
        )}
      </div>
    </>
  )
}

/* ---------- 10. side by side ---------- */

function Plan({ s, set }) {
  const plum = plumOf(s)
  const ranked = [...ACTIVITIES].sort((a, b) => b.fits.includes(plum.pairs) - a.fits.includes(plum.pairs))
  const activity = ranked[s.plan.activity % ranked.length]
  const setP = (patch) => set((p) => ({ plan: { ...p.plan, ...patch } }))

  if (s.plan.step === 'where') {
    return (
      <>
        <p className="small rise">side by side · you both said yes</p>
        <h1 className="display rise" style={{ margin: '8px 0 12px', '--d': '60ms' }}>WHERE WOULD SUIT YOU?</h1>
        <p className="body rise" style={{ '--d': '120ms' }}>a neighbourhood or a town is enough. plum is asked the same.</p>
        <input
          className="field rise"
          style={{ marginTop: 18, '--d': '180ms' }}
          type="text"
          placeholder="neighbourhood or town"
          value={s.area}
          onChange={(e) => set({ area: e.target.value })}
        />
        <div className="actions">
          <button className="pill pill-black pill-block" disabled={!s.area.trim()} onClick={() => setP({ step: 'suggest' })}>continue</button>
        </div>
      </>
    )
  }

  // docs/screens/video/05-side-by-side.png
  return (
    <>
      <ConvoHeader count={`${TOTAL} of ${TOTAL}`} onHome={() => set({ screen: 'home' })} />
      <h1 className="video-title rise">SIDE BY SIDE.</h1>
      <p className="ui-caption video-caption rise" style={{ '--d': '80ms' }}>Something calm, chosen for both of you.</p>
      <div className="content-card white plan-card rise" style={{ '--d': '160ms' }} key={activity.title}>
        <p className="answer-label">{sentence(activity.when)}</p>
        <p className="answer-text plan-title">{sentence(activity.title)}</p>
        <p className="answer-label">{sentence(activity.why)}</p>
      </div>
      <div className="walk plan-walk" aria-hidden="true">
        <Sticker html={PATH} />
        <div className="walkers">
          <Flower className="walker" look={0.6} />
          <Flower className="walker walker-b" look={-0.6} />
        </div>
      </div>
      <div className="actions pinned">
        <button className="ui-primary" onClick={() => set({ screen: 'powerdown', status: 'met' })}>Sounds good</button>
        <button className="ui-link plan-else" onClick={() => setP({ activity: s.plan.activity + 1 })}>Suggest something else</button>
      </div>
    </>
  )
}

/* ---------- 11. power down ---------- */

// docs/screens/video/06-power-down.png: the lilac fades to navy, the moon fades in
function Powerdown({ set }) {
  return (
    <>
      <Sticker html={MOON} className="powerdown-moon" aria-hidden="true" />
      <div className="powerdown-flower" aria-hidden="true">
        <Flower size={127} />
      </div>
      <h1 className="video-title powerdown-title">THAT'S IT<br />FROM US.<br />ENJOY IT.</h1>
      <p className="ui-caption powerdown-caption">No reminders. No tips. We'll be quiet until afterwards.</p>
      <div className="actions">
        <button className="ui-link powerdown-next" onClick={() => set({ screen: 'after', after: FRESH_AFTER })}>The next day →</button>
      </div>
    </>
  )
}

/* ---------- 12. after the meeting ---------- */

function After({ s, set }) {
  const a = s.after
  const plum = plumOf(s)
  const setA = (patch) => set((p) => ({ after: { ...p.after, ...patch } }))
  const same = a.again === s.tester.again

  if (a.step === 'self') {
    return (
      <>
        <p className="small rise">after the meeting · just for you</p>
        <div className="middle">
          <Flower size={130} className="pop" />
          <h1 className="display rise" style={{ margin: '18px 0 10px' }}>DID YOU FEEL LIKE YOURSELF?</h1>
          <p className="body">plum never sees this one.</p>
        </div>
        <div className="actions">
          <div className="row stretch" style={{ width: '100%' }}>
            <button className="pill pill-white" onClick={() => setA({ self: 'not really', step: 'again' })}>not really</button>
            <button className="pill pill-black" onClick={() => setA({ self: 'yes', step: 'again' })}>yes</button>
          </div>
        </div>
      </>
    )
  }

  if (a.step === 'again') {
    return (
      <>
        <p className="small rise">after the meeting</p>
        <div className="middle">
          <Pair theirs={plum.flower} />
          <h1 className="display rise" style={{ margin: '4px 0 10px' }}>MEET AGAIN?</h1>
          <p className="body">you'll only see plum's answer if it matches yours.</p>
        </div>
        <div className="actions">
          <div className="row stretch" style={{ width: '100%' }}>
            <button className="pill pill-white" onClick={() => setA({ again: 'not yet', step: 'result' })}>not yet</button>
            <button className="pill pill-black" onClick={() => setA({ again: 'yes', step: 'result' })}>yes</button>
          </div>
        </div>
      </>
    )
  }

  const bothYes = same && a.again === 'yes'
  return (
    <>
      <p className="small rise">after the meeting</p>
      <div className="middle">
        {same ? (
          <>
            <Pair theirs={plum.flower} left={bothYes ? 'yes' : ''} right={bothYes ? 'yes' : ''} turned={bothYes} eyes={bothYes ? 1 : 0} />
            <h1 className="display m rise" style={{ margin: '4px 0 10px' }}>{bothYes ? 'PLUM WOULD LIKE THAT TOO.' : 'PLUM FEELS THE SAME.'}</h1>
            <p className="body">{bothYes ? 'the rest is yours. we step back.' : 'no rush, for either of you.'}</p>
          </>
        ) : (
          <>
            <Flower size={130} className="pop" />
            <h1 className="display m rise" style={{ margin: '18px 0 10px' }}>NOTED.</h1>
            <p className="body">you'll only hear about it if it matches.</p>
          </>
        )}
      </div>
      <div className="actions">
        <button className="pill pill-black pill-block" onClick={() => set((p) => ({ screen: 'home', after: { ...p.after, step: 'done' } }))}>back home</button>
      </div>
    </>
  )
}

/* ---------- 13. ending ---------- */

function Ending({ set }) {
  return (
    <>
      <div className="middle center">
        <Flower size={170} fold={1} style={{ margin: '0 auto 22px', filter: 'grayscale(1)' }} />
        <h1 className="display m rise">THIS PRELUDE HAS ENDED.</h1>
        <p className="body rise" style={{ marginTop: 12, '--d': '120ms' }}>it's about timing, not you.</p>
      </div>
      <div className="actions">
        <button className="pill pill-white pill-block" onClick={() => set({ screen: 'home', status: 'ended' })}>back home</button>
      </div>
    </>
  )
}

const SCREENS = {
  welcome: Welcome,
  reflect: Reflect,
  mirror: Mirror,
  matching: Matching,
  waiting: Waiting,
  qotd: Qotd,
  match: Match,
  home: Home,
  conversation: Conversation,
  plan: Plan,
  powerdown: Powerdown,
  after: After,
  ending: Ending,
}
