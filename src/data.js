// All mock content for the prototype lives here.

// Prelude colours. Pink and butter are reserved for the next preludes.
export const COLOURS = {
  lilac: '#d9b8f2',
  mint: '#a8e3b5',
  pink: '#f4a6b8',
  butter: '#f4d35e',
}

export const FIRST_QUESTION = 'when did you last feel completely at ease with someone?'

export const HOW_IT_WORKS = [
  "you hear each other only once you've both answered.",
  'everything opens only when you both say yes.',
  'once you meet, we step back.',
]

export const REFLECT_QUESTIONS = [
  'think of the last time you left somewhere early. what made you leave?',
  'describe a day that left you with more energy than you started with.',
]

// Mirror card: simulated guesses drawn from the first three answers.
export const GUESSES = [
  "you recharge alone, but like company that doesn't need talking.",
  'loud places with no easy exit drain you.',
  'you open up when your hands are busy.',
]

export const PHOTOS_DEFAULT = 'later, when we both want to'
export const PHOTO_OPTIONS = [PHOTOS_DEFAULT, 'from the start', 'only when we meet']

export const BASICS = {
  open: {
    title: 'what are you open to?',
    hint: 'we only match people whose answers overlap.',
    options: ['romance', 'friendship', 'both'],
  },
  who: {
    title: 'who would you like to meet?',
    hint: 'only used to decide whose answers you hear. never shown.',
    options: ['women', 'men', 'everyone'],
  },
  photos: {
    title: 'when would you like to share photos?',
    hint: 'nothing is shown unless you both choose it.',
    options: PHOTO_OPTIONS,
  },
  area: {
    title: 'your area',
    hint: 'so a meeting can be somewhere close. never shown exactly.',
  },
}

export const QUESTION_OF_THE_DAY = 'what did you notice today that nobody else did?'

// Anonymous answers shown in mutual matching: no name, no photo.
export const ANON_CARDS = [
  {
    id: 'a',
    question: FIRST_QUESTION,
    length: '0:14',
    transcript:
      "with the lady at the bakery. she remembered my order. she didn't say a word, just smiled.",
  },
  {
    id: 'b',
    question: REFLECT_QUESTIONS[0],
    length: '0:21',
    transcript:
      "a birthday dinner. twelve people, one long table, nowhere to look. i said i had a train. i didn't.",
  },
  {
    id: 'c',
    question: REFLECT_QUESTIONS[1],
    length: '0:17',
    transcript:
      'a saturday helping a friend paint her hallway. radio on, hardly a word. i walked home humming.',
  },
]

export const PLUM_FIRST = {
  question: FIRST_QUESTION,
  length: '0:19',
  transcript:
    "at my sister's, last month. she was cooking, i was shelling peas. we didn't talk for an hour. best conversation i'd had in weeks.",
  photo: 'bowl of peas',
}

export const PACE_OPTIONS = ['a question a day', 'every few days']

// The 12 conversation questions with Plum's (mock) answers.
export const QUESTIONS = [
  {
    q: 'what does a good quiet morning look like for you?',
    length: '0:16',
    a: 'radio low, window open, nobody needing anything from me until ten. toast i actually sit down for.',
    photo: 'kitchen table',
  },
  {
    q: "what's a sound you love that most people don't notice?",
    length: '0:12',
    a: "the click of the heating coming on. it means someone decided it's cold enough to be kind.",
  },
  {
    q: 'what is a place you keep going back to?',
    length: '0:22',
    a: 'the second-hand bookshop on the corner. i rarely buy anything. the owner lets me read the first pages standing up.',
    photo: 'bookshop shelf',
  },
  {
    q: "what do you do with your hands when you're thinking?",
    length: '0:10',
    a: 'i peel the label off whatever i am holding. bottles, jars, once a library book. i felt terrible.',
  },
  {
    q: 'when did you last lose track of time?',
    length: '0:18',
    a: "repotting a plant that didn't need it. i looked up and it was dark and i had soil on my elbows.",
    photo: 'plant on a windowsill',
  },
  {
    q: "what's something you're slowly getting better at?",
    length: '0:15',
    a: "leaving a party without apologising. i'm at about sixty percent.",
  },
  {
    q: 'who makes you feel easy to be around, and why?',
    length: '0:24',
    a: "my sister. she talks to me from another room and doesn't mind if i answer late.",
  },
  {
    q: 'what do you wish people asked you about?',
    length: '0:13',
    a: "the maps i draw of places i've only been to once. nobody knows i do that. well. you do now.",
    photo: 'hand-drawn map',
  },
  {
    q: 'what do you need after a long day with people?',
    length: '0:11',
    a: 'forty minutes of nothing. then soup. in that order.',
  },
  {
    q: "what's a small ritual you'd never give up?",
    length: '0:17',
    a: 'walking the long way home on fridays, past the canal. i count the boats with lights on.',
    photo: 'canal at dusk',
  },
  {
    q: 'what would a good first hour together look like?',
    length: '0:20',
    a: "walking somewhere, not sitting opposite each other. something to look at so we don't have to look at each other the whole time.",
  },
  {
    q: "what's something you'd like to show someone, not tell them?",
    length: '0:14',
    a: 'the view from the footbridge at eleven in the morning. i could describe it, but i would rather stand there.',
    photo: 'footbridge',
  },
]

// Afterglow (mutual reveal) moments, keyed by the question they follow.
export const AFTERGLOW = {
  4: { key: 'world', ask: 'share world photos?', detail: 'things, places, views. not faces yet.', mutual: "it's mutual. world photos are open." },
  8: { key: 'faces', ask: 'share faces?', detail: 'you would both see each other at the same moment.', mutual: "it's mutual." },
  12: { key: 'meet', ask: 'ready to meet?', detail: 'somewhere public and free, something to do side by side.', mutual: "it's mutual. you both said yes." },
}

// Side by Side suggestions: free public places only.
// `fits` lists the mirror guesses (by index in GUESSES) each one suits.
export const ACTIVITIES = [
  {
    text: 'a slow walk along the river path, saturday 11:00. open air, easy to leave anytime.',
    fits: [0, 1],
  },
  {
    text: 'the sunday flower market, 10:00. free to wander. something to look at, no need to fill the silences.',
    fits: [0],
  },
  {
    text: 'feeding the ducks at the park pond, saturday 15:00. hands busy, benches nearby.',
    fits: [2],
  },
  {
    text: 'the reading garden behind the public library, thursday 17:30. quiet by design, gate always open.',
    fits: [1, 0],
  },
  {
    text: 'the community garden open day, sunday 14:00. free. they always need help watering.',
    fits: [2, 1],
  },
]

export const FEEL_OPTIONS = ['friends', 'more than friends', 'not sure']
