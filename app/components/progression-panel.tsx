'use client'
import { useEffect, useRef, useState } from 'react'
import { chordLabel, getChordVoicings } from '@/lib/chords'
import { NOTE_NAMES, STRUCTURES, displayNote } from '@/lib/music'
import { MAX_PROGRESSION_CHORDS, entryLabel, entryVoicing, type ProgressionEntry } from '@/lib/progression'
import type { CustomChord } from '@/lib/custom-chords'
import type { useProgression } from '@/lib/use-progression'
import type { BuilderSeed } from './chord-builder'
import { ChordDiagram } from './chord-diagram'
import { PracticeDialog } from './practice-dialog'

type Props = {
  progression: ReturnType<typeof useProgression>; customChords: CustomChord[]
  onShowChord: (entry: ProgressionEntry) => void; onPlayChord: (entry: ProgressionEntry) => void
  onBuild: (seed: BuilderSeed) => void
  onPlay: () => void; onStop: () => void; playing: boolean; activeEntryId: string | null
  bpm: number; onBpmChange: (value: number) => void
}
const qualities = STRUCTURES.filter(s => s.type === 'chord')
export function ProgressionPanel({ progression, customChords, onShowChord, onPlayChord, onBuild, onPlay, onStop, playing, activeEntryId, bpm, onBpmChange }: Props) {
  const [drawer, setDrawer] = useState<'library'|'add'|'tempo'|'edit'|null>(null)
  const [selectedId, setSelectedId] = useState<string|null>(null)
  const [addRoot, setAddRoot] = useState(0)
  const [addQuality, setAddQuality] = useState('major-chord')
  const [shapeId, setShapeId] = useState('')
  const [source, setSource] = useState('catalog')
  const [tempoDraft, setTempoDraft] = useState<string|null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const grid = useRef<HTMLOListElement>(null)
  const selected = progression.entries.find(e => e.id === selectedId)
  const selectedIndex = progression.entries.findIndex(e => e.id === selectedId)
  const shapes = getChordVoicings(addRoot, addQuality)
  const shape = shapes.find(v => v.id === shapeId) ?? shapes[0]
  const custom = customChords.find(c => c.id === source)
  const full = progression.entries.length >= MAX_PROGRESSION_CHORDS
  useEffect(() => {
    if (activeEntryId) grid.current?.querySelector('[data-entry="' + activeEntryId + '"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeEntryId])
  function edit(action:()=>void) { onStop(); action() }
  function open(next: typeof drawer) { setConfirmDelete(false); setDrawer(next) }
  function commitTempo() {
    if (tempoDraft?.trim() && Number.isFinite(Number(tempoDraft))) onBpmChange(Math.max(40, Math.min(240, Math.round(Number(tempoDraft)))))
    setTempoDraft(null)
  }
  function build(seed: BuilderSeed) { onStop(); setDrawer(null); onBuild(seed) }
  return <div className="progression-overview">
    <div className="progression-command-bar">
      <button type="button" className="progression-name-button" aria-label="Manage saved progressions" onClick={()=>open('library')}>{progression.title.trim() || 'Untitled progression'} <span>▾</span></button>
      <button type="button" className="compact-button" disabled={full || !progression.hydrated} onClick={()=>open('add')}>＋ Add</button>
      <button type="button" className="compact-button" disabled={full || !progression.hydrated} onClick={()=>build({root:0})}>Build chord</button>
    </div>
    <div className="progression-play-bar">
      <button type="button" className="primary-button" disabled={!progression.entries.length} onClick={playing ? onStop : onPlay}>{playing ? 'Stop' : '▶ Play'}</button>
      <button type="button" className="compact-button" aria-label="Progression tempo settings" onClick={()=>open('tempo')}>{bpm} BPM</button>
      <span>{progression.entries.length}/24 · 4 beats/chord</span>
      <span className="sr-only" role="status">{announcement}</span>
    </div>
    {progression.storageError ? <p className="inline-storage-error" role="status">{progression.storageError}</p> : null}
    {progression.entries.length ? <ol className="progression-grid" ref={grid}>
      {progression.entries.map((entry,index)=><li key={entry.id} data-entry={entry.id} className={activeEntryId === entry.id ? 'is-playing' : ''} aria-current={activeEntryId===entry.id?'step':undefined}>
        <button type="button" className="chord-card-button" aria-label={'Edit chord ' + (index+1) + ', ' + entryLabel(entry)} onClick={()=>{setSelectedId(entry.id);open('edit')}}>
          <span className="chord-card-title"><small>{index+1}.</small> {entryLabel(entry)}</span>
          <ChordDiagram voicing={entryVoicing(entry)} label={entryLabel(entry)} compact/>
          <small className="chord-card-shape">{entryVoicing(entry).name}</small>
        </button>
      </li>)}
    </ol> : <div className="progression-empty"><p>Your next progression starts here.</p><span>Tap Add for a chord, or Build chord to make your own fingering.</span></div>}

    <PracticeDialog open={drawer!==null} title={drawer==='library'?'Saved progressions':drawer==='add'?'Add a chord':drawer==='tempo'?'Playback':selected?'Chord '+(selectedIndex+1)+' · '+entryLabel(selected):'Edit chord'} onClose={()=>{commitTempo();setDrawer(null)}}>
      {drawer==='library'?<div className="drawer-stack">
        <label>Saved progressions<select aria-label="Saved progressions" value={progression.activeId} disabled={!progression.hydrated} onChange={e=>{edit(()=>progression.select(e.target.value));setConfirmDelete(false)}}>{progression.progressions.map((p,i)=><option key={p.id} value={p.id}>{i+1}. {p.title.trim()||'Untitled progression'}</option>)}</select></label>
        <label>Progression name<input aria-label="Progression name" value={progression.title} maxLength={80} disabled={!progression.hydrated} onChange={e=>progression.setTitle(e.target.value)}/></label>
        <p className="field-hint" role="status">{progression.storageError??'Automatically saved in this browser.'}</p>
        <div className="button-row"><button type="button" className="secondary-button" disabled={!progression.hydrated} onClick={()=>{edit(progression.create);setConfirmDelete(false)}}>New progression</button><button type="button" className="secondary-button" onClick={()=>setConfirmDelete(true)}>Delete</button></div>
        {confirmDelete?<div className="delete-confirm"><p>Delete “{progression.title.trim()||'Untitled progression'}”?</p><button type="button" className="secondary-button" onClick={()=>setConfirmDelete(false)}>Cancel</button><button type="button" className="secondary-button" onClick={()=>{edit(()=>progression.remove(progression.activeId));setConfirmDelete(false)}}>Delete progression</button></div>:null}
        <button type="button" className="primary-button" onClick={()=>setDrawer(null)}>Back to chords</button>
      </div>:drawer==='add'?<form className="drawer-stack" onSubmit={e=>{e.preventDefault();if(full||!progression.hydrated)return;edit(()=>custom?progression.addCustom(custom):progression.addChord(addRoot,addQuality,shape.id));setAnnouncement('Added chord '+(progression.entries.length+1));setDrawer(null)}}>
        <label>Choose from<select aria-label="Chord source" value={source} onChange={e=>setSource(e.target.value)}><option value="catalog">Chord catalog</option>{customChords.length?<optgroup label="My chords">{customChords.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>:null}</select></label>
        {!custom?<><div className="two-fields"><label>Root<select aria-label="Add chord root" value={addRoot} onChange={e=>{setAddRoot(Number(e.target.value));setShapeId('')}}>{NOTE_NAMES.map((n,i)=><option key={n} value={i}>{displayNote(n)}</option>)}</select></label><label>Chord<select aria-label="Add chord type" value={addQuality} onChange={e=>{setAddQuality(e.target.value);setShapeId('')}}>{qualities.map(q=><option key={q.id} value={q.id}>{q.name}</option>)}</select></label></div><label>Fingering<select aria-label="Add chord fingering" value={shape.id} onChange={e=>setShapeId(e.target.value)}>{shapes.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label></>:null}
        <ChordDiagram voicing={custom?.voicing??shape} label={custom?.name??chordLabel(addRoot,addQuality)} compact/>
        <div className="button-row"><button type="submit" className="primary-button" disabled={full||!progression.hydrated}>Add chord</button><button type="button" className="secondary-button" onClick={()=>build(custom?{...custom}:{root:addRoot,voicing:shape})}>Customize</button></div>
      </form>:drawer==='tempo'?<div className="drawer-stack">
        <label>Beats per minute<input aria-label="Progression tempo in beats per minute" type="number" inputMode="numeric" min={40} max={240} value={tempoDraft??String(bpm)} onChange={e=>setTempoDraft(e.target.value)} onBlur={commitTempo} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/></label>
        <input aria-label="Progression tempo" type="range" min={40} max={240} value={bpm} onChange={e=>onBpmChange(Number(e.target.value))}/>
        <p className="field-hint">One pass, four beats per chord. Playback follows the highlighted card.</p>
        <button type="button" className="primary-button" onClick={()=>{commitTempo();setDrawer(null)}}>Done</button>
      </div>:drawer==='edit'&&selected?<div className="drawer-stack">
        {!selected.custom?<div className="two-fields"><label>Root<select aria-label="Selected chord root" value={selected.root} onChange={e=>edit(()=>progression.updateChord(selected.id,{root:Number(e.target.value)}))}>{NOTE_NAMES.map((n,i)=><option key={n} value={i}>{displayNote(n)}</option>)}</select></label><label>Chord<select aria-label="Selected chord type" value={selected.structureId} onChange={e=>edit(()=>progression.updateChord(selected.id,{structureId:e.target.value}))}>{qualities.map(q=><option key={q.id} value={q.id}>{q.name}</option>)}</select></label></div>:null}
        <ChordDiagram voicing={entryVoicing(selected)} label={entryLabel(selected)}/>
        {!selected.custom?<label>Fingering<select aria-label="Selected chord fingering" value={selected.voicingId} onChange={e=>edit(()=>progression.updateChord(selected.id,{voicingId:e.target.value}))}>{getChordVoicings(selected.root,selected.structureId).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>:<p className="field-hint">Custom fingering saved with this progression.</p>}
        <div className="button-row"><button type="button" className="secondary-button" onClick={()=>onPlayChord(selected)}>Strum</button><button type="button" className="secondary-button" onClick={()=>{setDrawer(null);onShowChord(selected)}}>Show on neck</button><button type="button" className="secondary-button" onClick={()=>build({root:selected.root,voicing:entryVoicing(selected),name:entryLabel(selected),targetEntryId:selected.id})}>Customize</button></div>
        <div className="button-row"><button type="button" className="secondary-button" disabled={selectedIndex===0} onClick={()=>edit(()=>progression.moveChord(selected.id,-1))}>← Earlier</button><button type="button" className="secondary-button" disabled={selectedIndex===progression.entries.length-1} onClick={()=>edit(()=>progression.moveChord(selected.id,1))}>Later →</button><button type="button" className="secondary-button" onClick={()=>{edit(()=>progression.removeChord(selected.id));setDrawer(null)}}>Remove</button></div>
      </div>:null}
    </PracticeDialog>
  </div>
}
