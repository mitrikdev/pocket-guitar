import test from 'node:test'
import assert from 'node:assert/strict'
import { getChordVoicings } from '../lib/chords.ts'
import { addProgressionChord, emptyProgression } from '../lib/progression.ts'
import {
  createProgression, deleteProgression, emptyLibrary, restoreLibrary, selectProgression,
  updateActiveProgression, type ProgressionLibrary,
} from '../lib/progression-library.ts'

function savedSong(title: string, root: number, structureId: string) {
  const voicing = getChordVoicings(root, structureId).at(-1)!
  return { ...emptyProgression(), title, entries: addProgressionChord([], 'first-chord', root, structureId, voicing.id) }
}

test('a legacy saved progression migrates without losing its title, chords, or selected shape', () => {
  const legacy = savedSong('Sunday verse', 9, 'minor-chord')
  const restored = restoreLibrary(null, JSON.stringify(legacy))
  assert.equal(restored.canPersist, true)
  assert.equal(restored.error, null)
  assert.equal(restored.data.version, 2)
  assert.equal(restored.data.activeId, 'default')
  assert.deepEqual(restored.data.progressions, [{ ...legacy, id: 'default' }])
  const roundtrip = restoreLibrary(JSON.stringify(restored.data), JSON.stringify(savedSong('Stale old song', 0, 'major-chord')))
  assert.deepEqual(roundtrip.data, restored.data)
})

test('a library roundtrip retains every title, active selection, and each progression’s independent fingering', () => {
  const data: ProgressionLibrary = {
    version: 2, activeId: 'chorus',
    progressions: [
      { ...savedSong('Verse', 0, 'major-chord'), id: 'verse' },
      { ...savedSong('Chorus', 9, 'minor-chord'), id: 'chorus' },
      { ...savedSong('Bridge', 2, 'dominant-7'), id: 'bridge' },
    ],
  }
  const restored = restoreLibrary(JSON.stringify(data), 'invalid legacy is ignored')
  assert.equal(restored.canPersist, true)
  assert.deepEqual(restored.data, data)
})

test('create, select, and edit keep the other saved progressions unchanged', () => {
  const first = updateActiveProgression(emptyLibrary(), current => ({ ...current, ...savedSong('Verse', 0, 'major-chord') }))
  const created = createProgression(first, 'chorus')
  assert.equal(created.activeId, 'chorus')
  assert.equal(created.progressions[1].title, 'My progression 2')
  assert.equal(created.progressions[1].entries.length, 0)
  const edited = updateActiveProgression(created, current => ({ ...current, ...savedSong('Chorus', 9, 'minor-chord') }))
  assert.deepEqual(edited.progressions[0], first.progressions[0])
  assert.equal(created.progressions[1].entries.length, 0)
  const selected = selectProgression(edited, 'default')
  assert.equal(selected.activeId, 'default')
  assert.deepEqual(selected.progressions, edited.progressions)
  assert.equal(selectProgression(selected, 'missing'), selected)
  const retitled = updateActiveProgression(selected, current => ({ ...current, title: 'New verse', id: 'must-not-replace-the-saved-id' }))
  assert.equal(retitled.progressions[0].id, 'default')
  assert.equal(retitled.progressions[0].title, 'New verse')
  assert.deepEqual(retitled.progressions[1], edited.progressions[1])
})

test('new progression names and IDs remain unique without capping the number of saved progressions', () => {
  let library = emptyLibrary()
  library = updateActiveProgression(library, current => ({ ...current, title: 'My progression 2' }))
  for (let index = 0; index < 60; index++) library = createProgression(library, 'same-id')
  assert.equal(library.progressions.length, 61)
  assert.equal(library.progressions[1].title, 'My progression 3')
  assert.equal(new Set(library.progressions.map(progression => progression.id)).size, 61)
  assert.equal(new Set(library.progressions.map(progression => progression.title)).size, 61)
  assert.deepEqual(restoreLibrary(JSON.stringify(library), null).data, library)
})

