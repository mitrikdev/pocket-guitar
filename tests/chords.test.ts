import test from 'node:test'
import assert from 'node:assert/strict'
import { chordLabel, getChordVoicings, voicingMidi, voicingWindow } from '../lib/chords.ts'

// Independent theory expectations: catch catalog mistakes instead of comparing
// the implementation to a second copy of its shape-generation logic.
const CHORD_INTERVALS: Record<string, readonly number[]> = {
  'major-chord': [0, 4, 7], 'minor-chord': [0, 3, 7], 'major-7': [0, 4, 7, 11],
  'minor-7': [0, 3, 7, 10], 'dominant-7': [0, 4, 7, 10],
  sus2: [0, 2, 7], sus4: [0, 5, 7], diminished: [0, 3, 6], augmented: [0, 4, 8],
}
const pitchSet = (values: number[]) => [...new Set(values.map(value => value % 12))].sort((a, b) => a - b)
const getShape = (root: number, structureId: string, id: string) => {
  const shape = getChordVoicings(root, structureId).find(item => item.id === id)
  assert.ok(shape, `Missing ${id}`)
  return shape
}

test('common open C, A minor, and both G grips retain conventional strings and fingers', () => {
  const c = getChordVoicings(0, 'major-chord')[0]
  assert.deepEqual(c.frets, [null, 3, 2, 0, 1, 0])
  assert.deepEqual(c.fingers, [null, 3, 2, 0, 1, 0])
  assert.deepEqual(voicingMidi(c), [48, 52, 55, 60, 64])
  const am = getChordVoicings(9, 'minor-chord')[0]
  assert.deepEqual(am.frets, [null, 0, 2, 2, 1, 0])
  assert.deepEqual(am.fingers, [null, 0, 2, 3, 1, 0])
  assert.deepEqual(voicingMidi(am), [45, 52, 57, 60, 64])
  const g = getChordVoicings(7, 'major-chord')
  assert.deepEqual(g[0].frets, [3, 2, 0, 0, 0, 3])
  assert.deepEqual(g[0].fingers, [2, 1, 0, 0, 0, 3])
  assert.deepEqual(g[1].frets, [3, 2, 0, 0, 3, 3])
  assert.deepEqual(g[1].fingers, [2, 1, 0, 0, 3, 4])
})

test('open B7 and compact F are offered before larger barre alternatives', () => {
  const b7 = getChordVoicings(11, 'dominant-7')[0]
  assert.equal(b7.id, 'open-b7')
  assert.deepEqual(b7.frets, [null, 2, 1, 2, 0, 2])
  assert.deepEqual(b7.fingers, [null, 2, 1, 3, 0, 4])
  assert.deepEqual(voicingMidi(b7), [47, 51, 57, 59, 66])
  assert.deepEqual(b7.barres, [])
  const f = getChordVoicings(5, 'major-chord')[0]
  assert.equal(f.id, 'compact-f')
  assert.equal(f.name, 'Compact F · four strings')
  assert.deepEqual(f.frets, [null, null, 3, 2, 1, 1])
  assert.deepEqual(f.fingers, [null, null, 3, 2, 1, 1])
  assert.deepEqual(voicingMidi(f), [53, 57, 60, 65])
  assert.deepEqual(f.barres, [{ fret: 1, fromString: 2, toString: 1, finger: 1 }])
})
test('F and B minor use familiar movable barre grips with guitar string numbering', () => {
  const f = getShape(5, 'major-chord', 'e-major-1')
  assert.deepEqual(f.frets, [1, 3, 3, 2, 1, 1])
  assert.deepEqual(f.fingers, [1, 3, 4, 2, 1, 1])
  assert.deepEqual(f.barres, [{ fret: 1, fromString: 6, toString: 1, finger: 1 }])
  const bm = getShape(11, 'minor-chord', 'a-minor-2')
  assert.deepEqual(bm.frets, [null, 2, 4, 4, 3, 2])
  assert.deepEqual(bm.fingers, [null, 1, 3, 4, 2, 1])
  assert.deepEqual(bm.barres, [{ fret: 2, fromString: 5, toString: 1, finger: 1 }])
})

