import { displayNote, getFretWindow, mod12, NOTE_NAMES } from './music.ts'

export type Finger = 0 | 1 | 2 | 3 | 4
export type Barre = Readonly<{ fret: number; fromString: number; toString: number; finger: Exclude<Finger, 0> }>
export type GuitarStrings<T> = readonly [T, T, T, T, T, T]
export type ChordVoicing = Readonly<{
  id: string
  name: string
  /** Standard tuning, low E to high E. null = mute, 0 = open. */
  frets: GuitarStrings<number | null>
  fingers: GuitarStrings<Finger | null>
  /** String numbers follow guitar convention: 1 = high E, 6 = low E. */
  barres: readonly Barre[]
  /** Conventional omitted tones, expressed as semitones above the root. */
  omittedIntervals?: readonly number[]
}>

type OpenShape = ChordVoicing & { root: number; structureId: string }
type MovableShape = ChordVoicing & { root: number; structureId: string }

const barre = (fret: number, fromString: number, toString: number, finger: Barre['finger'] = 1): Barre => ({ fret, fromString, toString, finger })
const open = (root: number, structureId: string, id: string, frets: ChordVoicing['frets'], fingers: ChordVoicing['fingers'], barres: readonly Barre[] = [], name = 'Open position'): OpenShape => ({ root, structureId, id, name, frets, fingers, barres })
const movable = (root: number, structureId: string, id: string, name: string, frets: ChordVoicing['frets'], fingers: ChordVoicing['fingers'], barres: readonly Barre[] = []): MovableShape => ({ root, structureId, id, name, frets, fingers, barres })

