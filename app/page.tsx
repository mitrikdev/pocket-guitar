'use client'

import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { INSTRUMENTS, NOTE_NAMES, STRUCTURES, MAX_FRET, activeNotes, displayNote, fretMarkerCount, generateFretboard, getFretWindow, markerLabel, relationship, type DisplayMode, type InstrumentId, type Position } from '@/lib/music'
import { useFretboardTools } from '@/lib/use-fretboard-tools'
import { usePracticeAudio } from '@/lib/use-practice-audio'
import { usePracticeViewport } from '@/lib/use-practice-viewport'
import { useCustomChords } from '@/lib/use-custom-chords'
import { customStructure, suggestChord, type CustomChord } from '@/lib/custom-chords'
import { ChordBuilder, type BuilderSeed } from './components/chord-builder'
import { chordLabel, getChordVoicings, voicingMidi, voicingWindow } from '@/lib/chords'
import { useProgression } from '@/lib/use-progression'
import { entryVoicing, type ProgressionEntry } from '@/lib/progression'
import { ProgressionPanel } from './components/progression-panel'
import { FingerLegend, FINGER_NAMES } from './components/chord-diagram'
import { PracticeDialog } from './components/practice-dialog'
import { MetronomePanel, TunerPanel } from './components/audio-panels'

const MODES: DisplayMode[] = ['notes', 'degrees', 'intervals']
type Panel = 'settings' | 'metronome' | 'tuner' | 'progression' | 'tools' | 'mychords'

function Icon({ name }: { name: 'settings' | 'sound' | 'muted' | 'metronome' | 'tuner' | 'left' | 'right' | 'progression' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'settings' ? <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></> : null}
    {name === 'sound' || name === 'muted' ? <><path d="M11 4 6 8H3v8h3l5 4z"/>{name === 'sound' ? <path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/> : <path d="m16 9 6 6m0-6-6 6"/>}</> : null}
    {name === 'metronome' ? <><path d="m9 3-5 18h16L15 3zM12 17l6-10M8 17h8"/><circle cx="17" cy="9" r="1.5"/></> : null}
    {name === 'progression' ? <><rect x="3" y="5" width="5" height="14" rx="1"/><rect x="11" y="5" width="5" height="14" rx="1"/><path d="M20 5v14M3 10h5m3 0h5"/></> : null}
    {name === 'tuner' ? <path d="M8 3v7a4 4 0 0 0 8 0V3M12 14v7M9 21h6"/> : null}
    {name === 'left' ? <path d="m14 6-6 6 6 6"/> : name === 'right' ? <path d="m10 6 6 6-6 6"/> : null}
  </svg>
}

