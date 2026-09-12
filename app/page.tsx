'use client'

import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { INSTRUMENTS, NOTE_NAMES, STRUCTURES, MAX_FRET, activeNotes, displayNote, fretMarkerCount, generateFretboard, getFretWindow, markerLabel, relationship, type DisplayMode, type InstrumentId, type Position } from '@/lib/music'
import { useFretboardTools } from '@/lib/use-fretboard-tools'
import { usePracticeAudio } from '@/lib/use-practice-audio'
import { useVisibleViewport } from '@/lib/use-visible-viewport'
import { PracticeDialog } from './components/practice-dialog'
import { MetronomePanel, TunerPanel } from './components/audio-panels'

const MODES: DisplayMode[] = ['notes', 'degrees', 'intervals']
type Panel = 'settings' | 'metronome' | 'tuner'

function Icon({ name }: { name: 'settings' | 'sound' | 'muted' | 'metronome' | 'tuner' | 'left' | 'right' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'settings' ? <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></> : null}
    {name === 'sound' || name === 'muted' ? <><path d="M11 4 6 8H3v8h3l5 4z"/>{name === 'sound' ? <path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/> : <path d="m16 9 6 6m0-6-6 6"/>}</> : null}
    {name === 'metronome' ? <><path d="m9 3-5 18h16L15 3zM12 17l6-10M8 17h8"/><circle cx="17" cy="9" r="1.5"/></> : null}
    {name === 'tuner' ? <path d="M8 3v7a4 4 0 0 0 8 0V3M12 14v7M9 21h6"/> : null}
    {name === 'left' ? <path d="m14 6-6 6 6 6"/> : name === 'right' ? <path d="m10 6 6 6-6 6"/> : null}
  </svg>
}

