export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export type NoteName = typeof NOTE_NAMES[number]
export type DisplayMode = 'notes' | 'degrees' | 'intervals'
export type InstrumentId = 'guitar' | 'bass' | 'bass5'
export type Interval = Readonly<{ semitones: number; degree: string; short: string; name: string }>
export type Structure = Readonly<{ id: string; name: string; type: 'scale' | 'chord'; intervals: readonly Interval[] }>
export type Instrument = Readonly<{ id: InstrumentId; name: string; shortName: string; tuning: readonly { note: NoteName; octave: number }[] }>
export type Position = Readonly<{ stringIndex: number; stringNumber: number; stringName: string; fret: number; midi: number; pitchClass: number; note: NoteName; octave: number }>

export const mod12 = (value: number) => ((value % 12) + 12) % 12
export const displayNote = (note: string) => note.replace('#', '♯')
export const MAX_FRET = 24
export const FRET_WINDOW_SPAN = 12

export function getFretWindow(firstFret: number) {
  const start = Math.max(0, Math.min(MAX_FRET - FRET_WINDOW_SPAN, Math.round(firstFret)))
  return { start, end: start + FRET_WINDOW_SPAN, frets: Array.from({ length: FRET_WINDOW_SPAN + 1 }, (_, index) => start + index) }
}

export function fretMarkerCount(fret: number) {
  if (fret > 0 && fret % 12 === 0) return 2
  return [3, 5, 7, 9].includes(fret % 12) ? 1 : 0
}

const intervals: readonly Interval[] = [
  { semitones: 0, degree: '1', short: 'R', name: 'Root' },
  { semitones: 1, degree: '♭2', short: 'm2', name: 'Minor 2nd' },
  { semitones: 2, degree: '2', short: 'M2', name: 'Major 2nd' },
  { semitones: 3, degree: '♭3', short: 'm3', name: 'Minor 3rd' },
  { semitones: 4, degree: '3', short: 'M3', name: 'Major 3rd' },
  { semitones: 5, degree: '4', short: 'P4', name: 'Perfect 4th' },
  { semitones: 6, degree: '♭5', short: 'd5', name: 'Diminished 5th' },
  { semitones: 7, degree: '5', short: 'P5', name: 'Perfect 5th' },
  { semitones: 8, degree: '♭6', short: 'm6', name: 'Minor 6th' },
  { semitones: 9, degree: '6', short: 'M6', name: 'Major 6th' },
  { semitones: 10, degree: '♭7', short: 'm7', name: 'Minor 7th' },
  { semitones: 11, degree: '7', short: 'M7', name: 'Major 7th' },
]

function structure(id: string, name: string, type: Structure['type'], offsets: number[]): Structure {
  return { id, name, type, intervals: offsets.map(offset => intervals[offset]) }
}

export const STRUCTURES: readonly Structure[] = [
  structure('major-scale', 'Major', 'scale', [0, 2, 4, 5, 7, 9, 11]),
  structure('natural-minor', 'Natural minor', 'scale', [0, 2, 3, 5, 7, 8, 10]),
  structure('major-pentatonic', 'Major pentatonic', 'scale', [0, 2, 4, 7, 9]),
  structure('minor-pentatonic', 'Minor pentatonic', 'scale', [0, 3, 5, 7, 10]),
  structure('blues', 'Minor blues', 'scale', [0, 3, 5, 6, 7, 10]),
  structure('dorian', 'Dorian', 'scale', [0, 2, 3, 5, 7, 9, 10]),
  structure('mixolydian', 'Mixolydian', 'scale', [0, 2, 4, 5, 7, 9, 10]),
  structure('major-chord', 'Major', 'chord', [0, 4, 7]),
  structure('minor-chord', 'Minor', 'chord', [0, 3, 7]),
  structure('major-7', 'Major 7', 'chord', [0, 4, 7, 11]),
  structure('minor-7', 'Minor 7', 'chord', [0, 3, 7, 10]),
  structure('dominant-7', 'Dominant 7', 'chord', [0, 4, 7, 10]),
  structure('sus2', 'Sus2', 'chord', [0, 2, 7]),
  structure('sus4', 'Sus4', 'chord', [0, 5, 7]),
  structure('diminished', 'Diminished', 'chord', [0, 3, 6]),
  { ...structure('augmented', 'Augmented', 'chord', [0, 4, 8]), intervals: [intervals[0], intervals[4], { semitones: 8, degree: '♯5', short: 'A5', name: 'Augmented 5th' }] },
]

export const INSTRUMENTS: readonly Instrument[] = [
  { id: 'guitar', name: 'Guitar', shortName: 'Guitar', tuning: [{ note: 'E', octave: 2 }, { note: 'A', octave: 2 }, { note: 'D', octave: 3 }, { note: 'G', octave: 3 }, { note: 'B', octave: 3 }, { note: 'E', octave: 4 }] },
  { id: 'bass', name: '4-string bass', shortName: 'Bass', tuning: [{ note: 'E', octave: 1 }, { note: 'A', octave: 1 }, { note: 'D', octave: 2 }, { note: 'G', octave: 2 }] },
  { id: 'bass5', name: '5-string bass', shortName: 'Bass 5', tuning: [{ note: 'B', octave: 0 }, { note: 'E', octave: 1 }, { note: 'A', octave: 1 }, { note: 'D', octave: 2 }, { note: 'G', octave: 2 }] },
]

export function generateFretboard(instrument: Instrument): Position[][] {
  return [...instrument.tuning].reverse().map((string, stringIndex) => {
    const openMidi = (string.octave + 1) * 12 + NOTE_NAMES.indexOf(string.note)
    const repeated = instrument.tuning.filter(s => s.note === string.note).length > 1
    const stringName = repeated ? `${stringIndex === 0 ? 'High' : 'Low'} ${string.note}` : string.note
    return Array.from({ length: MAX_FRET + 1 }, (_, fret) => {
      const midi = openMidi + fret
      return { stringIndex, stringNumber: stringIndex + 1, stringName, fret, midi, pitchClass: mod12(midi), note: NOTE_NAMES[mod12(midi)], octave: Math.floor(midi / 12) - 1 }
    })
  })
}

export function activeNotes(root: number, selected: Structure) {
  return selected.intervals.map(interval => ({ pitchClass: mod12(root + interval.semitones), interval }))
}

export function relationship(pitchClass: number, root: number, selected: Structure) {
  const offset = mod12(pitchClass - root)
  const member = selected.intervals.find(interval => interval.semitones === offset)
  const fallback = offset === 6 ? { semitones: 6, degree: '♭5 / ♯4', short: 'TT', name: 'Tritone' } : intervals[offset]
  return { isMember: Boolean(member), interval: member ?? fallback, isRoot: offset === 0 }
}

export function markerLabel(note: string, interval: Interval, mode: DisplayMode) {
  return mode === 'notes' ? displayNote(note) : mode === 'degrees' ? interval.degree : interval.short
}