// Small, deliberately curated grips, not an enumeration of every chord-tone combination.
// Foundational open C/G/D and E-shape G barre cross-checked against Fender lessons:
// https://www.fender.com/articles/chords/essential-beginner-chords-g-c-d
// https://www.fender.com/articles/chords/learn-how-to-play-the-g-major-chord-on-guitar
// https://www.fender.com/articles/chords/learn-how-to-play-a-minor-guitar-chord
// https://www.fender.com/articles/chords/learn-how-to-play-c7-guitar-chord
// Suspensions replace the third; diminished here means a triad, never dim7 or m7b5.
// Remaining variants are derived from these grips and checked against independent pitch sets.
const OPEN_SHAPES: readonly OpenShape[] = [
  open(4,'major-6','open-e6',[0,2,2,1,2,0],[0,2,3,1,4,0]),
  open(9,'major-6','open-a6',[null,0,2,2,2,2],[null,0,1,1,1,1],[barre(2,4,1)]),
  open(4,'minor-6','open-em6',[0,2,2,0,2,0],[0,1,2,0,3,0]),
  open(9,'minor-6','open-am6',[null,0,2,2,1,2],[null,0,2,3,1,4]),
  open(0,'add9','open-cadd9',[null,3,2,0,3,3],[null,2,1,0,3,4]),
  open(4,'add9','open-eadd9',[0,2,4,1,0,0],[0,2,4,1,0,0]),
  open(9,'add9','open-aadd9',[null,0,2,4,2,0],[null,0,1,3,2,0]),
  open(4,'dominant-9','open-e9',[0,2,0,1,0,2],[0,2,0,1,0,3]),
  open(4,'minor-9','open-em9',[0,2,0,0,0,2],[0,1,0,0,0,2]),
  open(0, 'major-chord', 'open-c', [null, 3, 2, 0, 1, 0], [null, 3, 2, 0, 1, 0]),
  open(5, 'major-chord', 'compact-f', [null, null, 3, 2, 1, 1], [null, null, 3, 2, 1, 1], [barre(1, 2, 1)], 'Compact F · four strings'),
  open(9, 'major-chord', 'open-a', [null, 0, 2, 2, 2, 0], [null, 0, 1, 2, 3, 0]),
  open(7, 'major-chord', 'open-g', [3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]),
  open(7, 'major-chord', 'open-g-four-finger', [3, 2, 0, 0, 3, 3], [2, 1, 0, 0, 3, 4], [], 'Open G · four fingers'),
  open(4, 'major-chord', 'open-e', [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]),
  open(2, 'major-chord', 'open-d', [null, null, 0, 2, 3, 2], [null, null, 0, 1, 3, 2]),
  open(9, 'minor-chord', 'open-am', [null, 0, 2, 2, 1, 0], [null, 0, 2, 3, 1, 0]),
  open(4, 'minor-chord', 'open-em', [0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0]),
  open(2, 'minor-chord', 'open-dm', [null, null, 0, 2, 3, 1], [null, null, 0, 2, 3, 1]),
  { ...open(0, 'dominant-7', 'open-c7', [null, 3, 2, 3, 1, 0], [null, 3, 2, 4, 1, 0]), omittedIntervals: [7] },
  open(11, 'dominant-7', 'open-b7', [null, 2, 1, 2, 0, 2], [null, 2, 1, 3, 0, 4]),
  open(9, 'dominant-7', 'open-a7', [null, 0, 2, 0, 2, 0], [null, 0, 2, 0, 3, 0]),
  open(7, 'dominant-7', 'open-g7', [3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 1]),
  open(4, 'dominant-7', 'open-e7', [0, 2, 0, 1, 0, 0], [0, 2, 0, 1, 0, 0]),
  open(2, 'dominant-7', 'open-d7', [null, null, 0, 2, 1, 2], [null, null, 0, 2, 1, 3]),
  open(0, 'major-7', 'open-cmaj7', [null, 3, 2, 0, 0, 0], [null, 3, 2, 0, 0, 0]),
  open(9, 'major-7', 'open-amaj7', [null, 0, 2, 1, 2, 0], [null, 0, 2, 1, 3, 0]),
  open(7, 'major-7', 'open-gmaj7', [3, 2, 0, 0, 0, 2], [3, 1, 0, 0, 0, 2]),
  open(4, 'major-7', 'open-emaj7', [0, 2, 1, 1, 0, 0], [0, 3, 1, 2, 0, 0]),
  open(2, 'major-7', 'open-dmaj7', [null, null, 0, 2, 2, 2], [null, null, 0, 1, 1, 1], [barre(2, 3, 1)]),
  open(9, 'minor-7', 'open-am7', [null, 0, 2, 0, 1, 0], [null, 0, 2, 0, 1, 0]),
  open(4, 'minor-7', 'open-em7', [0, 2, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0]),
  open(2, 'minor-7', 'open-dm7', [null, null, 0, 2, 1, 1], [null, null, 0, 2, 1, 1], [barre(1, 2, 1)]),
  open(9, 'sus2', 'open-asus2', [null, 0, 2, 2, 0, 0], [null, 0, 1, 2, 0, 0]),
  open(2, 'sus2', 'open-dsus2', [null, null, 0, 2, 3, 0], [null, null, 0, 1, 3, 0]),
  open(9, 'sus4', 'open-asus4', [null, 0, 2, 2, 3, 0], [null, 0, 1, 2, 3, 0]),
  open(4, 'sus4', 'open-esus4', [0, 2, 2, 2, 0, 0], [0, 1, 2, 3, 0, 0]),
  open(2, 'sus4', 'open-dsus4', [null, null, 0, 2, 3, 3], [null, null, 0, 1, 3, 4]),
  open(2, 'diminished', 'open-ddim', [null, null, 0, 1, 3, 1], [null, null, 0, 1, 3, 2]),
  open(4, 'augmented', 'open-eaug', [0, 3, 2, 1, 1, 0], [0, 4, 3, 1, 1, 0], [barre(1, 3, 2)]),
  open(9, 'augmented', 'open-aaug', [null, 0, 3, 2, 2, 1], [null, 0, 4, 2, 3, 1]),
]