export default function Home() {
  const [instrumentId, setInstrumentId] = useState<InstrumentId>('guitar')
  const [root, setRoot] = useState(0)
  const [structureId, setStructureId] = useState('major-scale')
  const [mode, setMode] = useState<DisplayMode>('notes')
  const [windowSpan, setWindowSpan] = useState(6)
  const [firstFret, setFirstFret] = useState(0)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [selected, setSelected] = useState<{ stringIndex: number; fret: number } | null>(null)
  const [focusCell, setFocusCell] = useState({ stringIndex: 0, fret: 0 })
  const boardRef = useRef<HTMLDivElement>(null)
  const soundBeforeTuner = useRef(true)
  const audio = usePracticeAudio()
  useVisibleViewport()
  const instrument = INSTRUMENTS.find(item => item.id === instrumentId)!
  const structure = STRUCTURES.find(item => item.id === structureId)!
  const board = generateFretboard(instrument)
  const fretWindow = getFretWindow(firstFret, windowSpan)
  const notes = activeNotes(root, structure)
  const position = selected ? board[selected.stringIndex]?.[selected.fret] : null
  const context = position ? relationship(position.pitchClass, root, structure) : null
  const rootName = displayNote(NOTE_NAMES[root])

  function changeInstrument(id: InstrumentId) {
    setInstrumentId(id)
    setSelected(null)
    setFocusCell({ stringIndex: 0, fret: firstFret })
  }

  function changeFretRange(value: number, span = windowSpan) {
    const next = getFretWindow(value, span)
    setFirstFret(next.start)
    setSelected(previous => previous && previous.fret >= next.start && previous.fret <= next.end ? previous : null)
    setFocusCell(previous => ({ ...previous, fret: Math.max(next.start, Math.min(next.end, previous.fret)) }))
  }

  function changeWindow(span: number) {
    setWindowSpan(span)
    changeFretRange(firstFret, span)
  }

  function selectPosition(cell: Position) {
    const next = { stringIndex: cell.stringIndex, fret: cell.fret }
    setSelected(next)
    setFocusCell(next)
    audio.playNote(cell.midi, instrumentId)
  }

  function openPanel(next: Panel) {
    if (next === 'tuner') {
      soundBeforeTuner.current = audio.soundEnabled
      audio.setSoundEnabled(false)
      audio.stopMetronome()
    }
    setPanel(next)
  }

  function closePanel() {
    if (panel === 'tuner') audio.setSoundEnabled(soundBeforeTuner.current)
    setPanel(null)
  }

  useFretboardTools({ instrumentId, root, structureId, mode, selected, firstFret, windowSpan }, {
    setInstrument: changeInstrument, setRoot, setStructure: setStructureId, setMode,
    setRange: changeFretRange,
    setPosition: cell => {
      if (cell.fret < firstFret || cell.fret > fretWindow.end) setFirstFret(getFretWindow(cell.fret - windowSpan / 2, windowSpan).start)
      setSelected(cell)
      setFocusCell(cell)
    },
  })

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, cell: Position) {
    let { stringIndex, fret } = cell
    if (event.key === 'ArrowRight') fret = Math.min(fretWindow.end, fret + 1)
    else if (event.key === 'ArrowLeft') fret = Math.max(firstFret, fret - 1)
    else if (event.key === 'ArrowDown') stringIndex = Math.min(board.length - 1, stringIndex + 1)
    else if (event.key === 'ArrowUp') stringIndex = Math.max(0, stringIndex - 1)
    else if (event.key === 'Home') fret = firstFret
    else if (event.key === 'End') fret = fretWindow.end
    else return
    event.preventDefault()
    setFocusCell({ stringIndex, fret })
    boardRef.current?.querySelector<HTMLButtonElement>('[data-position="' + stringIndex + '-' + fret + '"]')?.focus()
  }

  return <main className="practice-app">
    <header className="app-header"><div className="brand"><span className="brand-mark" aria-hidden="true">✳</span>Pocket Guitar<span className="brand-period">.</span></div><span className="header-note">A little space to practice.</span></header>
    <section className="workspace" aria-label="Fretboard explorer">
      <div className="controls">
        <button className="setup-button" type="button" onClick={() => openPanel('settings')} aria-label={'Settings: ' + instrument.name + ', ' + mode + ', ' + (windowSpan + 1) + ' positions'}><Icon name="settings"/><span>{instrument.shortName}</span></button>
        <label className="select-wrap root-select"><span className="control-label">Root</span><select aria-label="Root note" value={root} onChange={event => setRoot(Number(event.target.value))}>{NOTE_NAMES.map((name, index) => <option key={name} value={index}>{displayNote(name)}</option>)}</select><span className="chevron" aria-hidden="true"/></label>
        <label className="select-wrap structure-select"><span className="control-label">Explore</span><select aria-label="Scale or chord" value={structureId} onChange={event => setStructureId(event.target.value)}>{(['scale', 'chord'] as const).map(type => <optgroup key={type} label={type === 'scale' ? 'Scales' : 'Chords'}>{STRUCTURES.filter(item => item.type === type).map(item => <option key={item.id} value={item.id}>{item.name} {type}</option>)}</optgroup>)}</select><span className="chevron" aria-hidden="true"/></label>
        <span className="display-mode-hint">{mode}</span>
      </div>

      <div className="study-summary">
        <div className="study-heading"><h1>{rootName} {structure.name}</h1><span className="study-kind">{structure.type === 'scale' ? 'Scale' : 'Chord tones'}</span></div>
        <div className="note-formula" role="group" aria-label={(structure.type === 'scale' ? 'Scale notes: ' : 'Chord tones: ') + notes.map(item => displayNote(NOTE_NAMES[item.pitchClass])).join(', ')}>
          {notes.map(({ pitchClass, interval }) => <span key={pitchClass} className={interval.semitones === 0 ? 'formula-note formula-root' : 'formula-note'}>{markerLabel(NOTE_NAMES[pitchClass], interval, mode)}</span>)}
        </div>
        <div className="legend"><span className="legend-dot"/>Root<span className="legend-member"/> {structure.type === 'scale' ? 'Scale note' : 'Chord tone'}</div>
      </div>

      <div className="board-scroll">
        <div className={'fretboard-area' + (windowSpan === 12 ? ' wide-view' : '')} style={{ '--fret-columns': 'repeat(' + (windowSpan + 1) + ', minmax(0, 1fr))', '--string-count': board.length } as CSSProperties}>
          <div className="string-labels" aria-hidden="true">{board.map(row => <div key={row[0].stringNumber}><span>{row[0].note}</span><small>{row[0].stringNumber}</small></div>)}</div>
          <div className={'fretboard' + (firstFret > 0 ? ' shifted-neck' : '')} ref={boardRef} role="group" aria-label={instrument.name + ' fretboard, ' + (firstFret === 0 ? 'open strings' : 'fret ' + firstFret) + ' through fret ' + fretWindow.end + '. Arrow keys move between visible positions; Enter or Space selects.'}>
            <div className="inlays" aria-hidden="true">{fretWindow.frets.map(fret => <div key={fret} className={fret === 0 ? 'open-lane' : 'fret-lane'}>{Array.from({ length: fretMarkerCount(fret) }, (_, index) => <i key={index}/>)}</div>)}</div>
            {board.map((row, stringIndex) => <div className="string-row" key={row[0].stringNumber} style={{ '--string-width': (0.8 + stringIndex * 0.3) + 'px' } as CSSProperties}>
              {row.slice(firstFret, fretWindow.end + 1).map(cell => {
                const relation = relationship(cell.pitchClass, root, structure)
                const isSelected = selected?.stringIndex === stringIndex && selected.fret === cell.fret
                return <button key={cell.fret} type="button" className={'fret-cell' + (relation.isMember ? ' is-member' : '') + (relation.isRoot ? ' is-root' : '') + (isSelected ? ' is-selected' : '') + (cell.fret === 0 ? ' is-open' : '')} data-position={stringIndex + '-' + cell.fret} data-note={cell.note} data-member={relation.isMember} data-root={relation.isRoot} aria-pressed={isSelected} aria-label={displayNote(cell.note) + cell.octave + ', ' + cell.stringName + ' string ' + cell.stringNumber + ', ' + (cell.fret === 0 ? 'open' : 'fret ' + cell.fret) + ', ' + relation.interval.name + ' of ' + rootName + ', ' + (relation.isMember ? 'in ' : 'outside ') + structure.name + ' ' + structure.type} tabIndex={focusCell.stringIndex === stringIndex && focusCell.fret === cell.fret ? 0 : -1} onClick={() => selectPosition(cell)} onFocus={() => setFocusCell({ stringIndex, fret: cell.fret })} onKeyDown={event => moveFocus(event, cell)}>
                  <span className="note-marker" aria-hidden="true">{relation.isMember ? markerLabel(cell.note, relation.interval, mode) : isSelected ? displayNote(cell.note) : <span className="muted-position"/>}</span>
                </button>
              })}
            </div>)}
          </div>
          <div className="fret-numbers" aria-hidden="true">{fretWindow.frets.map(fret => <span className={fretMarkerCount(fret) > 0 ? 'marked-fret' : ''} key={fret}>{fret === 0 ? 'Open' : fret}</span>)}</div>
        </div>
      </div>

      <div className="neck-navigation">
        <label className="range-caption" htmlFor="fret-range"><span>Frets</span><output htmlFor="fret-range">{firstFret}–{fretWindow.end}</output></label>
        <button className="range-step" type="button" aria-label="Move toward open strings" disabled={firstFret === 0} onClick={() => changeFretRange(firstFret - 1)}><Icon name="left"/></button>
        <input id="fret-range" className="fret-range" type="range" min={0} max={MAX_FRET - windowSpan} step={1} value={firstFret} aria-label="Fretboard position" aria-valuetext={'Showing ' + (firstFret === 0 ? 'open strings' : 'fret ' + firstFret) + ' through fret ' + fretWindow.end} onChange={event => changeFretRange(Number(event.target.value))} style={{ '--range-progress': (firstFret / (MAX_FRET - windowSpan) * 100) + '%' } as CSSProperties}/>
        <button className="range-step" type="button" aria-label="Move toward fret 24" disabled={fretWindow.end === MAX_FRET} onClick={() => changeFretRange(firstFret + 1)}><Icon name="right"/></button>
      </div>

      <div className="practice-toolbar">
        <div className="selected-info" aria-live="polite" aria-atomic="true">
          {position && context ? <><span className={'selected-note-badge' + (context.isRoot ? ' root-badge' : '')}>{displayNote(position.note)}<small>{position.octave}</small></span><div className="selected-description"><strong>{context.interval.short} <span>of {rootName}</span></strong><span>{position.fret === 0 ? 'Open' : 'Fret ' + position.fret} · String {position.stringNumber}</span></div></> : <div className="tap-hint"><span>Tap a note</span><small>Explore & listen</small></div>}
        </div>
        <div className="practice-actions">
          <button type="button" className="tool-button" aria-label={audio.soundEnabled ? 'Mute note playback' : 'Enable note playback'} aria-pressed={audio.soundEnabled} onClick={() => audio.setSoundEnabled(!audio.soundEnabled)}><Icon name={audio.soundEnabled ? 'sound' : 'muted'}/><span>Sound <small>{audio.soundEnabled ? 'on' : 'off'}</small></span></button>
          <button type="button" className={'tool-button' + (audio.metroRunning ? ' tool-active' : '')} onClick={() => openPanel('metronome')} aria-label={'Metronome' + (audio.metroRunning ? ' running at ' + audio.bpm + ' BPM' : '')}><Icon name="metronome"/><span>Tempo<small>{audio.metroRunning ? audio.bpm + ' BPM' : 'Metronome'}</small></span>{audio.metroRunning ? <i className={'tempo-indicator' + (audio.currentBeat === 0 ? ' accented' : '')} key={audio.currentBeat} aria-hidden="true"/> : null}</button>
          <button type="button" className="tool-button" onClick={() => openPanel('tuner')}><Icon name="tuner"/><span>Tuner<small>Guitar & bass</small></span></button>
        </div>
      </div>
      {audio.audioError && !panel ? <div className="audio-toast" role="alert">{audio.audioError}</div> : null}
    </section>

    <PracticeDialog open={panel !== null} title={panel === 'settings' ? 'Your fretboard' : panel === 'metronome' ? 'Metronome' : 'Tuner'} onClose={closePanel}>
      {panel === 'settings' ? <div className="settings-panel">
        <fieldset><legend>Instrument</legend><div className="segmented">{INSTRUMENTS.map(item => <button key={item.id} type="button" aria-pressed={instrumentId === item.id} onClick={() => changeInstrument(item.id)}>{item.shortName}</button>)}</div></fieldset>
        <fieldset><legend>Show on the notes</legend><div className="segmented">{MODES.map(item => <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div></fieldset>
        <fieldset><legend>Visible positions</legend><div className="segmented">{[6, 12].map(span => <button key={span} type="button" aria-pressed={windowSpan === span} onClick={() => changeWindow(span)}>{span + 1} <small>{span === 6 ? 'Comfort' : 'Overview'}</small></button>)}</div><p className="field-hint">Use Comfort for bigger targets. The slider takes either view all the way to fret 24.</p></fieldset>
        <p className="tuning-note">Standard tuning · {instrument.tuning.map(item => item.note + item.octave).join(' · ')}</p>
        <button type="button" className="primary-button" onClick={closePanel}>Back to playing</button>
      </div> : panel === 'metronome' ? <MetronomePanel audio={audio}/> : panel === 'tuner' ? <TunerPanel/> : null}
    </PracticeDialog>
  </main>
}
