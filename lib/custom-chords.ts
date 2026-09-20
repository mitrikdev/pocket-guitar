import { chordLabel, voicingMidi, type ChordVoicing, type Finger, type GuitarStrings } from './chords.ts'
import { STRUCTURES, mod12, relationship, type Structure } from './music.ts'

export const CUSTOM_CHORDS_KEY = 'pocket-guitar.chords.v1'
export type CustomChord = { id: string; root: number; name: string; voicing: ChordVoicing }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

export function chordProblem(voicing: ChordVoicing): string | null {
  if (voicing.frets.length !== 6 || voicing.fingers.length !== 6) return 'Choose one position for each of the six strings.'
  if (!voicing.frets.some(f => f !== null)) return 'Choose at least one sounding string.'
  for (let i = 0; i < 6; i++) {
    const fret = voicing.frets[i], finger = voicing.fingers[i]
    if (fret !== null && (!Number.isInteger(fret) || fret < 0 || fret > 24)) return 'Frets must be between 0 and 24.'
    if (fret === null ? finger !== null : fret === 0 ? finger !== 0 : !Number.isInteger(finger) || !finger || finger < 1 || finger > 4) return 'Assign a finger (1–4) to each fretted string.'
  }
  for (const b of voicing.barres) {
    if (![b.fret, b.fromString, b.toString, b.finger].every(Number.isInteger) || b.fret < 1 || b.fret > 24 || b.finger < 1 || b.finger > 4 || b.fromString < 1 || b.fromString > 6 || b.toString < 1 || b.toString > 6 || b.fromString === b.toString) return 'A barre needs a fret, finger, and two different strings.'
    for (const string of [b.fromString, b.toString]) if (voicing.frets[6 - string] !== b.fret || voicing.fingers[6 - string] !== b.finger) return 'The ends of each barre must use its fret and finger. Remove or adjust the barre.'
    for (let string = Math.min(b.fromString, b.toString); string <= Math.max(b.fromString, b.toString); string++) {
      const fret = voicing.frets[6 - string]
      if (fret !== null && fret < b.fret) return 'A string under a barre cannot sound below that barre.'
    }
  }
  for (const finger of [1,2,3,4]) {
    const strings = voicing.fingers.flatMap((n,i) => n === finger ? [6-i] : [])
    if (new Set(strings.map(s => voicing.frets[6-s])).size > 1) return 'Finger ' + finger + ' is assigned to different frets. Choose another finger.'
    if (strings.length > 1 && !voicing.barres.some(b => b.finger === finger && strings.every(s => s >= Math.min(b.fromString,b.toString) && s <= Math.max(b.fromString,b.toString)))) return 'Add a barre for finger ' + finger + ', or assign separate fingers.'
  }
  return null
}

export function sanitizeCustomChord(value: unknown): CustomChord | null {
  if (!record(value) || typeof value.id !== 'string' || !/^custom-[a-zA-Z0-9_-]{1,90}$/.test(value.id) || !Number.isInteger(value.root) || Number(value.root) < 0 || Number(value.root) > 11 || typeof value.name !== 'string' || !record(value.voicing)) return null
  const v = value.voicing
  if (!Array.isArray(v.frets) || !Array.isArray(v.fingers) || !Array.isArray(v.barres) || v.barres.length > 6) return null
  if (!v.barres.every(record)) return null
  const voicing: ChordVoicing = {
    id: value.id, name: value.name.trim().slice(0, 80) || 'My chord',
    frets: [...v.frets] as unknown as GuitarStrings<number | null>, fingers: [...v.fingers] as unknown as GuitarStrings<Finger | null>,
    barres: v.barres.map(b => ({ fret: Number(b.fret), fromString: Number(b.fromString), toString: Number(b.toString), finger: Number(b.finger) as 1 | 2 | 3 | 4 })),
  }
  return chordProblem(voicing) ? null : { id: value.id, root: Number(value.root), name: voicing.name, voicing }
}

export function suggestChord(root: number, voicing: ChordVoicing) {
  const notes = [...new Set(voicingMidi(voicing).map(midi => mod12(midi - root)))].sort((a, b) => a - b)
  const match = STRUCTURES.find(s => s.type === 'chord' && s.intervals.length === notes.length && s.intervals.every(i => notes.includes(i.semitones)))
  return match ? { structureId: match.id, name: chordLabel(root, match.id) } : null
}

export function customStructure(chord: CustomChord): Structure {
  const match = STRUCTURES.find(s => s.id === suggestChord(chord.root, chord.voicing)?.structureId)
  return {
    id: chord.id, name: chord.name, type: 'chord',
    intervals: match?.intervals ?? [...new Set(voicingMidi(chord.voicing).map(n => mod12(n - chord.root)))].sort((a, b) => a - b).map(n => relationship(mod12(chord.root + n), chord.root, STRUCTURES[0]).interval),
  }
}

export function restoreCustomChords(raw: string | null): { chords: CustomChord[]; canPersist: boolean; error: string | null } {
  if (raw === null) return { chords: [], canPersist: true, error: null }
  try {
    const data = JSON.parse(raw)
    if (data.version === 1 && Array.isArray(data.chords)) {
      const chords: CustomChord[] = [], ids = new Set<string>()
      let valid = true
      for (const item of data.chords) {
        const chord = sanitizeCustomChord(item)
        if (!chord || ids.has(chord.id)) { valid = false; continue }
        ids.add(chord.id); chords.push(chord)
      }
      return { chords, canPersist: valid, error: valid ? null : 'Some saved chords could not be read. The original save is preserved; edits stay in this session.' }
    }
  } catch { /* Preserve unsupported or unreadable saves. */ }
  return { chords: [], canPersist: false, error: 'Saved chords could not be read. The original save is preserved; edits stay in this session.' }
}
