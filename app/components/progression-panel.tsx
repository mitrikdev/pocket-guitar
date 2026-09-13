'use client'

import { useState } from 'react'
import { chordLabel, getChordVoicings } from '@/lib/chords'
import { NOTE_NAMES, STRUCTURES, displayNote } from '@/lib/music'
import { MAX_PROGRESSION_CHORDS, MAX_PROGRESSION_TITLE, type ProgressionEntry } from '@/lib/progression'
import type { useProgression } from '@/lib/use-progression'
import { ChordDiagram } from './chord-diagram'

type ProgressionPanelProps = {
  progression: ReturnType<typeof useProgression>
  onShowChord: (entry: ProgressionEntry) => void
  onPlayChord: (entry: ProgressionEntry) => void
  onPlay: () => void
  onStop: () => void
  playing: boolean
  activeEntryId: string | null
  bpm: number
  onBpmChange: (value: number) => void
}

const chordQualities = STRUCTURES.filter(structure => structure.type === 'chord')

export function ProgressionPanel({ progression, onShowChord, onPlayChord, onPlay, onStop, playing, activeEntryId, bpm, onBpmChange }: ProgressionPanelProps) {
  const [addRoot, setAddRoot] = useState(0)
  const [addQuality, setAddQuality] = useState('major-chord')
  const [tempoDraft, setTempoDraft] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const full = progression.entries.length >= MAX_PROGRESSION_CHORDS

  function commitTempo() {
    if (tempoDraft !== null && tempoDraft.trim() !== '') {
      const value = Number(tempoDraft)
      if (Number.isFinite(value)) onBpmChange(Math.max(40, Math.min(240, Math.round(value))))
    }
    setTempoDraft(null)
  }

  function edit(action: () => void) {
    onStop()
    action()
  }

  return <div className="progression-panel">
    <div className="progression-header">
      <label className="progression-title-input">Progression name
        <input type="text" maxLength={MAX_PROGRESSION_TITLE} value={progression.title} placeholder="Name your progression" disabled={!progression.hydrated} onChange={event => progression.setTitle(event.target.value)}/>
      </label>
      <p className="progression-save-status" role="status">{progression.storageError ?? (progression.hydrated ? 'Saved on this device' : 'Loading saved progression…')}</p>
    </div>

    <form className="progression-add-form" onSubmit={event => {
      event.preventDefault()
      if (full || !progression.hydrated) return
      edit(() => progression.addChord(addRoot, addQuality))
      setAnnouncement(`${chordLabel(addRoot, addQuality)} added at position ${progression.entries.length + 1}.`)
    }}>
      <label>Root<select value={addRoot} onChange={event => setAddRoot(Number(event.target.value))}>{NOTE_NAMES.map((note, root) => <option key={note} value={root}>{displayNote(note)}</option>)}</select></label>
      <label>Chord<select value={addQuality} onChange={event => setAddQuality(event.target.value)}>{chordQualities.map(chord => <option key={chord.id} value={chord.id}>{chord.name}</option>)}</select></label>
      <button className="primary-button" type="submit" disabled={full || !progression.hydrated}>{full ? '24 chord limit' : 'Add chord'}</button>
    </form>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

    {progression.entries.length === 0 ? <div className="progression-empty">
      <p>Make a progression of your own.</p>
      <span>Choose a chord above to start. Add more chords, pick a fingering for each, then play them in order.</span>
    </div> : <>
      <div className="progression-transport">
        <button className="primary-button" type="button" onClick={playing ? onStop : onPlay}>{playing ? 'Stop progression' : 'Play progression'}</button>
        <label>Tempo
          <span><input aria-label="Progression tempo in beats per minute" type="number" inputMode="numeric" enterKeyHint="done" min={40} max={240} value={tempoDraft ?? String(bpm)} onFocus={() => setTempoDraft(String(bpm))} onChange={event => setTempoDraft(event.target.value)} onBlur={commitTempo} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }}/><span>BPM</span></span>
        </label>
        <p>4 beats per chord · {progression.entries.length} {progression.entries.length === 1 ? 'chord' : 'chords'}</p>
      </div>
      <ol className="progression-cards">
        {progression.entries.map((entry, index) => {
          const label = chordLabel(entry.root, entry.structureId)
          const voicings = getChordVoicings(entry.root, entry.structureId)
          const voicing = voicings.find(item => item.id === entry.voicingId) ?? voicings[0]
          return <li key={entry.id} className={`progression-card${activeEntryId === entry.id ? ' is-playing' : ''}`} aria-current={activeEntryId === entry.id ? 'step' : undefined}>
            <div className="progression-card-header">
              <h3><span>{index + 1}.</span> {label}</h3>
              <div className="progression-card-actions">
                <button type="button" aria-label={`Move chord ${index + 1}, ${label}, earlier`} disabled={index === 0} onClick={() => { edit(() => progression.moveChord(entry.id, -1)); setAnnouncement(`${label} moved to position ${index}.`) }}>←</button>
                <button type="button" aria-label={`Move chord ${index + 1}, ${label}, later`} disabled={index === progression.entries.length - 1} onClick={() => { edit(() => progression.moveChord(entry.id, 1)); setAnnouncement(`${label} moved to position ${index + 2}.`) }}>→</button>
                <button type="button" aria-label={`Remove chord ${index + 1}, ${label}`} onClick={() => { edit(() => progression.removeChord(entry.id)); setAnnouncement(`${label} removed.`) }}>×</button>
              </div>
            </div>
            {voicing ? <ChordDiagram voicing={voicing} label={label} compact/> : null}
            <label className="progression-voicing">Fingering
              <select aria-label={`Fingering for chord ${index + 1}, ${label}`} value={voicing?.id ?? ''} onChange={event => edit(() => progression.updateChord(entry.id, { voicingId: event.target.value }))}>{voicings.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </label>
            <div className="progression-card-buttons">
              <button type="button" className="secondary-button" aria-label={`Strum chord ${index + 1}, ${label}`} onClick={() => { if (playing) onStop(); onPlayChord(entry) }}>Strum</button>
              <button type="button" className="secondary-button" aria-label={`Show chord ${index + 1}, ${label}, on fretboard`} onClick={() => { if (playing) onStop(); onShowChord(entry) }}>Show</button>
            </div>
          </li>
        })}
      </ol>
    </>}
  </div>
}