test('every root and chord type offers multiple distinct, valid voicings', () => {
  for (let root = 0; root < 12; root++) {
    for (const [structureId, intervals] of Object.entries(CHORD_INTERVALS)) {
      const shapes = getChordVoicings(root, structureId)
      assert.ok(shapes.length >= 2, `${root} ${structureId} needs alternatives`)
      assert.equal(new Set(shapes.map(shape => shape.id)).size, shapes.length)
      assert.equal(new Set(shapes.map(shape => shape.frets.join(','))).size, shapes.length)
      for (const shape of shapes) {
        const omitted = shape.omittedIntervals ?? []
        if (omitted.length) {
          assert.equal(shape.id, 'open-c7', 'Only explicitly curated C7 may omit a tone')
          assert.deepEqual(omitted, [7], 'Never omit the root, defining third, or seventh')
        }
        assert.deepEqual(pitchSet(voicingMidi(shape)), pitchSet(intervals.filter(interval => !omitted.includes(interval)).map(interval => root + interval)), `${root} ${structureId} ${shape.id}`)
        assert.equal(voicingMidi(shape)[0] % 12, root, `${shape.id} must keep its named root in the bass`)
        assert.equal(shape.frets.length, 6)
        assert.equal(shape.fingers.length, 6)
        assert.equal(voicingMidi(shape).length, shape.frets.filter(fret => fret !== null).length)
      }
    }
  }
})

test('all grips use at most four frets and consistent finger, open, mute, and barre metadata', () => {
  for (let root = 0; root < 12; root++) {
    for (const structureId of Object.keys(CHORD_INTERVALS)) {
      for (const shape of getChordVoicings(root, structureId)) {
        const pressed = shape.frets.filter((fret): fret is number => fret !== null && fret > 0)
        assert.ok(Math.max(...pressed) - Math.min(...pressed) <= 3, `${shape.id} spans more than four frets`)
        shape.frets.forEach((fret, index) => {
          const finger = shape.fingers[index]
          if (fret === null) assert.equal(finger, null, `${shape.id} mute`)
          else if (fret === 0) assert.equal(finger, 0, `${shape.id} open`)
          else {
            assert.ok(Number.isInteger(fret) && fret > 0 && fret <= 24)
            assert.ok(finger !== null && finger >= 1 && finger <= 4, `${shape.id} fretted finger`)
          }
        })
        for (const finger of [1, 2, 3, 4] as const) {
          const indices = shape.fingers.flatMap((value, index) => value === finger ? [index] : [])
          assert.ok(new Set(indices.map(index => shape.frets[index])).size <= 1, `${shape.id}: a finger cannot occupy different frets`)
          if (indices.length > 1) {
            assert.ok(shape.barres.some(barre => barre.finger === finger && indices.every(index => 6 - index <= barre.fromString && 6 - index >= barre.toString)), `${shape.id}: repeated finger needs a covering barre`)
          }
        }
        for (const barre of shape.barres) {
          assert.ok(barre.fromString <= 6 && barre.toString >= 1 && barre.fromString > barre.toString)
          assert.ok(barre.fret > 0 && barre.fret <= 24)
          for (let string = barre.toString; string <= barre.fromString; string++) {
            const fret = shape.frets[6 - string]
            assert.ok(fret === null || fret >= barre.fret, `${shape.id}: barre would silence a lower/open note`)
          }
          assert.equal(shape.fingers[6 - barre.fromString], barre.finger)
          assert.equal(shape.fingers[6 - barre.toString], barre.finger)
          assert.equal(shape.frets[6 - barre.fromString], barre.fret)
          assert.equal(shape.frets[6 - barre.toString], barre.fret)
        }
      }
    }
  }
})

test('every standard display window shows the entire selected grip, including open strings', () => {
  for (let root = 0; root < 12; root++) {
    for (const structureId of Object.keys(CHORD_INTERVALS)) {
      for (const shape of getChordVoicings(root, structureId)) {
        for (const span of [6, 12]) {
          const window = voicingWindow(shape, span)
          assert.equal(window.frets.length, span + 1)
          for (const fret of shape.frets) if (fret !== null) assert.ok(window.frets.includes(fret), `${shape.id} hides fret ${fret}`)
          if (shape.frets.includes(0)) assert.equal(window.start, 0)
        }
      }
    }
  }
})

test('labels, unsupported structures, and equivalent roots remain deterministic', () => {
  assert.equal(chordLabel(0, 'major-chord'), 'C')
  assert.equal(chordLabel(9, 'minor-chord'), 'Am')
  assert.equal(chordLabel(6, 'major-7'), 'F♯maj7')
  assert.equal(chordLabel(11, 'diminished'), 'Bdim')
  assert.equal(chordLabel(0, 'augmented'), 'Caug')
  assert.equal(chordLabel(Number.NaN, 'major-chord'), '—')
  assert.deepEqual(getChordVoicings(0, 'major-scale'), [])
  assert.deepEqual(getChordVoicings(0, 'unknown'), [])
  assert.deepEqual(getChordVoicings(Number.NaN, 'major-chord'), [])
  assert.deepEqual(getChordVoicings(1.5, 'major-chord'), [])
  assert.deepEqual(getChordVoicings(-1, 'minor-chord'), getChordVoicings(11, 'minor-chord'))
  assert.deepEqual(getChordVoicings(12, 'major-chord'), getChordVoicings(0, 'major-chord'))
})
