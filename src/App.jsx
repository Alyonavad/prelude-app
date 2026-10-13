import { useEffect, useRef, useState } from 'react'
import {
  COLOURS,
  FIRST_QUESTION,
  HOW_IT_WORKS,
  REFLECT_QUESTIONS,
  GUESSES,
  PHOTOS_DEFAULT,
  PHOTO_OPTIONS,
  BASICS,
  QUESTION_OF_THE_DAY,
  ANON_CARDS,
  PLUM_FIRST,
  PACE_OPTIONS,
  QUESTIONS,
  AFTERGLOW,
  ACTIVITIES,
  FEEL_OPTIONS,
} from './data.js'

const STORAGE_KEY = 'prelude-prototype-v2'
const TOTAL = QUESTIONS.length
const MATCH_DELAY = 6000
const REPLY_DELAY = 3000
const MUTUAL_DELAY = 2500

const FRESH_CONVO = { q: 1, phase: 'read', glow: {}, menu: null, mine: null }
const FRESH_PLAN = { activity: 0, phase: 'suggest', numbers: 'ask' }
const FRESH_AFTER = { step: 'met', self: null, feel: null, again: null }
const ALL_OPEN = { world: 'yes', faces: 'yes', meet: 'yes' }

const INITIAL = {
  screen: 'welcome',
  answerMode: 'voice', // last choice on the answer screen
  reflect: 0,
  mirror: GUESSES.map(() => ({ status: null, text: '' })),
  basicsStep: 0,
  basics: { open: null, who: null, ageMin: '25', ageMax: '40', photos: PHOTOS_DEFAULT, area: '' },
  picks: {},
  matchArrived: false,
  qotdDone: false,
  pace: null,
  // plum's prelude: active | plan | finished | ended | people
  status: 'active',
  convo: FRESH_CONVO,
  plan: FRESH_PLAN,
  after: FRESH_AFTER,
  paused: false,
  // simulated answers from plum, set in the tester panel
  tester: {
    glow: { world: 'yes', faces: 'yes', meet: 'yes', numbers: 'yes' },
    feel: 'more than friends',
    again: 'yes',
  },
}

const convoAt = (q, phase, glow = {}) => ({ screen: 'conversation', status: 'active', convo: { ...FRESH_CONVO, q, phase, glow } })
const planAt = (patch) => (s) => ({ screen: 'plan', status: 'plan', plan: { ...s.plan, ...patch } })
const afterAt = (step, extra = {}) => () => ({ screen: 'after', status: 'finished', after: { ...FRESH_AFTER, ...extra, step } })

// Tester shortcuts. Each returns a patch applied on top of the current state.
const JUMPS = [
  ['1 · Onboarding', [
    { id: 'welcome', label: 'First question', patch: () => ({ screen: 'welcome' }) },
    { id: 'how', label: 'How it works', patch: () => ({ screen: 'how' }) },
    { id: 'reflect', label: 'Two more questions', patch: () => ({ screen: 'reflect', reflect: 0 }) },
    { id: 'mirror', label: 'Mirror card', patch: () => ({ screen: 'mirror' }) },
    { id: 'basics', label: 'Openness and basics', patch: () => ({ screen: 'basics', basicsStep: 0 }) },
  ]],
  ['2 · Matching', [
    { id: 'matching', label: 'Mutual matching', patch: () => ({ screen: 'matching', picks: {}, matchArrived: false }) },
    { id: 'waiting', label: 'Waiting ("no rush")', patch: () => ({ screen: 'waiting', matchArrived: false }) },
    { id: 'qotd', label: 'Question of the day', patch: () => ({ screen: 'qotd', matchArrived: false }) },
    { id: 'banner', label: '"Someone is here" banner', patch: () => ({ screen: 'waiting', matchArrived: true }) },
    { id: 'match', label: 'Match arrives', patch: () => ({ screen: 'match', matchArrived: true }) },
    { id: 'pace', label: 'Pace', patch: () => ({ screen: 'pace' }) },
  ]],
  ['3 · Home', [
    { id: 'home', label: 'Home', patch: () => ({ screen: 'home', paused: false }) },
    { id: 'homePaused', label: 'Home · paused', patch: () => ({ screen: 'home', paused: true }) },
    { id: 'homePeople', label: 'Home · your people', patch: () => ({ screen: 'home', paused: false, status: 'people' }) },
  ]],
  ['4 · The prelude', [
    { id: 'convo1', label: 'Conversation (question 1)', patch: () => convoAt(1, 'read') },
    { id: 'convoAnswer', label: 'Answer screen', patch: (s) => ({ screen: 'conversation', status: 'active', convo: { ...s.convo, phase: 'answer', menu: null } }) },
    { id: 'glow4', label: 'Afterglow: world photos (Q4)', patch: () => convoAt(4, 'glow') },
    { id: 'glow8', label: 'Afterglow: faces (Q8)', patch: (s) => ({ ...convoAt(8, 'glow', { world: 'yes' }), basics: { ...s.basics, photos: PHOTOS_DEFAULT } }) },
    { id: 'facesReveal', label: 'Faces reveal', patch: (s) => ({ ...convoAt(8, 'facesReveal', { world: 'yes', faces: 'yes' }), basics: { ...s.basics, photos: PHOTOS_DEFAULT } }) },
    { id: 'glow12', label: 'Afterglow: ready to meet (Q12)', patch: () => convoAt(12, 'glow', { world: 'yes', faces: 'yes' }) },
    { id: 'endConfirm', label: '"End this prelude" confirm', patch: (s) => ({ screen: 'conversation', status: 'active', convo: { ...s.convo, phase: 'read', menu: 'confirm' } }) },
    { id: 'ending', label: 'Ended (what the other person sees)', patch: () => ({ screen: 'ending' }) },
  ]],
  ['5 · Meeting', [
    { id: 'plan', label: 'Side by Side suggestion', patch: (s) => ({ ...planAt({ phase: 'suggest' })(s), convo: { ...FRESH_CONVO, q: 12, glow: ALL_OPEN } }) },
    { id: 'numbers', label: 'Afterglow: share numbers', patch: (s) => ({ screen: 'numbers', status: 'plan', plan: { ...s.plan, phase: 'set', numbers: 'ask' } }) },
    { id: 'planSet', label: 'Plan agreed', patch: planAt({ phase: 'set' }) },
    { id: 'cameup', label: 'Something came up', patch: () => ({ screen: 'cameup', status: 'plan' }) },
    { id: 'faded', label: 'Let it fade', patch: () => ({ screen: 'faded', status: 'ended' }) },
    { id: 'powerdown', label: 'Power down', patch: () => ({ screen: 'powerdown', status: 'finished' }) },
  ]],
  ['6 · After the meeting', [
    { id: 'aMet', label: 'Did you meet?', patch: afterAt('met') },
    { id: 'aNoMeet', label: "It didn't happen", patch: afterAt('nomeet') },
    { id: 'wrong', label: 'Something felt wrong', patch: () => ({ screen: 'wrong' }) },
    { id: 'aSelf', label: 'Did you feel like yourself?', patch: afterAt('self') },
    { id: 'aFeel', label: 'How did it feel?', patch: afterAt('feel') },
    { id: 'aFeelResult', label: 'How it felt · result', patch: afterAt('feelResult', { feel: 'more than friends' }) },
    { id: 'aAgain', label: 'Meet again?', patch: afterAt('again') },
    { id: 'aPeople', label: 'One of your people', patch: () => ({ screen: 'after', status: 'people', after: { ...FRESH_AFTER, step: 'people', again: 'yes' } }) },
    { id: 'next', label: "What's next", patch: () => ({ screen: 'next' }) },
    { id: 'paywall', label: 'Paywall', patch: () => ({ screen: 'paywall' }) },
  ]],
]
const ALL_JUMPS = JUMPS.flatMap(([, items]) => items)

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && saved.screen) return { ...INITIAL, ...saved }
  } catch {
    // storage unavailable or corrupt: start fresh
  }
  return INITIAL
}