export default function Home() {
  const [instrumentId, setInstrumentId] = useState<InstrumentId>('guitar')
  const [root, setRoot] = useState(0)
  const [structureId, setStructureId] = useState('major-scale')
  const [chordView, setChordView] = useState<'fingerings' | 'tones'>('fingerings')
  const [voicingId, setVoicingId] = useState('')
  const [mode, setMode] = useState<DisplayMode>('notes')
  const [windowSpan, setWindowSpan] = useState(6)
  const [firstFret, setFirstFret] = useState(0)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [selected, setSelected] = useState<{ stringIndex: number; fret: number } | null>(null)
  const [focusCell, setFocusCell] = useState({ stringIndex: 0, fret: 0 })
  const boardRef = useRef<HTMLDivElement>(null)
  const soundBeforeTuner = useRef(true)
  const audio = usePracticeAudio()
  const progression = useProgression()
  usePracticeViewport()
  const customChords = useCustomChords()
  const [snapshot, setSnapshot] = useState<CustomChord | null>(null)
  const [builder, setBuilder] = useState<BuilderSeed | null>(null)
  const [deleteCustomId, setDeleteCustomId] = useState<string | null>(null)
  const activeCustom = (snapshot?.id === structureId ? snapshot : null) ?? customChords.chords.find(c => c.id === structureId)
  const instrument = INSTRUMENTS.find(item => item.id === instrumentId)!
  const structure = activeCustom ? customStructure(activeCustom) : STRUCTURES.find(item => item.id === structureId) ?? STRUCTURES[0]
  const board = generateFretboard(instrument)
  const voicings = activeCustom ? [activeCustom.voicing] : [...getChordVoicings(root, structureId), ...customChords.chords.filter(c => c.root === root && suggestChord(c.root, c.voicing)?.structureId === structureId).map(c => c.voicing)]
  const voicing = voicings.find(item => item.id === voicingId) ?? voicings[0]
  const voicingIndex = voicings.indexOf(voicing)
  const showFingering = instrumentId === 'guitar' && chordView === 'fingerings' && !!voicing
  const sounding = showFingering ? voicing.frets.filter((f): f is number => f !== null) : []
  const span = sounding.length ? Math.min(24, Math.max(windowSpan, Math.max(...sounding) - Math.min(...sounding) + 1)) : windowSpan
  const fretWindow = showFingering ? voicingWindow(voicing, span) : getFretWindow(firstFret, span)
  const chosenCustom = activeCustom ?? customChords.chords.find(c => c.id === voicing?.id)
  const chordName = chosenCustom?.name ?? chordLabel(root, structureId)
  const windowStart = fretWindow.start
  const focused = { stringIndex: Math.min(focusCell.stringIndex, board.length - 1), fret: Math.max(windowStart, Math.min(fretWindow.end, focusCell.fret)) }
  const notes = activeNotes(root, structure)
  const position = selected ? board[selected.stringIndex]?.[selected.fret] : null
  const context = position ? relationship(position.pitchClass, root, structure) : null
  const rootName = displayNote(NOTE_NAMES[root])

  function changeInstrument(id: InstrumentId) {
    audio.stopProgression()
    setInstrumentId(id)
    setSelected(null)
    setFocusCell({ stringIndex: 0, fret: firstFret })
  }

  function changeFretRange(value: number, span = windowSpan) {
    if (showFingering) setChordView('tones')
    const next = getFretWindow(value, span)
    setFirstFret(next.start)
    setSelected(previous => previous && previous.fret >= next.start && previous.fret <= next.end ? previous : null)
    setFocusCell(previous => ({ ...previous, fret: Math.max(next.start, Math.min(next.end, previous.fret)) }))
  }

  function changeWindow(span: number) {
    setWindowSpan(span)
    if (showFingering) setFirstFret(getFretWindow(firstFret, span).start)
    else changeFretRange(firstFret, span)
  }

  function changeRoot(value: number) {
    audio.stopProgression()
    setRoot(value)
    setVoicingId('')
    setSelected(null)
  }

  function changeStructure(value: string) {
    audio.stopProgression()
    setStructureId(value)
    const custom = customChords.chords.find(c => c.id === value)
    if (custom) { setRoot(custom.root); setSnapshot(custom) }
    setVoicingId('')
    setSelected(null)
  }

  function changeVoicing(id: string) {
    audio.stopProgression()
    setVoicingId(id)
    setSelected(null)
  }

  function toggleChordView() {
    setSelected(null)
    if (showFingering) { setFirstFret(windowStart); setChordView('tones') }
    else { changeInstrument('guitar'); setChordView('fingerings') }
  }

  function playEntry(entry: ProgressionEntry) {
    const shape = entryVoicing(entry)
    if (shape) { audio.setSoundEnabled(true); audio.playChord(voicingMidi(shape), 'guitar') }
  }

  function showEntry(entry: ProgressionEntry) {
    audio.stopProgression()
    setInstrumentId('guitar')
    setRoot(entry.root)
    setStructureId(entry.structureId)
    setSnapshot(entry.custom ?? null)
    setVoicingId(entry.voicingId)
    setChordView('fingerings')
    setSelected(null)
    setPanel(null)
  }

  function playProgression() {
    audio.setSoundEnabled(true)
    audio.startProgression(progression.entries.map(entry => ({ id: entry.id, midis: voicingMidi(entryVoicing(entry)) })))
  }

  function addCurrentChord() {
    audio.stopProgression()
    if (chosenCustom) progression.addCustom(chosenCustom)
    else progression.addChord(root, structureId, voicing?.id)
    openPanel('progression')
  }

  function openBuilder(seed: BuilderSeed) { audio.stopProgression(); setBuilder(seed) }

  function saveCustom(chord: CustomChord) {
    if (!customChords.save(chord)) return
    if (panel === 'progression') {
      if (builder?.targetEntryId) progression.replaceCustom(builder.targetEntryId, chord)
      else progression.addCustom(chord)
    } else { setPanel(null); setInstrumentId('guitar'); setRoot(chord.root); setStructureId(chord.id); setSnapshot(chord); setVoicingId(chord.id); setChordView('fingerings'); setSelected(null) }
    setBuilder(null)
  }

  function selectPosition(cell: Position) {
    const next = { stringIndex: cell.stringIndex, fret: cell.fret }
    setSelected(next)
    setFocusCell(next)
    audio.playNote(cell.midi, instrumentId)
  }

  function openPanel(next: Panel) {
    audio.stopProgression()
    if (next === 'tuner') {
      soundBeforeTuner.current = audio.soundEnabled
      audio.setSoundEnabled(false)
      audio.stopMetronome()
    }
    setPanel(next)
  }

  function closePanel() {
    if (panel === 'progression') audio.stopProgression()
    if (panel === 'tuner') audio.setSoundEnabled(soundBeforeTuner.current)
    setPanel(null)
  }

  useFretboardTools({ instrumentId, root, structureId, structureOverride: activeCustom ? structure : undefined, mode, selected, firstFret: windowStart, windowSpan: span }, {
    setInstrument: changeInstrument, setRoot: changeRoot, setStructure: changeStructure, setMode,
    setRange: changeFretRange,
    setPosition: cell => {
      if (cell.fret < windowStart || cell.fret > fretWindow.end) {
        setChordView('tones')
        setFirstFret(getFretWindow(cell.fret - windowSpan / 2, windowSpan).start)
      }
      setSelected(cell)
      setFocusCell(cell)
    },
  })

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, cell: Position) {
    let { stringIndex, fret } = cell
    if (event.key === 'ArrowRight') fret = Math.min(fretWindow.end, fret + 1)
    else if (event.key === 'ArrowLeft') fret = Math.max(windowStart, fret - 1)
    else if (event.key === 'ArrowDown') stringIndex = Math.min(board.length - 1, stringIndex + 1)
    else if (event.key === 'ArrowUp') stringIndex = Math.max(0, stringIndex - 1)
    else if (event.key === 'Home') fret = windowStart
    else if (event.key === 'End') fret = fretWindow.end
    else return
    event.preventDefault()
    setFocusCell({ stringIndex, fret })
    boardRef.current?.querySelector<HTMLButtonElement>('[data-position="' + stringIndex + '-' + fret + '"]')?.focus()
  }

  return <div className="app-frame"><main className="practice-app">
    <section className="workspace" aria-label="Fretboard explorer">
      <header className="explorer-header">
        <button className="explorer-settings" type="button" onClick={() => openPanel('settings')} aria-label="Open fretboard settings"><Icon name="settings"/><span>{activeCustom?.name ?? rootName + ' ' + structure.name}<small>{instrument.shortName} · {showFingering ? 'Fingering' : 'All notes'}</small></span></button>
        <button className="icon-button" type="button" onClick={()=>audio.setSoundEnabled(!audio.soundEnabled)} aria-label={audio.soundEnabled?'Mute note playback':'Enable note playback'} aria-pressed={audio.soundEnabled}><Icon name={audio.soundEnabled?'sound':'muted'}/></button>
        <button className="compact-button" type="button" aria-label={'Progression builder, ' + progression.entries.length + ' chords'} onClick={()=>openPanel('progression')}>Progression</button>
        <button className="icon-button" type="button" aria-label="Open practice tools" onClick={()=>openPanel('tools')}>⋯</button>
      </header>
      <div className="study-summary">
        <div className="study-heading"><h1>{activeCustom?.name ?? rootName + ' ' + structure.name}</h1><span className="study-kind">{structure.type === 'scale' ? 'Scale' : showFingering ? voicing.name : 'Chord tones'}</span></div>
        <div className="note-formula" role="group" aria-label={(structure.type === 'scale' ? 'Scale notes: ' : 'Chord tones: ') + notes.map(item => displayNote(NOTE_NAMES[item.pitchClass])).join(', ')}>
          {notes.map(({ pitchClass, interval }) => <span key={pitchClass} className={interval.semitones === 0 ? 'formula-note formula-root' : 'formula-note'}>{markerLabel(NOTE_NAMES[pitchClass], interval, mode)}</span>)}
        </div>
        <div className="legend">{showFingering ? 'Numbers = fretting fingers' : <><span className="legend-dot"/>Root<span className="legend-member"/> {structure.type === 'scale' ? 'Scale note' : 'Chord tone'}</>}</div>
      </div>

      <div className="board-scroll">
        <div className={'fretboard-area' + (span > 8 ? ' wide-view' : '')} style={{ '--fret-columns': 'repeat(' + (span + 1) + ', minmax(0, 1fr))', '--string-count': board.length, minWidth: span > 8 ? (span + 1) * 42 : undefined } as CSSProperties}>
          <div className="string-labels" aria-hidden="true">{board.map((row, index) => <div key={row[0].stringNumber}><span>{row[0].note}</span><small>{showFingering ? voicing.frets[5 - index] === null ? '×' : voicing.frets[5 - index] === 0 ? '○' : row[0].stringNumber : row[0].stringNumber}</small></div>)}</div>
          <div className={'fretboard' + (windowStart > 0 ? ' shifted-neck' : '')} ref={boardRef} role="group" aria-label={instrument.name + ' fretboard, ' + (windowStart === 0 ? 'open strings' : 'fret ' + windowStart) + ' through fret ' + fretWindow.end + (showFingering ? ', ' + chordLabel(root, structureId) + ', ' + voicing.name + '. Numbers indicate fretting fingers.' : '.') + ' Arrow keys move between visible positions; Enter or Space selects.'}>
            <div className="inlays" aria-hidden="true">{fretWindow.frets.map(fret => <div key={fret} className={fret === 0 ? 'open-lane' : 'fret-lane'}>{Array.from({ length: fretMarkerCount(fret) }, (_, index) => <i key={index}/>)}</div>)}</div>
            {showFingering ? voicing.barres.map((barre, index) => <div key={index} className="neck-barre" aria-hidden="true" style={{ left: ((barre.fret - windowStart + .5) / (span + 1) * 100) + '%', top: ((Math.min(barre.fromString, barre.toString) - .5) / board.length * 100) + '%', height: (Math.abs(barre.fromString - barre.toString) / board.length * 100) + '%', '--finger-color': 'var(--finger-' + barre.finger + ')' } as CSSProperties}/>) : null}
            {board.map((row, stringIndex) => <div className="string-row" key={row[0].stringNumber} style={{ '--string-width': (0.8 + stringIndex * 0.3) + 'px' } as CSSProperties}>
              {row.slice(windowStart, fretWindow.end + 1).map(cell => {
                const relation = relationship(cell.pitchClass, root, structure)
                const voiced = showFingering && voicing.frets[5 - stringIndex] === cell.fret
                const finger = voiced ? voicing.fingers[5 - stringIndex] : null
                const highlighted = showFingering ? voiced : relation.isMember
                const isSelected = selected?.stringIndex === stringIndex && selected.fret === cell.fret
                return <button key={cell.fret} type="button" className={'fret-cell' + (highlighted ? ' is-member' : '') + (!showFingering && relation.isRoot ? ' is-root' : '') + (voiced ? ' is-voiced' : '') + (isSelected ? ' is-selected' : '') + (cell.fret === 0 ? ' is-open' : '')} style={voiced ? { '--finger-color': finger ? 'var(--finger-' + finger + ')' : 'var(--bone)' } as CSSProperties : undefined} data-position={stringIndex + '-' + cell.fret} data-note={cell.note} data-member={highlighted} data-finger={finger ?? undefined} data-root={relation.isRoot} aria-pressed={isSelected} aria-label={displayNote(cell.note) + cell.octave + ', ' + cell.stringName + ' string ' + cell.stringNumber + ', ' + (cell.fret === 0 ? 'open' : 'fret ' + cell.fret) + ', ' + relation.interval.name + ' of ' + rootName + ', ' + (relation.isMember ? 'in ' : 'outside ') + structure.name + ' ' + structure.type + (showFingering ? voiced ? ', ' + (finger ? FINGER_NAMES[finger] + ' finger ' + finger : 'play open string') : ', not played in this fingering' : '')} tabIndex={focused.stringIndex === stringIndex && focused.fret === cell.fret ? 0 : -1} onClick={() => selectPosition(cell)} onFocus={() => setFocusCell({ stringIndex, fret: cell.fret })} onKeyDown={event => moveFocus(event, cell)}>
                  <span className="note-marker" aria-hidden="true">{voiced ? finger || '○' : !showFingering && relation.isMember ? markerLabel(cell.note, relation.interval, mode) : isSelected ? displayNote(cell.note) : <span className="muted-position"/>}</span>
                </button>
              })}
            </div>)}
          </div>
          <div className="fret-numbers" aria-hidden="true">{fretWindow.frets.map(fret => <span className={fretMarkerCount(fret) > 0 ? 'marked-fret' : ''} key={fret}>{fret === 0 ? 'Open' : fret}</span>)}</div>
        </div>
      </div>

      <div className={'neck-navigation' + (showFingering ? ' fingering-navigation' : '')}>
        {structure.type === 'chord' ? <button className="chord-view-toggle" type="button" onClick={toggleChordView}>{showFingering ? 'All tones' : instrumentId === 'guitar' ? 'Fingerings' : 'Guitar shapes'}</button> : null}
        {showFingering ? <>
          <button className="range-step shape-step" type="button" aria-label="Previous fingering" disabled={voicingIndex === 0} onClick={() => changeVoicing(voicings[voicingIndex - 1].id)}><Icon name="left"/></button>
          <select className="voicing-select" aria-label="Chord fingering" value={voicing.id} onChange={event => changeVoicing(event.target.value)}>{voicings.map((shape, index) => <option key={shape.id} value={shape.id}>{index + 1}/{voicings.length} · {shape.name}</option>)}</select>
          <button className="range-step shape-step" type="button" aria-label="Next fingering" disabled={voicingIndex === voicings.length - 1} onClick={() => changeVoicing(voicings[voicingIndex + 1].id)}><Icon name="right"/></button>
          <button className="range-step chord-strum" type="button" aria-label={'Hear ' + chordName + ' chord'} onClick={() => { audio.setSoundEnabled(true); audio.playChord(voicingMidi(voicing), 'guitar') }}><Icon name="sound"/></button>
          <button className="range-step chord-add" type="button" aria-label={'Add ' + chordName + ' to progression'} disabled={!progression.hydrated || progression.entries.length >= 24} onClick={addCurrentChord}>＋</button>
        </> : <>
        <label className="range-caption" htmlFor="fret-range"><span>Frets</span><output htmlFor="fret-range">{firstFret}–{fretWindow.end}</output></label>
        <button className="range-step" type="button" aria-label="Move toward open strings" disabled={firstFret === 0} onClick={() => changeFretRange(firstFret - 1)}><Icon name="left"/></button>
        <input id="fret-range" className="fret-range" type="range" min={0} max={MAX_FRET - windowSpan} step={1} value={firstFret} aria-label="Fretboard position" aria-valuetext={'Showing ' + (firstFret === 0 ? 'open strings' : 'fret ' + firstFret) + ' through fret ' + fretWindow.end} onChange={event => changeFretRange(Number(event.target.value))} style={{ '--range-progress': (firstFret / (MAX_FRET - windowSpan) * 100) + '%' } as CSSProperties}/>
        <button className="range-step" type="button" aria-label="Move toward fret 24" disabled={fretWindow.end === MAX_FRET} onClick={() => changeFretRange(firstFret + 1)}><Icon name="right"/></button>
        </>}
      </div>

      <div className="practice-toolbar">
        <div className="selected-info" aria-live="polite" aria-atomic="true">
          {position && context ? <><span className={'selected-note-badge' + (context.isRoot ? ' root-badge' : '')}>{displayNote(position.note)}<small>{position.octave}</small></span><div className="selected-description"><strong>{context.interval.short} <span>of {rootName}</span></strong><span>{position.fret === 0 ? 'Open' : 'Fret ' + position.fret} · String {position.stringNumber}</span></div></> : showFingering ? <FingerLegend/> : <div className="tap-hint"><span>Tap a note</span><small>Explore & listen</small></div>}
        </div>
      </div>
      {(audio.audioError || customChords.error) && !panel && !builder ? <div className="audio-toast" role="alert">{audio.audioError ?? customChords.error}</div> : null}
    </section>


    <PracticeDialog open={panel !== null} wide={panel === 'progression'} title={panel === 'settings' ? 'Fretboard settings' : panel === 'metronome' ? 'Metronome' : panel === 'progression' ? 'Progression' : panel === 'tools' ? 'Practice tools' : panel === 'mychords' ? 'My chords' : 'Tuner'} onClose={closePanel}>
      {panel === 'settings' ? <div className="drawer-stack">
        <div className="two-fields"><label>Root<select aria-label="Root note" disabled={!!activeCustom} value={root} onChange={e=>changeRoot(Number(e.target.value))}>{NOTE_NAMES.map((n,i)=><option key={n} value={i}>{displayNote(n)}</option>)}</select></label><label>Explore<select aria-label="Scale or chord" value={structureId} onChange={e=>changeStructure(e.target.value)}>{(['scale','chord'] as const).map(type=><optgroup key={type} label={type==='scale'?'Scales':'Chords'}>{STRUCTURES.filter(s=>s.type===type).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>)}{customChords.chords.length?<optgroup label="My chords">{customChords.chords.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>:null}{activeCustom && !customChords.chords.some(c=>c.id===activeCustom.id)?<option value={activeCustom.id}>{activeCustom.name} · saved in progression</option>:null}</select></label></div>
        <fieldset><legend>Instrument</legend><div className="segmented">{INSTRUMENTS.map(item=><button key={item.id} type="button" aria-pressed={instrumentId===item.id} onClick={()=>changeInstrument(item.id)}>{item.shortName}</button>)}</div></fieldset>
        <fieldset><legend>Note labels in tone view</legend><div className="segmented">{MODES.map(item=><button key={item} type="button" aria-pressed={mode===item} onClick={()=>setMode(item)}>{item[0].toUpperCase()+item.slice(1)}</button>)}</div></fieldset>
        <fieldset><legend>Visible positions</legend><div className="segmented">{[6,12].map(n=><button key={n} type="button" aria-pressed={windowSpan===n} onClick={()=>changeWindow(n)}>{n+1} · {n===6?'Comfort':'Overview'}</button>)}</div></fieldset>
        <div className="button-row"><button type="button" className="secondary-button" onClick={()=>openBuilder({root,voicing:showFingering?voicing:undefined,...(chosenCustom?{id:chosenCustom.id,name:chosenCustom.name}:{})})}>{showFingering?'Customize fingering':'Build chord'}</button><button type="button" className="secondary-button" onClick={()=>setPanel('mychords')}>My chords ({customChords.chords.length})</button></div>
        <button type="button" className="primary-button" onClick={closePanel}>Back to playing</button>
      </div> : panel === 'tools' ? <div className="drawer-stack tool-menu">
        <button type="button" className="secondary-button" onClick={()=>openPanel('metronome')}><Icon name="metronome"/>Metronome {audio.metroRunning?'· running':''}</button>
        <button type="button" className="secondary-button" onClick={()=>openPanel('tuner')}><Icon name="tuner"/>Tuner</button>
        <button type="button" className="secondary-button" onClick={()=>setPanel('mychords')}>My chords ({customChords.chords.length})</button>
        <button type="button" className="secondary-button" onClick={()=>openBuilder({root})}>Build a chord</button>
      </div> : panel === 'mychords' ? <div className="drawer-stack">
        <button type="button" className="primary-button" onClick={()=>openBuilder({root})}>Build a new chord</button>
        {customChords.error?<p className="error-message" role="status">{customChords.error}</p>:null}
        {!customChords.chords.length?<p className="field-hint">Your custom shapes will appear here and in the chord selectors.</p>:null}
        {customChords.chords.map(c=><div className="saved-chord-row" key={c.id}><strong>{c.name}</strong><div className="button-row"><button type="button" className="secondary-button" onClick={()=>{changeStructure(c.id);setInstrumentId('guitar');setChordView('fingerings');setPanel(null)}}>Use</button><button type="button" className="secondary-button" onClick={()=>openBuilder({...c})}>Edit</button><button type="button" className="secondary-button" onClick={()=>setDeleteCustomId(c.id)}>Delete</button></div>{deleteCustomId===c.id?<div className="delete-confirm"><p>Delete this library shape? Copies in progressions are kept.</p><button type="button" onClick={()=>setDeleteCustomId(null)}>Cancel</button><button type="button" onClick={()=>{customChords.remove(c.id);if(structureId===c.id){setStructureId('major-chord');setSnapshot(null)}setDeleteCustomId(null)}}>Delete chord</button></div>:null}</div>)}
      </div> : panel === 'metronome' ? <MetronomePanel audio={audio}/> : panel === 'tuner' ? <TunerPanel/> : panel === 'progression' ? <ProgressionPanel progression={progression} customChords={customChords.chords} onBuild={openBuilder} onShowChord={showEntry} onPlayChord={playEntry} onPlay={playProgression} onStop={audio.stopProgression} playing={audio.progressionRunning} activeEntryId={audio.activeChordId} bpm={audio.bpm} onBpmChange={audio.setBpm}/> : null}
      {audio.audioError && panel==='progression'?<p className="error-message" role="alert">{audio.audioError}</p>:null}
    </PracticeDialog>
    <PracticeDialog open={builder!==null} wide title="Chord builder" onClose={()=>setBuilder(null)}>
      {builder?<><ChordBuilder seed={builder} saveLabel={panel === 'progression' ? builder.targetEntryId ? 'Save & replace chord' : 'Save & add chord' : undefined} onSave={saveCustom} onPlay={notes=>{audio.setSoundEnabled(true);audio.playChord(notes,'guitar')}} ready={customChords.hydrated}/>{customChords.error?<p className="error-message" role="status">{customChords.error}</p>:null}</>:null}
    </PracticeDialog>
  </main></div>
}
