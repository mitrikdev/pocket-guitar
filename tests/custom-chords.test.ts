import test from 'node:test'
import assert from 'node:assert/strict'
import { getChordVoicings, voicingMidi, type ChordVoicing } from '../lib/chords.ts'
import { STRUCTURES } from '../lib/music.ts'
import { chordProblem, customStructure, restoreCustomChords, sanitizeCustomChord, suggestChord, type CustomChord } from '../lib/custom-chords.ts'
import { entryLabel, entryVoicing } from '../lib/progression.ts'
import { emptyLibrary, restoreLibrary, updateActiveProgression } from '../lib/progression-library.ts'

const custom = (): CustomChord => ({ id:'custom-e6',root:4,name:'My E6',voicing:{id:'custom-e6',name:'My E6',frets:[0,2,2,1,2,0],fingers:[0,2,3,1,4,0],barres:[]} })

test('E major with C sharp is recognized as E6 and retains its exact sounding notes', () => {
  const c=custom()
  assert.deepEqual(c.voicing.frets,[0,2,2,1,2,0])
  assert.deepEqual(voicingMidi(c.voicing),[40,47,52,56,61,64])
  assert.deepEqual(suggestChord(c.root,c.voicing),{structureId:'major-6',name:'E6'})
  assert.deepEqual(customStructure(c).intervals.map(i=>i.semitones),[0,4,7,9])
})

test('every catalog shape can seed a valid editable custom chord', () => {
  for(let root=0;root<12;root++) for(const s of STRUCTURES.filter(s=>s.type==='chord')) for(const v of getChordVoicings(root,s.id))
    assert.equal(chordProblem(v),null,root+' '+s.id+' '+v.id)
})

test('custom shapes preserve names, open/muted strings, high frets, and barres without sharing arrays', () => {
  const c=custom(), saved=sanitizeCustomChord(c)!
  assert.deepEqual(saved,c)
  assert.notEqual(saved.voicing.frets,c.voicing.frets)
  const high:ChordVoicing={id:'high',name:'High',frets:[null,null,null,24,0,null],fingers:[null,null,null,4,0,null],barres:[]}
  assert.equal(chordProblem(high),null)
  const barre=getChordVoicings(5,'major-chord').find(v=>v.barres.length)!
  assert.equal(chordProblem(barre),null)
  assert.ok(sanitizeCustomChord({...c,name:'My unusual shape',voicing:high}))
})

test('custom chord validation rejects impossible finger assignments and malformed barres', () => {
  const v=custom().voicing
  assert.ok(chordProblem({...v,frets:[null,null,null,null,null,null]}))
  assert.ok(chordProblem({...v,frets:[0,25,2,1,2,0]}))
  assert.ok(chordProblem({...v,fingers:[0,1,2,1,4,0]}))
  assert.ok(chordProblem({...v,fingers:[0,2,2,1,4,0]}))
  assert.ok(chordProblem({...v,barres:[{fret:2,fromString:6,toString:1,finger:1}]}))
  assert.equal(sanitizeCustomChord({...custom(),root:12}),null)
  assert.equal(sanitizeCustomChord({...custom(),voicing:{...v,frets:['0',2,2,1,2,0]}}),null)
})

test('custom library restores exact data and preserves unreadable, future, and partly invalid storage', () => {
  const c=custom()
  assert.deepEqual(restoreCustomChords(JSON.stringify({version:1,chords:[c]})),{chords:[c],canPersist:true,error:null})
  for(const raw of ['null','not json','{"version":2,"chords":[]}',JSON.stringify({version:1,chords:[c,c]}),JSON.stringify({version:1,chords:[c,{}]})]) {
    const restored=restoreCustomChords(raw)
    assert.equal(restored.canPersist,false);assert.ok(restored.error)
  }
})

test('progression snapshots survive reload and later library edits or deletion', () => {
  const c=custom()
  const library=updateActiveProgression(emptyLibrary(),p=>({...p,entries:[{id:'one',root:4,structureId:c.id,voicingId:c.id,custom:c}]}))
  c.name='Changed library chord'
  c.voicing={...c.voicing,frets:[0,2,2,1,0,0],fingers:[0,2,3,1,0,0]}
  const restored=restoreLibrary(JSON.stringify(library),null)
  const entry=restored.data.progressions[0].entries[0]
  assert.equal(entryLabel(entry),'My E6')
  assert.deepEqual(entryVoicing(entry).frets,[0,2,2,1,2,0])
  assert.equal(restored.canPersist,true)
})