// Mirror guesses the user confirmed or rewrote. `i` is the index in GUESSES, or -1 if rewritten.
function confirmedGuesses(s) {
  return s.mirror
    .map((m, i) => {
      if (m.status === 'yes') return { i, text: GUESSES[i] }
      if (m.status === 'edit' && m.text.trim()) return { i: -1, text: m.text.trim() }
      return null
    })
    .filter(Boolean)
}
const firstGuess = (s) => confirmedGuesses(s)[0] || { i: 0, text: GUESSES[0] }

// Suggestions that suit the first confirmed guess come first.
function pickActivity(s) {
  const g = firstGuess(s)
  const ranked = [...ACTIVITIES].sort((a, b) => b.fits.includes(g.i) - a.fits.includes(g.i))
  return ranked[s.plan.activity % ranked.length]
}

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

  // Simulated mutual match while the user is waiting.
  const waiting = s.screen === 'waiting' || s.screen === 'qotd'
  useEffect(() => {
    if (!waiting || s.matchArrived) return
    const t = setTimeout(() => set({ matchArrived: true }), MATCH_DELAY)
    return () => clearTimeout(t)
  }, [waiting, s.matchArrived])

  const restart = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setS(INITIAL)
  }

  const setTester = (patch) => set((p) => ({ tester: { ...p.tester, ...patch } }))
  const setPlumGlow = (key, v) => setTester({ glow: { ...s.tester.glow, [key]: v } })

  const Screen = SCREENS[s.screen] || Welcome
  const tint = s.screen === 'conversation' ? COLOURS.lilac : null
  const transitionKey = [
    s.screen, s.reflect, s.basicsStep, s.convo.q, s.convo.phase === 'answer', s.convo.phase === 'facesReveal',
    s.convo.menu === 'confirm', s.plan.phase, s.after.step,
  ].join('|')

  return (
    <div className="stage">
      <div className="frame-slot" style={{ width: 390 * scale, height: 844 * scale }}>
        <div className="phone" style={{ transform: `scale(${scale})` }}>
          {waiting && s.matchArrived && (
            <button className="banner" onClick={() => set({ screen: 'match' })}>
              <strong>someone is here.</strong>
              <span>tap to meet them →</span>
            </button>
          )}
          <div
            className={`screen s-${s.screen}${tint ? ' tinted' : ''}`}
            style={tint ? { background: tint } : undefined}
            key={transitionKey}
          >
            <Screen s={s} set={set} />
          </div>
        </div>
      </div>

      <aside className="tester">
        <p className="tester-title">Tester controls</p>
        <p className="tester-note">Not part of the app.</p>
        <button className="btn secondary" onClick={restart}>
          Restart
        </button>
        <label className="tester-label" htmlFor="jump">
          Jump to screen
        </label>
        <select
          id="jump"
          value=""
          onChange={(e) => {
            const j = ALL_JUMPS.find((x) => x.id === e.target.value)
            if (j) set((p) => j.patch(p))
          }}
        >
          <option value="" disabled>
            Choose…
          </option>
          {JUMPS.map(([group, items]) => (
            <optgroup key={group} label={group}>
              {items.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="tester-note">
          Now showing: <strong>{s.screen}</strong>
        </p>

        <p className="tester-label">Plum's Afterglow answers</p>
        {[['world', 'World photos'], ['faces', 'Faces'], ['meet', 'Ready to meet'], ['numbers', 'Numbers']].map(([key, label]) => (
          <TesterPick key={key} label={label} value={s.tester.glow[key]} options={['yes', 'not yet']} onChange={(v) => setPlumGlow(key, v)} />
        ))}
        <p className="tester-label">Plum after the meeting</p>
        <TesterPick label="How did it feel?" value={s.tester.feel} options={FEEL_OPTIONS} onChange={(v) => setTester({ feel: v })} />
        <TesterPick label="Meet again?" value={s.tester.again} options={['yes', 'not yet']} onChange={(v) => setTester({ again: v })} />
        <p className="tester-label">Your photo preference</p>
        <TesterPick label="Share photos" value={s.basics.photos} options={PHOTO_OPTIONS} onChange={(v) => set((p) => ({ basics: { ...p.basics, photos: v } }))} />
      </aside>
    </div>
  )
}

function TesterPick({ label, value, options, onChange }) {
  return (
    <label className="tester-row">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

// Shrinks the 390×844 frame to fit short desktop windows.
function useFrameScale() {
  const calc = () => (window.innerWidth < 500 ? 1 : Math.min(1, (window.innerHeight - 48) / 844))
  const [scale, setScale] = useState(calc)
  useEffect(() => {
    const onResize = () => setScale(calc())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}

/* ---------- shared pieces ---------- */

function PhotoBox({ label }) {
  return <div className="photo">[photo: {label}]</div>
}

function Voice({ length }) {
  return (
    <div className="voice">
      <span className="voice-play">▶</span>
      <span className="voice-bar" />
      <span className="voice-len">{length}</span>
    </div>
  )
}

function Progress({ value }) {
  return (
    <div className="progress">
      <div className="progress-fill" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}

function Options({ options, value, onChange, note }) {
  return (
    <div className="options">
      {options.map((o) => (
        <button key={o} className={value === o ? 'option on' : 'option'} aria-pressed={value === o} onClick={() => onChange(o)}>
          <span className="check">{value === o ? '✓' : ''}</span>
          {o}
          {note && note[o] && <span className="muted"> · {note[o]}</span>}
        </button>
      ))}
    </div>
  )
}

function fmt(secs) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

// The answer screen, used everywhere. `forPlum` switches the preview wording.
function Answer({ s, set, question, label, forPlum, sendLabel = 'Send', onSend }) {
  const mode = s.answerMode
  const [rec, setRec] = useState('idle') // idle | recording | done
  const [secs, setSecs] = useState(0)
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (rec !== 'recording') return
    const t = setInterval(() => setSecs((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [rec])

  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo])

  const canSend = mode === 'voice' ? rec === 'done' : text.trim().length > 0
  const previewTitle = forPlum ? 'this is how plum will see it.' : 'this is how it will look.'

  return (
    <>
      {label && <p className="label">{label}</p>}
      <h1 className="question">{question}</h1>

      <div className="toggle" role="tablist">
        <button className={mode === 'voice' ? 'on' : ''} onClick={() => set({ answerMode: 'voice' })}>
          voice
        </button>
        <button className={mode === 'text' ? 'on' : ''} onClick={() => set({ answerMode: 'text' })}>
          writing
        </button>
      </div>

      {mode === 'voice' ? (
        rec === 'done' ? (
          <div className="preview">
            <p className="label">{previewTitle}</p>
            <div className="card">
              <Voice length={fmt(secs)} />
              <p className="transcript">[transcript of your recording]</p>
            </div>
            <div className="row between">
              <button className="link" onClick={() => setListening((l) => !l)}>
                {listening ? '[playing…] stop' : 'listen'}
              </button>
              <button className="link" onClick={() => { setRec('idle'); setListening(false) }}>
                record again
              </button>
            </div>
          </div>
        ) : (
          <div className="recorder">
            {rec === 'idle' ? (
              <>
                <button className="rec-btn" onClick={() => { setSecs(0); setRec('recording') }}>
                  record
                </button>
                <p className="hint">tap to start. take your time.</p>
              </>
            ) : (
              <>
                <button className="rec-btn active" onClick={() => setRec('done')}>
                  stop
                </button>
                <p className="timer">{fmt(secs)}</p>
                <div className="rec-bar"><span>[recording…]</span></div>
              </>
            )}
          </div>
        )
      ) : (
        <>
          <textarea
            className="field"
            rows={4}
            placeholder="write as much or as little as you like."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {text.trim() && (
            <div className="preview">
              <p className="label">{previewTitle}</p>
              <div className="card">
                <p className="transcript">“{text.trim()}”</p>
              </div>
            </div>
          )}
        </>
      )}

      <div className="world">
        <p className="world-title">add a piece of your world <span className="muted">(optional)</span></p>
        <p className="hint">things, places, views. not faces yet.</p>
        <div className="world-row">
          <div className="photo small">
            {photo ? <img src={photo.url} alt="" /> : '[your photo]'}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files && e.target.files[0]
                if (f) setPhoto({ url: URL.createObjectURL(f), name: f.name })
              }}
            />
            <button className="btn secondary" onClick={() => fileRef.current.click()}>
              {photo ? 'Change photo' : 'Choose a photo'}
            </button>
            {photo && (
              <button className="link block" onClick={() => { setPhoto(null); fileRef.current.value = '' }}>
                remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="btn primary" disabled={!canSend} onClick={() => onSend(mode === 'text' ? text.trim() : null)}>
          {sendLabel}
        </button>
        {!canSend && (
          <p className="hint center">{mode === 'voice' ? 'record something to send.' : 'write something to send.'}</p>
        )}
      </div>
    </>
  )
}

/* ---------- 1. onboarding ---------- */

function Welcome({ s, set }) {
  return (
    <>
      <p className="body lead">no profile. no small talk. just answer this.</p>
      <Answer s={s} set={set} question={FIRST_QUESTION} onSend={() => set({ screen: 'how' })} />
    </>
  )
}

function How({ set }) {
  return (
    <>
      <div className="middle">
        <h1 className="title">that's how it works. one question at a time, with one person.</h1>
        <ul className="lines">
          {HOW_IT_WORKS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
      <div className="actions">
        <button className="btn primary" onClick={() => set({ screen: 'reflect', reflect: 0 })}>Continue</button>
      </div>
    </>
  )
}

function Reflect({ s, set }) {
  const i = s.reflect
  const last = i === REFLECT_QUESTIONS.length - 1
  return (
    <>
      <div className="topbar">
        <span className="muted">{i + 2} of {REFLECT_QUESTIONS.length + 1}</span>
      </div>
      <Progress value={(i + 2) / (REFLECT_QUESTIONS.length + 1)} />
      <Answer
        key={i}
        s={s}
        set={set}
        label="just for you · no one is waiting"
        question={REFLECT_QUESTIONS[i]}
        onSend={() => (last ? set({ screen: 'mirror' }) : set({ reflect: i + 1 }))}
      />
    </>
  )
}

function Mirror({ s, set }) {
  const update = (i, patch) => set((p) => ({ mirror: p.mirror.map((m, n) => (n === i ? { ...m, ...patch } : m)) }))
  const done = s.mirror.every((m) => m.status)

  return (
    <>
      <h1 className="title">here's what we noticed.</h1>
      <p className="hint">these are guesses. you can change them anytime.</p>

      {GUESSES.map((g, i) => {
        const m = s.mirror[i]
        return (
          <div className="card" key={i}>
            <p className="body">{g}</p>
            <div className="row">
              <button className={`btn small ${m.status === 'yes' ? 'primary' : 'secondary'}`} onClick={() => update(i, { status: 'yes' })}>yes</button>
              <button className={`btn small ${m.status === 'edit' ? 'primary' : 'secondary'}`} onClick={() => update(i, { status: 'edit' })}>not quite</button>
            </div>
            {m.status === 'edit' && (
              <input
                className="field"
                type="text"
                placeholder="what's closer to the truth?"
                value={m.text}
                onChange={(e) => update(i, { text: e.target.value })}
              />
            )}
          </div>
        )
      })}

      <div className="actions">
        <button className="btn primary" disabled={!done} onClick={() => set({ screen: 'basics', basicsStep: 0 })}>Continue</button>
        {!done && <p className="hint center">answer each guess to continue.</p>}
      </div>
    </>
  )
}

function Basics({ s, set }) {
  const b = s.basics
  const romance = b.open === 'romance' || b.open === 'both'
  const steps = ['open', ...(romance ? ['who'] : []), 'photos', 'area']
  const i = Math.min(s.basicsStep, steps.length - 1)
  const key = steps[i]
  const step = BASICS[key]
  const last = i === steps.length - 1
  const setB = (patch) => set((p) => ({ basics: { ...p.basics, ...patch } }))
  const canContinue = key !== 'open' || b.open

  return (
    <>
      <div className="topbar">
        {i > 0 ? <button className="link" onClick={() => set({ basicsStep: i - 1 })}>← back</button> : <span />}
        <span className="muted">{i + 1} of {steps.length}</span>
      </div>
      <Progress value={(i + 1) / steps.length} />
      <h1 className="title">{step.title}</h1>
      <p className="hint">{step.hint}</p>

      {key === 'area' ? (
        <input className="field" type="text" placeholder="e.g. riverside" value={b.area} onChange={(e) => setB({ area: e.target.value })} />
      ) : (
        <Options
          options={step.options}
          value={b[key]}
          onChange={(v) => setB({ [key]: v })}
          note={key === 'photos' ? { [PHOTOS_DEFAULT]: 'default' } : null}
        />
      )}

      {key === 'who' && (
        <>
          <p className="field-label">age range</p>
          <div className="row ages">
            <input className="field" type="number" inputMode="numeric" min="18" max="99" aria-label="from age" value={b.ageMin} onChange={(e) => setB({ ageMin: e.target.value })} />
            <span className="muted">to</span>
            <input className="field" type="number" inputMode="numeric" min="18" max="99" aria-label="to age" value={b.ageMax} onChange={(e) => setB({ ageMax: e.target.value })} />
          </div>
        </>
      )}

      <div className="actions">
        <button
          className="btn primary"
          disabled={!canContinue}
          onClick={() => (last ? set({ screen: 'matching', picks: {}, matchArrived: false }) : set({ basicsStep: i + 1 }))}
        >
          {last ? 'Find someone' : 'Continue'}
        </button>
      </div>
    </>
  )
}

/* ---------- 2. matching ---------- */

function Matching({ s, set }) {
  const pick = (id, v) => set((p) => ({ picks: { ...p.picks, [id]: v } }))
  const allDone = ANON_CARDS.every((c) => s.picks[c.id])

  return (
    <>
      <h1 className="title">Someone might feel familiar.</h1>
      <p className="hint">three answers. no names, no photos. just how they sound.</p>

      {ANON_CARDS.map((c) => (
        <div className="card" key={c.id}>
          {s.picks[c.id] ? (
            <div className="row between">
              <span className="muted">noted. only you know what you chose.</span>
              <button className="link" onClick={() => pick(c.id, undefined)}>undo</button>
            </div>
          ) : (
            <>
              <p className="label">{c.question}</p>
              <Voice length={c.length} />
              <p className="transcript">“{c.transcript}”</p>
              <div className="row">
                <button className="btn primary small" onClick={() => pick(c.id, 'yes')}>I'd like to hear more</button>
                <button className="btn secondary small" onClick={() => pick(c.id, 'no')}>not this one</button>
              </div>
            </>
          )}
        </div>
      ))}

      <div className="actions">
        <button className="btn primary" disabled={!allDone} onClick={() => set({ screen: 'waiting' })}>
          Done
        </button>
        {!allDone && <p className="hint center">choose for each answer to continue.</p>}
      </div>
    </>
  )
}

function Waiting({ s, set }) {
  return (
    <>
      <div className="middle">
        <h1 className="title">we'll let you know when it's mutual. no rush.</h1>
        <p className="body">a "no" is never shown to anyone. theirs or yours.</p>
      </div>
      <div className="card">
        <p className="label">while you wait · optional</p>
        <p className="card-title">question of the day</p>
        {s.qotdDone ? (
          <p className="muted">kept. just for you.</p>
        ) : (
          <>
            <p className="transcript">{QUESTION_OF_THE_DAY}</p>
            <button className="btn secondary" onClick={() => set({ screen: 'qotd' })}>Answer it</button>
          </>
        )}
      </div>
    </>
  )
}

function Qotd({ s, set }) {
  return (
    <>
      <div className="topbar">
        <button className="link" onClick={() => set({ screen: 'waiting' })}>← back</button>
        <span className="muted">question of the day</span>
      </div>
      <Answer
        s={s}
        set={set}
        label="just for you · no one is waiting"
        question={QUESTION_OF_THE_DAY}
        sendLabel="Keep it"
        onSend={() => set({ screen: 'waiting', qotdDone: true })}
      />
    </>
  )
}

function Match({ s, set }) {
  return (
    <>
      <p className="label">someone is here.</p>
      <h1 className="headline">Meet Plum.</h1>

      <div className="card">
        <p className="label">why you resonated</p>
        <p className="body">“{firstGuess(s).text}”</p>
        <p className="hint">plum's answers say something very close.</p>
      </div>

      <div className="card">
        <p className="label">first exchange · {PLUM_FIRST.question}</p>
        <Voice length={PLUM_FIRST.length} />
        <p className="transcript">“{PLUM_FIRST.transcript}”</p>
        <PhotoBox label={PLUM_FIRST.photo} />
      </div>

      <div className="actions">
        <button className="btn primary" onClick={() => set({ screen: 'pace' })}>Continue</button>
      </div>
    </>
  )
}

function Pace({ s, set }) {
  // A new match starts a fresh prelude if the previous one is over.
  const begin = () =>
    set((p) => ({
      screen: 'home',
      paused: false,
      ...(p.status === 'active' ? {} : { status: 'active', convo: FRESH_CONVO, plan: FRESH_PLAN, after: FRESH_AFTER }),
    }))

  return (
    <>
      <p className="label">your pace</p>
      <h1 className="title">how often would you like a new question with Plum?</h1>
      <p className="hint">if you choose differently, the slower pace wins.</p>
      <Options options={PACE_OPTIONS} value={s.pace} onChange={(v) => set({ pace: v })} />
      <div className="actions">
        <button className="btn primary" disabled={!s.pace} onClick={begin}>Begin your prelude</button>
      </div>
    </>
  )
}

/* ---------- 3. home ---------- */

function Home({ s, set }) {
  const [fernNote, setFernNote] = useState(false)
  const { q, phase } = s.convo
  const plum = {
    active: { text: `question ${q} of ${TOTAL} · ${phase === 'sent' ? "plum's turn" : 'your turn'}`, to: { screen: 'conversation' } },
    plan: { text: 'side by side · making a plan', to: { screen: 'plan' } },
    finished: { text: 'kept, but finished', to: { screen: 'after', after: FRESH_AFTER } },
  }[s.status]

  return (
    <>
      <h1 className="title">your preludes</h1>

      {s.paused && (
        <div className="card">
          <p className="body">you're paused. come back whenever.</p>
          <button className="btn secondary" onClick={() => set({ paused: false })}>unpause</button>
        </div>
      )}

      {plum && (
        <button className="card tappable colour" style={{ background: COLOURS.lilac }} onClick={() => set(plum.to)}>
          <span className="card-title">Plum</span>
          <p>{plum.text}</p>
          {s.status === 'active' && <Progress value={q / TOTAL} />}
          {s.status === 'finished' && <p className="hint">[prototype: opens the day-after check-in]</p>}
        </button>
      )}

      <button className="card tappable colour" style={{ background: COLOURS.mint }} onClick={() => setFernNote(true)}>
        <span className="card-title">Fern</span>
        <p>question 9 of {TOTAL} · photos unlocked</p>
        <Progress value={9 / TOTAL} />
        {fernNote && <p className="hint">[prototype: only plum's prelude is clickable]</p>}
      </button>

      <div className="card dashed">
        <p className="muted">one more space. we'll only fill it when you're ready.</p>
      </div>

      {s.status === 'people' && (
        <>
          <h1 className="title spaced">your people</h1>
          <div className="card colour" style={{ background: COLOURS.lilac }}>
            <span className="card-title">Plum</span>
            <p>met side by side</p>
          </div>
        </>
      )}
    </>
  )
}

/* ---------- 4. the prelude ---------- */

function Conversation({ s, set }) {
  const { q, glow, menu, mine } = s.convo
  const item = QUESTIONS[q - 1]
  const photos = s.basics.photos
  const facesOn = photos === 'from the start' || (photos === PHOTOS_DEFAULT && glow.faces === 'yes')
  // The faces Afterglow only exists for "later, when we both want to".
  const milestone = AFTERGLOW[q] && !(AFTERGLOW[q].key === 'faces' && photos !== PHOTOS_DEFAULT) ? AFTERGLOW[q] : null
  const phase = !milestone && s.convo.phase.startsWith('glow') ? 'read' : s.convo.phase
  const plumYes = milestone && s.tester.glow[milestone.key] === 'yes'
  const setC = (patch) => set((p) => ({ convo: { ...p.convo, ...patch } }))

  useEffect(() => {
    if (phase === 'sent') {
      const t = setTimeout(() => setC({ phase: 'ready' }), REPLY_DELAY)
      return () => clearTimeout(t)
    }
    if (phase === 'glowWait' && plumYes) {
      const t = setTimeout(
        () =>
          set((p) => ({
            convo: {
              ...p.convo,
              phase: milestone.key === 'faces' ? 'facesReveal' : 'glowMutual',
              glow: { ...p.convo.glow, [milestone.key]: 'yes' },
            },
          })),
        MUTUAL_DELAY,
      )
      return () => clearTimeout(t)
    }
  }, [phase, plumYes])

  const nextQuestion = () =>
    q >= TOTAL
      ? set({ screen: 'plan', status: 'plan', plan: FRESH_PLAN })
      : setC({ q: q + 1, phase: 'read', mine: null })
  // Move on from this question, stopping at an Afterglow moment if one is due.
  const advance = () => (milestone && glow[milestone.key] !== 'yes' ? setC({ phase: 'glow' }) : nextQuestion())

  const header = (
    <div className="topbar convo">
      <button className="link" onClick={() => set({ screen: 'home' })}>← home</button>
      <strong>Plum</strong>
      <span className="topbar-right">
        <span>{q} of {TOTAL}</span>
        <button className="dots-btn" aria-label="menu" onClick={() => setC({ menu: menu === 'open' ? null : 'open' })}>···</button>
      </span>
      {menu === 'open' && (
        <div className="menu">
          <button className="link" onClick={() => setC({ menu: 'confirm' })}>end this prelude</button>
        </div>
      )}
    </div>
  )

  if (menu === 'confirm') {
    return (
      <>
        {header}
        <div className="middle">
          <div className="card glow">
            <h1 className="title">end quietly?</h1>
            <p className="body">plum won't be told why.</p>
            <div className="row">
              <button className="btn secondary" onClick={() => setC({ menu: null })}>Keep going</button>
              <button className="btn primary" onClick={() => set((p) => ({ screen: 'home', status: 'ended', convo: { ...p.convo, menu: null } }))}>End quietly</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (phase === 'answer') {
    return (
      <>
        {header}
        <button className="link" onClick={() => setC({ phase: 'read' })}>← plum's answer</button>
        <Answer
          key={q}
          s={s}
          set={set}
          forPlum
          label="your turn"
          question={item.q}
          onSend={(text) => setC({ phase: 'sent', mine: text })}
        />
      </>
    )
  }

  if (phase === 'facesReveal') {
    return (
      <>
        {header}
        <div className="middle center">
          <p className="label">afterglow · faces</p>
          <h1 className="title">it's mutual.</h1>
          <div className="faces">
            <div className="photo reveal">[plum's face]</div>
            <div className="photo reveal">[your face]</div>
          </div>
          <p className="hint">you're both seeing this at the same moment.</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={nextQuestion}>Continue</button>
        </div>
      </>
    )
  }

  if (phase.startsWith('glow')) {
    const isMeet = milestone.key === 'meet'
    return (
      <>
        {header}
        <div className="middle">
          <div className="card glow">
            <p className="label">afterglow · only opens if you both say yes</p>
            {phase === 'glow' && (
              <>
                <h1 className="title">{milestone.ask}</h1>
                <p className="body">{milestone.detail}</p>
                <p className="hint">plum is being asked the same thing. a "no" is never shown.</p>
                <div className="row">
                  <button className="btn secondary" onClick={() => setC({ phase: 'glowNo' })}>Not yet</button>
                  <button className="btn primary" onClick={() => setC({ phase: 'glowWait' })}>Yes</button>
                </div>
              </>
            )}
            {phase === 'glowWait' && (
              <>
                <h1 className="title">we'll tell you if it's mutual.</h1>
                {plumYes ? (
                  <p className="hint">[prototype: simulating plum's answer…]</p>
                ) : (
                  <>
                    <p className="body">no rush. nothing changes until then.</p>
                    <p className="hint">[prototype: plum is set to "not yet" in the tester panel, so nothing more is shown]</p>
                    {isMeet ? (
                      <button className="btn primary" onClick={() => set({ screen: 'home' })}>Back home</button>
                    ) : (
                      <button className="btn primary" onClick={nextQuestion}>Keep going</button>
                    )}
                  </>
                )}
              </>
            )}
            {phase === 'glowMutual' && (
              <>
                <h1 className="title">{milestone.mutual}</h1>
                <button className="btn primary" onClick={nextQuestion}>
                  {isMeet ? 'See the plan' : 'Continue'}
                </button>
              </>
            )}
            {phase === 'glowNo' && (
              <>
                <h1 className="title">that's okay. no rush.</h1>
                <p className="body">plum will never know. {isMeet ? 'say the word whenever you are ready.' : "we'll ask again later."}</p>
                {isMeet ? (
                  <div className="row">
                    <button className="btn secondary" onClick={() => set({ screen: 'home' })}>Back home</button>
                    <button className="btn primary" onClick={() => setC({ phase: 'glow' })}>Ask me again</button>
                  </div>
                ) : (
                  <button className="btn primary" onClick={nextQuestion}>Continue</button>
                )}
              </>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <Progress value={q / TOTAL} />
      <h1 className="question">{item.q}</h1>

      <div className="card">
        <p className="label who">
          {facesOn && <span className="face">[face]</span>}
          plum
        </p>
        <Voice length={item.length} />
        <p className="transcript">“{item.a}”</p>
        {item.photo && <PhotoBox label={item.photo} />}
      </div>

      {phase === 'read' && (
        <div className="actions">
          <button className="btn primary" onClick={() => setC({ phase: 'answer' })}>Your turn</button>
          <button className="link center" onClick={advance}>[tester] skip ahead →</button>
        </div>
      )}

      {(phase === 'sent' || phase === 'ready') && (
        <>
          <div className="card">
            <p className="label">you</p>
            {mine ? <p className="transcript">“{mine}”</p> : <p className="transcript">[your voice answer · transcript]</p>}
          </div>
          <p className="body center">plum hears it only once you've both answered.</p>
          <div className="actions">
            {phase === 'sent' ? (
              <p className="hint center">[prototype: plum is answering…]</p>
            ) : (
              <>
                <p className="hint center">
                  {q < TOTAL ? 'plum has answered the next question.' : 'you have both answered all twelve.'}
                </p>
                <button className="btn primary" onClick={advance}>
                  {q < TOTAL && !(milestone && glow[milestone.key] !== 'yes') ? 'Next question' : 'Continue'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}

function Ending({ set }) {
  return (
    <>
      <div className="middle center">
        <h1 className="title">this prelude has ended.</h1>
        <p className="body">it's about timing, not you.</p>
      </div>
      <div className="actions">
        <button className="btn primary" onClick={() => set({ screen: 'home', status: 'ended' })}>back home</button>
      </div>
    </>
  )
}

/* ---------- 5. meeting and power down ---------- */

function Plan({ s, set }) {
  const { phase } = s.plan
  const activity = pickActivity(s)
  const setP = (patch) => set((p) => ({ plan: { ...p.plan, ...patch } }))

  useEffect(() => {
    if (phase !== 'offered') return
    const t = setTimeout(() => set((p) => ({ screen: 'numbers', plan: { ...p.plan, phase: 'set', numbers: 'ask' } })), MUTUAL_DELAY)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'set') {
    return (
      <>
        <p className="label">side by side · with plum</p>
        <h1 className="headline">it's set.</h1>
        <div className="card">
          <p className="label">the plan</p>
          <p className="body big">{activity.text}</p>
          <p className="hint">[free public place]</p>
          {s.plan.numbers === 'mutual' && <p className="hint">plum's number is in your contacts.</p>}
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => set({ screen: 'powerdown', status: 'finished' })}>All set</button>
          <button className="link center quiet" onClick={() => set({ screen: 'cameup' })}>something came up</button>
        </div>
      </>
    )
  }

  return (
    <>
      <p className="label">side by side</p>
      <h1 className="headline">You both said yes.</h1>

      <div className="card">
        <p className="label">a suggestion for you and plum</p>
        <p className="body big">{activity.text}</p>
        <p className="hint">[free public place]</p>
        <p className="hint">chosen around: “{firstGuess(s).text}”</p>
        {s.basics.area && <p className="hint">near {s.basics.area}.</p>}
        <PhotoBox label="map of the meeting place" />
      </div>

      <div className="actions">
        {phase === 'offered' ? (
          <>
            <p className="body center">we're asking plum too.</p>
            <p className="hint center">[prototype: simulating plum accepting…]</p>
          </>
        ) : (
          <>
            <button className="btn primary" onClick={() => setP({ phase: 'offered' })}>Sounds good</button>
            <button className="btn secondary" onClick={() => setP({ activity: s.plan.activity + 1 })}>Suggest something else</button>
          </>
        )}
      </div>
    </>
  )
}

function Numbers({ s, set }) {
  const phase = s.plan.numbers
  const plumYes = s.tester.glow.numbers === 'yes'
  const setN = (numbers) => set((p) => ({ plan: { ...p.plan, numbers } }))
  const toPlan = () => set({ screen: 'plan' })

  useEffect(() => {
    if (phase !== 'wait' || !plumYes) return
    const t = setTimeout(() => setN('mutual'), MUTUAL_DELAY)
    return () => clearTimeout(t)
  }, [phase, plumYes])

  return (
    <>
      <p className="label">plum said yes to the plan.</p>
      <div className="middle">
        <div className="card glow">
          <p className="label">afterglow · only opens if you both say yes</p>
          {phase === 'ask' && (
            <>
              <h1 className="title">share numbers?</h1>
              <p className="body">so you can reach each other on the day, without the app.</p>
              <div className="row">
                <button className="btn secondary" onClick={() => setN('no')}>Not yet</button>
                <button className="btn primary" onClick={() => setN('wait')}>Yes</button>
              </div>
            </>
          )}
          {phase === 'wait' && (
            <>
              <h1 className="title">we'll tell you if it's mutual.</h1>
              {plumYes ? (
                <p className="hint">[prototype: simulating plum's answer…]</p>
              ) : (
                <>
                  <p className="body">the plan stays as agreed.</p>
                  <p className="hint">[prototype: plum is set to "not yet" in the tester panel, so nothing more is shown]</p>
                  <button className="btn primary" onClick={toPlan}>Continue</button>
                </>
              )}
            </>
          )}
          {phase === 'mutual' && (
            <>
              <h1 className="title">it's mutual.</h1>
              <p className="body">you can find plum's number in your contacts.</p>
              <button className="btn primary" onClick={toPlan}>Continue</button>
            </>
          )}
          {phase === 'no' && (
            <>
              <h1 className="title">that's okay.</h1>
              <p className="body">the plan stays as agreed.</p>
              <button className="btn primary" onClick={toPlan}>Continue</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function CameUp({ s, set }) {
  return (
    <>
      <div className="middle">
        <h1 className="title">something came up.</h1>
        <p className="body">that happens. no explanation needed.</p>
      </div>
      <div className="actions">
        <button
          className="btn primary"
          onClick={() => set({ screen: 'plan', status: 'plan', plan: { ...FRESH_PLAN, activity: s.plan.activity + 1 } })}
        >
          Reschedule
        </button>
        <button className="btn secondary" onClick={() => set({ screen: 'faded', status: 'ended' })}>Let it fade</button>
        <button className="link center" onClick={() => set({ screen: 'plan' })}>never mind, keep the plan</button>
      </div>
    </>
  )
}

function Faded({ set }) {
  return (
    <>
      <div className="middle center">
        <h1 className="title">it's faded, quietly.</h1>
        <p className="body">plum will only see that it ended. never why.</p>
      </div>
      <div className="actions">
        <button className="btn primary" onClick={() => set({ screen: 'home' })}>back home</button>
      </div>
    </>
  )
}

function Powerdown({ set }) {
  return (
    <>
      <div className="middle center">
        <div className="flower" aria-hidden="true">
          {[-100, -50, 0, 50, 100].map((a) => (
            <span key={a} className="petal" style={{ '--a': `${a}deg` }} />
          ))}
          <span className="stem" />
        </div>
        <h1 className="headline">that's it from us. enjoy it.</h1>
        <p className="body late">no reminders, no tips. we'll be quiet until afterwards.</p>
      </div>
      <div className="actions">
        <button className="link center" onClick={() => set({ screen: 'after', after: FRESH_AFTER })}>
          [prototype] the day after →
        </button>
      </div>
    </>
  )
}

/* ---------- 6. after the meeting ---------- */

function After({ s, set }) {
  const a = s.after
  const setA = (patch) => set((p) => ({ after: { ...p.after, ...patch } }))
  const mutualFeel = a.feel === 'more than friends' && s.tester.feel === 'more than friends'
  const wrongLink = (
    <button className="link center quiet" onClick={() => set({ screen: 'wrong' })}>something felt wrong</button>
  )
  const Choices = ({ options, onPick }) => (
    <div className="options">
      {options.map((o) => (
        <button key={o} className="option" onClick={() => onPick(o)}>{o}</button>
      ))}
    </div>
  )

  let body
  if (a.step === 'met') {
    body = (
      <>
        <h1 className="title">did you meet?</h1>
        <Choices
          options={['yes', "it didn't happen", 'rather not say']}
          onPick={(o) =>
            o === 'yes' ? setA({ step: 'self' }) : o === 'rather not say' ? set({ screen: 'next' }) : setA({ step: 'nomeet' })
          }
        />
      </>
    )
  } else if (a.step === 'nomeet') {
    body = (
      <>
        <h1 className="title">that's okay. it happens.</h1>
        <p className="body">what would you like to do?</p>
        <div className="options">
          <button className="btn primary" onClick={() => set((p) => ({ screen: 'plan', status: 'plan', plan: { ...FRESH_PLAN, activity: p.plan.activity + 1 } }))}>Try another time</button>
          <button className="btn secondary" onClick={() => set({ screen: 'faded', status: 'ended' })}>Let it fade</button>
        </div>
      </>
    )
  } else if (a.step === 'self') {
    body = (
      <>
        <h1 className="title">did you feel like yourself?</h1>
        <p className="hint">just for you. plum never sees this.</p>
        <Choices options={['yes', 'not really']} onPick={(o) => setA({ self: o, step: 'feel' })} />
      </>
    )
  } else if (a.step === 'feel') {
    body = (
      <>
        <h1 className="title">how did it feel?</h1>
        <p className="hint">plum is asked the same. you only see where you overlap.</p>
        <Choices options={FEEL_OPTIONS} onPick={(o) => setA({ feel: o, step: 'feelResult' })} />
      </>
    )
  } else if (a.step === 'feelResult') {
    body = (
      <>
        <h1 className="title">{mutualFeel ? "it's mutual. more than friends." : "you're friends."}</h1>
        <div className="options">
          <button className="btn primary" onClick={() => setA({ step: 'again' })}>Continue</button>
        </div>
      </>
    )
  } else if (a.step === 'again') {
    body = (
      <>
        <h1 className="title">meet again?</h1>
        <p className="hint">you'll only see plum's answer if it matches yours.</p>
        <Choices
          options={['yes', 'not yet']}
          onPick={(o) =>
            o === 'yes' && s.tester.again === 'yes'
              ? set((p) => ({ status: 'people', after: { ...p.after, again: o, step: 'people' } }))
              : setA({ again: o, step: 'againQuiet' })
          }
        />
      </>
    )
  } else if (a.step === 'againQuiet') {
    body = (
      <>
        <h1 className="title">noted.</h1>
        <p className="body">you'll only hear about it if it's mutual.</p>
        <div className="options">
          <button className="btn primary" onClick={() => set({ screen: 'next' })}>Continue</button>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <h1 className="title">plum is now one of your people.</h1>
        <p className="body">you'll find plum on your home screen. no more questions from us.</p>
        <div className="options">
          <button className="btn primary" onClick={() => set({ screen: 'next' })}>Continue</button>
        </div>
      </>
    )
  }

  return (
    <>
      <p className="label">after the meeting · plum</p>
      <div className="middle">{body}</div>
      <div className="actions">{wrongLink}</div>
    </>
  )
}

function Wrong({ set }) {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const back = () => set({ screen: 'after' })

  if (sent) {
    return (
      <>
        <div className="middle">
          <h1 className="title">thank you for telling us.</h1>
          <p className="body">a person on our team will read this today. plum is not told.</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={back}>Back</button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="topbar">
        <button className="link" onClick={back}>← back</button>
      </div>
      <h1 className="title">we're here. tell us what happened.</h1>
      <p className="hint">only our team reads this. plum is not told.</p>
      <textarea className="field" rows={6} placeholder="in your own words." value={text} onChange={(e) => setText(e.target.value)} />
      <div className="actions">
        <button className="btn primary" disabled={!text.trim()} onClick={() => setSent(true)}>send to our team</button>
      </div>
    </>
  )
}

function Next({ set }) {
  return (
    <>
      <div className="middle">
        <h1 className="title">ready for someone new?</h1>
        <p className="body">no rush either way.</p>
      </div>
      <div className="actions">
        <button className="btn primary" onClick={() => set({ screen: 'paywall' })}>Yes, someone new</button>
        <button className="btn secondary" onClick={() => set({ screen: 'home', paused: true })}>Not looking right now</button>
      </div>
    </>
  )
}

function Paywall({ set }) {
  return (
    <>
      <div className="middle">
        <h1 className="title">your first prelude was free.</h1>
        <div className="card dashed">
          <p className="muted">[subscription · price tbd]</p>
        </div>
      </div>
      <div className="actions">
        <button className="btn primary" onClick={() => set({ screen: 'matching', picks: {}, matchArrived: false, paused: false })}>continue</button>
        <button className="link center" onClick={() => set({ screen: 'home' })}>not now</button>
      </div>
    </>
  )
}

const SCREENS = {
  welcome: Welcome,
  how: How,
  reflect: Reflect,
  mirror: Mirror,
  basics: Basics,
  matching: Matching,
  waiting: Waiting,
  qotd: Qotd,
  match: Match,
  pace: Pace,
  home: Home,
  conversation: Conversation,
  ending: Ending,
  plan: Plan,
  numbers: Numbers,
  cameup: CameUp,
  faded: Faded,
  powerdown: Powerdown,
  after: After,
  wrong: Wrong,
  next: Next,
  paywall: Paywall,
}