// Frets are offsets from the root's position on E, A, or D. A zero offset in a
// movable template is fretted by the indicated finger, not played as an open string.
// Prefer compact triads to impractical six-string diminished/augmented stretches.
const MOVABLE_SHAPES: readonly MovableShape[] = [
  { ...movable(4,'major-6','e-six','E-string sixth',[0,null,2,1,2,null],[1,null,3,2,4,null]), omittedIntervals:[7] },
  movable(9,'major-6','a-six','A-shape sixth',[null,0,2,2,2,2],[null,1,3,3,3,3],[barre(2,4,1,3)]),
  { ...movable(4,'minor-6','e-minor-six','E-string minor sixth',[0,null,2,0,2,null],[1,null,3,1,4,null],[barre(0,6,3)]), omittedIntervals:[7] },
  movable(9,'minor-6','a-minor-six','A-shape minor sixth',[null,0,2,2,1,2],[null,1,3,3,2,4],[barre(2,4,3,3)]),
  movable(9,'add9','c-add-nine','C-shape add9',[null,0,-1,-3,0,null],[null,3,2,1,4,null]),
  movable(4,'add9','e-add-nine','E-shape add9',[0,2,4,1,0,0],[1,3,4,2,1,1],[barre(0,6,1)]),
  movable(9,'dominant-9','a-nine','A-string ninth',[null,0,-1,0,0,0],[null,2,1,3,3,3],[barre(0,3,1,3)]),
  movable(4,'dominant-9','e-nine','E-string ninth',[0,null,0,1,0,2],[1,null,1,2,1,3],[barre(0,6,2)]),
  { ...movable(9,'major-9','a-major-nine','A-string major ninth',[null,0,-1,1,0,null],[null,2,1,4,3,null]), omittedIntervals:[7] },
  movable(4,'major-9','e-major-nine','E-string major ninth',[0,null,1,1,0,2],[1,null,2,2,1,4],[barre(0,6,2),barre(1,4,3,2)]),
  movable(9,'minor-9','a-minor-nine','A-string minor ninth',[null,0,-2,0,0,0],[null,2,1,3,3,3],[barre(0,3,1,3)]),
  movable(4,'minor-9','e-minor-nine','E-shape minor ninth',[0,2,0,0,0,2],[1,3,1,1,1,4],[barre(0,6,2)]),
  movable(9,'diminished-7','a-dim-seven','A-string diminished seventh',[null,0,1,-1,1,null],[null,2,3,1,4,null]),
  movable(4,'diminished-7','e-dim-seven','E-string diminished seventh',[0,null,-1,0,-1,null],[2,null,1,3,1,null],[barre(-1,4,2)]),
  movable(9,'half-diminished','a-half-dim','A-string half-diminished',[null,0,1,0,1,null],[null,1,3,2,4,null]),
  movable(4,'half-diminished','e-half-dim','E-string half-diminished',[0,null,0,0,-1,null],[2,null,3,4,1,null]),
  movable(9,'7sus4','a-seven-sus','A-shape suspended seventh',[null,0,2,0,3,0],[null,1,3,1,4,1],[barre(0,5,1)]),
  movable(4,'7sus4','e-seven-sus','E-shape suspended seventh',[0,2,0,2,0,0],[1,3,1,4,1,1],[barre(0,6,1)]),
  { ...movable(9,'dominant-11','a-eleven','A-string eleventh',[null,0,0,0,0,0],[null,1,1,1,1,1],[barre(0,5,1)]), omittedIntervals:[4] },
  { ...movable(4,'dominant-11','e-eleven','E-string eleventh',[0,null,0,2,0,2],[1,null,1,3,1,4],[barre(0,6,2)]), omittedIntervals:[4] },
  { ...movable(9,'dominant-13','a-thirteen','A-string thirteenth',[null,0,2,0,2,2],[null,1,3,1,4,4],[barre(0,5,3),barre(2,2,1,4)]), omittedIntervals:[2,5] },
  { ...movable(4,'dominant-13','e-thirteen','E-string thirteenth',[0,null,0,1,2,2],[1,null,1,2,3,3],[barre(0,6,4),barre(2,2,1,3)]), omittedIntervals:[7,5] },
  movable(4, 'major-chord', 'e-major', 'E-shape barre', [0, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1], [barre(0, 6, 1)]),
  movable(9, 'major-chord', 'a-major', 'A-shape partial barre', [null, 0, 2, 2, 2, null], [null, 1, 3, 3, 3, null], [barre(2, 4, 2, 3)]),
  movable(4, 'minor-chord', 'e-minor', 'E-shape barre', [0, 2, 2, 0, 0, 0], [1, 3, 4, 1, 1, 1], [barre(0, 6, 1)]),
  movable(9, 'minor-chord', 'a-minor', 'A-shape barre', [null, 0, 2, 2, 1, 0], [null, 1, 3, 4, 2, 1], [barre(0, 5, 1)]),
  movable(4, 'dominant-7', 'e-seven', 'E-shape barre', [0, 2, 0, 1, 0, 0], [1, 3, 1, 2, 1, 1], [barre(0, 6, 1)]),
  movable(9, 'dominant-7', 'a-seven', 'A-shape barre', [null, 0, 2, 0, 2, 0], [null, 1, 3, 1, 4, 1], [barre(0, 5, 1)]),
  movable(4, 'minor-7', 'e-minor-seven', 'E-shape barre', [0, 2, 0, 0, 0, 0], [1, 3, 1, 1, 1, 1], [barre(0, 6, 1)]),
  movable(9, 'minor-7', 'a-minor-seven', 'A-shape barre', [null, 0, 2, 0, 1, 0], [null, 1, 3, 1, 2, 1], [barre(0, 5, 1)]),
  movable(4, 'major-7', 'e-major-seven', 'E-string compact grip', [0, null, 1, 1, 0, null], [1, null, 3, 4, 2, null]),
  movable(9, 'major-7', 'a-major-seven', 'A-shape barre', [null, 0, 2, 1, 2, 0], [null, 1, 3, 2, 4, 1], [barre(0, 5, 1)]),
  movable(9, 'sus2', 'a-sus-two', 'A-shape barre', [null, 0, 2, 2, 0, 0], [null, 1, 3, 4, 1, 1], [barre(0, 5, 1)]),
  movable(2, 'sus2', 'd-sus-two', 'D-shape barre', [null, null, 0, 2, 3, 0], [null, null, 1, 3, 4, 1], [barre(0, 4, 1)]),
  movable(9, 'sus4', 'a-sus-four', 'A-shape barre', [null, 0, 2, 2, 3, 0], [null, 1, 2, 3, 4, 1], [barre(0, 5, 1)]),
  movable(2, 'sus4', 'd-sus-four', 'D-shape partial barre', [null, null, 0, 2, 3, 3], [null, null, 1, 2, 3, 3], [barre(3, 2, 1, 3)]),
  movable(9, 'diminished', 'a-diminished', 'A-string compact triad', [null, 0, 1, 2, 1, null], [null, 1, 2, 4, 3, null]),
  movable(2, 'diminished', 'd-diminished', 'D-string compact triad', [null, null, 0, 1, 3, 1], [null, null, 1, 2, 4, 3]),
  movable(4, 'augmented', 'e-augmented', 'E-string augmented grip', [0, null, 2, 1, 1, null], [1, null, 4, 2, 2, null], [barre(1, 3, 2, 2)]),
  movable(9, 'augmented', 'a-augmented', 'A-string augmented grip', [null, 0, 3, 2, 2, null], [null, 1, 4, 3, 3, null], [barre(2, 3, 2, 3)]),
]