test('delete preserves the active song, selects a neighboring fallback, and keeps a blank after deleting the last song', () => {
  const library = createProgression(createProgression(emptyLibrary(), 'middle'), 'last')
  const withoutFirst = deleteProgression(library, 'default')
  assert.equal(withoutFirst.activeId, 'last')
  assert.deepEqual(withoutFirst.progressions.map(progression => progression.id), ['middle', 'last'])
  const withoutActive = deleteProgression(selectProgression(library, 'middle'), 'middle')
  assert.equal(withoutActive.activeId, 'last')
  const withoutLast = deleteProgression(library, 'last')
  assert.equal(withoutLast.activeId, 'middle')
  assert.equal(deleteProgression(library, 'missing'), library)
  const single = deleteProgression(withoutFirst, 'last')
  assert.deepEqual(deleteProgression(single, 'middle'), emptyLibrary())
  assert.equal(library.progressions.length, 3)
})

test('restoration repairs IDs and active selection while sanitizing chord data in each saved progression', () => {
  const song = savedSong('Song', 0, 'major-chord')
  const repaired = restoreLibrary(JSON.stringify({
    version: 2,
    activeId: 'bad id',
    progressions: [
      { ...song, id: 'repeated' },
      { ...song, id: 'repeated', entries: [{ ...song.entries[0], voicingId: 'stale-shape' }] },
      { ...song, id: 'bad id' },
      { ...song, id: null },
    ],
  }), null)
  assert.equal(repaired.canPersist, true)
  assert.equal(new Set(repaired.data.progressions.map(progression => progression.id)).size, 4)
  assert.equal(repaired.data.activeId, repaired.data.progressions[2].id)
  assert.equal(repaired.data.progressions[1].entries[0].voicingId, getChordVoicings(0, 'major-chord')[0].id)
  assert.deepEqual(restoreLibrary(JSON.stringify(repaired.data), null).data, repaired.data)
  const fallback = restoreLibrary(JSON.stringify({ version: 2, activeId: 'absent', progressions: [{ ...song, id: 'only' }] }), null)
  assert.equal(fallback.data.activeId, 'only')
  assert.deepEqual(restoreLibrary(JSON.stringify({ version: 2, activeId: '', progressions: [] }), null).data, emptyLibrary())
})

test('malformed and future storage is preserved without falling back over a newer saved library', () => {
  const legacy = JSON.stringify(savedSong('Old song', 0, 'major-chord'))
  for (const raw of ['not json', 'null', '[]', '{"version":3,"progressions":[]}', '{"version":2,"progressions":null}']) {
    const restored = restoreLibrary(raw, legacy)
    assert.equal(restored.canPersist, false)
    assert.deepEqual(restored.data, emptyLibrary())
    assert.ok(restored.error?.includes('preserved'))
  }
  for (const raw of ['not json', '{"version":2,"entries":[]}']) {
    const restored = restoreLibrary(null, raw)
    assert.equal(restored.canPersist, false)
    assert.ok(restored.error)
  }
  assert.deepEqual(restoreLibrary(null, null), { data: emptyLibrary(), canPersist: true, error: null })
})

test('a partly unreadable library recovers usable songs but cannot overwrite the unreadable original', () => {
  const song = { ...savedSong('Recovered', 7, 'major-chord'), id: 'safe' }
  const restored = restoreLibrary(JSON.stringify({
    version: 2, activeId: 'future',
    progressions: [{ version: 3, id: 'future', title: 'New format', entries: [] }, song, null],
  }), null)
  assert.equal(restored.canPersist, false)
  assert.ok(restored.error)
  assert.equal(restored.data.activeId, 'safe')
  assert.deepEqual(restored.data.progressions, [song])
})

test('active edits remain bounded to 24 chords and cannot mutate another saved song or the input library', () => {
  const library = createProgression(emptyLibrary(), 'edited')
  const edited = updateActiveProgression(library, current => {
    current.title = 'Updated in place'
    current.entries = Array.from({ length: 30 }, (_, index) => ({ ...savedSong('', 0, 'major-chord').entries[0], id: 'chord-' + index }))
    return current
  })
  assert.equal(edited.progressions[1].entries.length, 24)
  assert.equal(library.progressions[1].entries.length, 0)
  assert.equal(library.progressions[1].title, 'My progression 2')
  assert.deepEqual(edited.progressions[0], library.progressions[0])
})
