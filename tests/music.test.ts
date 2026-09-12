import test from 'node:test'
import assert from 'node:assert/strict'
import { INSTRUMENTS, NOTE_NAMES, STRUCTURES, activeNotes, generateFretboard, markerLabel, mod12, relationship } from '../lib/music.ts'

const getStructure = (id: string) => STRUCTURES.find(item => item.id === id)!

test('standard tunings, string order, and all open/fretted pitches are correct', () => {
  const openMidi = [[64, 59, 55, 50, 45, 40], [43, 38, 33, 28], [43, 38, 33, 28, 23]]
  INSTRUMENTS.forEach((instrument, index) => {
    const board = generateFretboard(instrument)
    assert.equal(board.flat().length, [78, 52, 65][index])
    board.forEach((row, string) => {
      assert.equal(row[0].midi, openMidi[index][string])
      assert.equal(new Set(row.slice(0, 12).map(cell => cell.pitchClass)).size, 12)
      row.forEach((cell, fret) => {
        assert.equal(cell.midi, openMidi[index][string] + fret)
        assert.equal(cell.pitchClass, cell.midi % 12)
        assert.equal(cell.note, NOTE_NAMES[cell.pitchClass])
        assert.equal(cell.stringNumber, string + 1)
      })
      assert.equal(row[12].pitchClass, row[0].pitchClass)
      assert.equal(row[12].octave, row[0].octave + 1)
    })
  })
  assert.equal(generateFretboard(INSTRUMENTS[0])[1][5].note, 'E')
  assert.equal(generateFretboard(INSTRUMENTS[2])[4][1].octave, 1)
})

test('every root and structure highlights the complete neck including open and octave notes', () => {
  assert.equal(STRUCTURES.filter(item => item.type === 'scale').length, 7)
  assert.equal(STRUCTURES.filter(item => item.type === 'chord').length, 9)
  for (let root = 0; root < 12; root++) {
    for (const structure of STRUCTURES) {
      const members = new Set(activeNotes(root, structure).map(item => item.pitchClass))
      assert.equal(members.size, structure.intervals.length)
      for (const instrument of INSTRUMENTS) {
        for (const row of generateFretboard(instrument)) {
          const lit = row.filter(cell => relationship(cell.pitchClass, root, structure).isMember)
          assert.equal(lit.length, members.size + Number(members.has(row[0].pitchClass)))
          assert.equal(row.filter(cell => relationship(cell.pitchClass, root, structure).isRoot).length, 1 + Number(row[0].pitchClass === root))
          for (const cell of row) assert.equal(relationship(cell.pitchClass, root, structure).isMember, members.has(cell.pitchClass))
        }
      }
    }
  }
})

test('known scales and chords transpose to independently specified pitch sets', () => {
  const cases: [number, string, string[]][] = [
    [0, 'major-scale', ['C', 'D', 'E', 'F', 'G', 'A', 'B']],
    [9, 'dominant-7', ['A', 'C#', 'E', 'G']],
    [9, 'minor-pentatonic', ['A', 'C', 'D', 'E', 'G']],
    [2, 'dorian', ['D', 'E', 'F', 'G', 'A', 'B', 'C']],
    [7, 'mixolydian', ['G', 'A', 'B', 'C', 'D', 'E', 'F']],
    [0, 'blues', ['C', 'D#', 'F', 'F#', 'G', 'A#']],
    [11, 'major-chord', ['B', 'D#', 'F#']],
  ]
  for (const [root, id, expected] of cases) assert.deepEqual(activeNotes(root, getStructure(id)).map(item => NOTE_NAMES[item.pitchClass]), expected)
})

test('musical roles distinguish augmented fifth, minor sixth, diminished fifth and tritone', () => {
  const augmented = relationship(8, 0, getStructure('augmented'))
  assert.deepEqual([augmented.interval.degree, augmented.interval.short], ['♯5', 'A5'])
  const minor = relationship(8, 0, getStructure('natural-minor'))
  assert.deepEqual([minor.interval.degree, minor.interval.short], ['♭6', 'm6'])
  const diminished = relationship(6, 0, getStructure('diminished'))
  assert.deepEqual([diminished.interval.degree, diminished.interval.short], ['♭5', 'd5'])
  const outside = relationship(6, 0, getStructure('major-scale'))
  assert.equal(outside.isMember, false)
  assert.equal(outside.interval.name, 'Tritone')
  assert.equal(relationship(0, 9, getStructure('minor-pentatonic')).interval.short, 'm3')
  assert.equal(mod12(-1), 11)
})

test('pentatonic degrees retain scale relationships and modes retain musical selection', () => {
  const selected = getStructure('minor-pentatonic')
  assert.deepEqual(selected.intervals.map(item => item.degree), ['1', '♭3', '4', '5', '♭7'])
  const interval = getStructure('dominant-7').intervals[3]
  assert.equal(markerLabel('G', interval, 'notes'), 'G')
  assert.equal(markerLabel('G', interval, 'degrees'), '♭7')
  assert.equal(markerLabel('G', interval, 'intervals'), 'm7')
  assert.equal(interval.semitones, 10)
})