const SUFFIXES: Readonly<Record<string, string>> = {
  'major-chord': '', 'minor-chord': 'm', 'major-7': 'maj7', 'minor-7': 'm7',
  'major-6': '6', 'minor-6': 'm6', add9: 'add9', 'dominant-9': '9', 'major-9': 'maj9', 'minor-9': 'm9', 'diminished-7': 'dim7', 'half-diminished': 'm7♭5', '7sus4': '7sus4', 'dominant-11': '11', 'dominant-13': '13',
  'dominant-7': '7', sus2: 'sus2', sus4: 'sus4', diminished: 'dim', augmented: 'aug',
}
const OPEN_MIDI = [40, 45, 50, 55, 59, 64] as const

export function chordLabel(root: number, structureId: string): string {
  if (!Number.isInteger(root)) return '—'
  return `${displayNote(NOTE_NAMES[mod12(root)])}${SUFFIXES[structureId] ?? ''}`
}

export function getChordVoicings(root: number, structureId: string): ChordVoicing[] {
  if (!Number.isInteger(root) || !Object.hasOwn(SUFFIXES, structureId)) return []
  const pitchClass = mod12(root)
  const openShapes = OPEN_SHAPES.filter(shape => shape.root === pitchClass && shape.structureId === structureId)
    .map(({ id, name, frets, fingers, barres, omittedIntervals }) => ({ id, name, frets, fingers, barres, omittedIntervals }))
  const movableShapes = MOVABLE_SHAPES.filter(shape => shape.structureId === structureId).map(shape => {
    // An open root at fret zero has a separately curated grip. Its closed version
    // starts at fret twelve, so transposition never accidentally introduces opens.
    let base = mod12(pitchClass - shape.root) || 12
    const lowest = Math.min(...shape.frets.filter((fret): fret is number => fret !== null))
    while (base + lowest < 1) base += 12
    return {
      id: `${shape.id}-${base}`,
      name: `${shape.name} · fret ${base}`,
      frets: shape.frets.map(fret => fret === null ? null : fret + base) as unknown as ChordVoicing['frets'],
      fingers: shape.fingers,
      omittedIntervals: shape.omittedIntervals,
      barres: shape.barres.map(item => ({ ...item, fret: item.fret + base })),
    }
  }).sort((a, b) => Math.min(...a.frets.filter((fret): fret is number => fret !== null)) - Math.min(...b.frets.filter((fret): fret is number => fret !== null)))
  return [...openShapes, ...movableShapes]
}

/** Sound only the specified strings, preserving low-to-high strum order. */
export function voicingMidi(voicing: ChordVoicing): number[] {
  return voicing.frets.flatMap((fret, index) => fret === null ? [] : [OPEN_MIDI[index] + fret])
}

/** Keep open strings visible, or leave one position before a closed grip. */
export function voicingWindow(voicing: ChordVoicing, span = 6) {
  const frets = voicing.frets.filter((fret): fret is number => fret !== null)
  return getFretWindow(frets.includes(0) ? 0 : Math.max(0, Math.min(...frets) - 1), span)
}
