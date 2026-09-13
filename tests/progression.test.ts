import test from 'node:test'
import assert from 'node:assert/strict'
import { getChordVoicings } from '../lib/chords.ts'
import {
  MAX_PROGRESSION_CHORDS, addProgressionChord, emptyProgression, moveProgressionChord,
  progressionTitle, restoreProgression, sanitizeProgression, updateProgressionChord,
  type ProgressionEntry,
} from '../lib/progression.ts'

function progression(): ProgressionEntry[] {
  return [
    { id: 'one', root: 0, structureId: 'major-chord', voicingId: getChordVoicings(0, 'major-chord').at(-1)!.id },
    { id: 'two', root: 7, structureId: 'major-chord', voicingId: getChordVoicings(7, 'major-chord')[0].id },
    { id: 'three', root: 9, structureId: 'minor-chord', voicingId: getChordVoicings(9, 'minor-chord')[0].id },
    { id: 'four', root: 5, structureId: 'major-chord', voicingId: getChordVoicings(5, 'major-chord')[0].id },
  ]
}

test('a saved C–G–Am–F progression restores order, title, and each chosen fingering', () => {
  const original = { version: 1, title: 'Verse & chorus', entries: progression() }
  const restored = restoreProgression(JSON.stringify(original))
  assert.equal(restored.canPersist, true)
  assert.equal(restored.error, null)
  assert.deepEqual(restored.data, original)
  assert.deepEqual(restored.data.entries.map(entry => [entry.root, entry.structureId]), [
    [0, 'major-chord'], [7, 'major-chord'], [9, 'minor-chord'], [5, 'major-chord'],
  ])
})

test('restoring damaged browser data rejects unsupported chords and repairs duplicate IDs and removed fingerings', () => {
  const restored = sanitizeProgression({
    version: 1,
    title: 'A'.repeat(90) + '\u0000',
    entries: [
      ...progression(),
      { ...progression()[0], voicingId: 'deleted-fingering' },
      { ...progression()[0], id: null },
      { id: 'bad-root', root: '0', structureId: 'major-chord' },
      { id: 'bad-range', root: 12, structureId: 'major-chord' },
      { id: 'bad-fraction', root: 0.5, structureId: 'major-chord' },
      { id: 'scale', root: 0, structureId: 'major-scale' },
      { id: 'unsupported', root: 0, structureId: 'ninth' },
      null,
    ],
  })!
  assert.equal(restored.title.length, 80)
  assert.equal(restored.entries.length, 6)
  assert.equal(new Set(restored.entries.map(entry => entry.id)).size, 6)
  assert.equal(restored.entries[4].root, 0)
  assert.equal(restored.entries[4].voicingId, getChordVoicings(0, 'major-chord')[0].id)
  assert.deepEqual(restored.entries.slice(0, 4), progression())
})

test('empty storage starts an empty progression while unreadable or newer storage is preserved', () => {
  assert.deepEqual(restoreProgression(null), { data: emptyProgression(), canPersist: true, error: null })
  for (const raw of ['not json', 'null', '[]', '{"version":2,"entries":[]}', '{"version":1,"entries":null}']) {
    const result = restoreProgression(raw)
    assert.equal(result.canPersist, false)
    assert.equal(result.data.entries.length, 0)
    assert.ok(result.error?.includes('preserved'))
  }
  assert.equal(progressionTitle('Verse\nOne\u0000'), 'VerseOne')
})

test('restoring a long progression preserves its first 24 valid chords and their order', () => {
  const entries = Array.from({ length: 30 }, (_, index) => ({ ...progression()[index % 4], id: 'chord-' + index }))
  const restored = sanitizeProgression({ version: 1, title: 'Long song', entries: [null, ...entries] })!
  assert.equal(restored.entries.length, MAX_PROGRESSION_CHORDS)
  assert.deepEqual(restored.entries, entries.slice(0, 24))
})

test('reordering is immutable and keeps repeated chords and selected voicings attached to the right cards', () => {
  const entries = progression()
  const original = structuredClone(entries)
  const moved = moveProgressionChord(entries, 'three', -1)
  assert.deepEqual(moved.map(entry => entry.id), ['one', 'three', 'two', 'four'])
  assert.deepEqual(entries, original)
  assert.equal(moved[1].voicingId, original[2].voicingId)
  assert.deepEqual(moveProgressionChord(moved, 'three', 1), original)
  assert.equal(moveProgressionChord(entries, 'one', -1), entries)
  assert.equal(moveProgressionChord(entries, 'four', 1), entries)
  assert.equal(moveProgressionChord(entries, 'missing', 1), entries)
})

test('editing a chord changes its valid fingering without affecting other cards and rejects invalid musical choices', () => {
  const entries = progression()
  const voicing = getChordVoicings(0, 'major-chord')[0]
  const changed = updateProgressionChord(entries, 'one', { voicingId: voicing.id })
  assert.equal(changed[0].voicingId, voicing.id)
  assert.deepEqual(changed.slice(1), entries.slice(1))
  const transposed = updateProgressionChord(entries, 'one', { root: 2, structureId: 'minor-7' })
  assert.equal(transposed[0].root, 2)
  assert.equal(transposed[0].structureId, 'minor-7')
  assert.ok(getChordVoicings(2, 'minor-7').some(item => item.id === transposed[0].voicingId))
  assert.equal(updateProgressionChord(entries, 'one', { root: -1 }), entries)
  assert.equal(updateProgressionChord(entries, 'one', { structureId: 'major-scale' }), entries)
  assert.equal(updateProgressionChord(entries, 'missing', { root: 0 }), entries)
})

test('adding repeated chords gives independent cards but cannot exceed the limit or introduce duplicate IDs', () => {
  let entries: ProgressionEntry[] = []
  for (let index = 0; index < MAX_PROGRESSION_CHORDS; index++) entries = addProgressionChord(entries, 'chord-' + index, 0, 'major-chord')
  assert.equal(entries.length, 24)
  assert.equal(new Set(entries.map(entry => entry.id)).size, 24)
  assert.equal(addProgressionChord(entries, 'overflow', 7, 'major-chord'), entries)
  const shorter = progression()
  assert.equal(addProgressionChord(shorter, 'one', 7, 'major-chord'), shorter)
  assert.equal(addProgressionChord(shorter, 'new', Number.NaN, 'major-chord'), shorter)
  assert.equal(addProgressionChord(shorter, 'new', 0, 'unknown'), shorter)
})
