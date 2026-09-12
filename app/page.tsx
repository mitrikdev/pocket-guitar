'use client'

import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { INSTRUMENTS, NOTE_NAMES, STRUCTURES, activeNotes, displayNote, generateFretboard, markerLabel, relationship, type DisplayMode, type InstrumentId, type Position } from '@/lib/music'
import { useFretboardTools } from '@/lib/use-fretboard-tools'

const MODES: DisplayMode[] = ['notes', 'degrees', 'intervals']
const FRETS = Array.from({ length: 13 }, (_, index) => index)

function Brand() {
  return <div className="brand"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M8 3v22M14 3v22M20 3v22M3 9h22M3 19h22"/><circle cx="14" cy="14" r="4"/></svg><span>Pocket Guitar<span className="brand-period">.</span></span></div>
}

export default function Home() {
  const [instrumentId, setInstrumentId] = useState<InstrumentId>('guitar')
  const [root, setRoot] = useState(0)
  const [structureId, setStructureId] = useState('major-scale')
  const [mode, setMode] = useState<DisplayMode>('notes')
  const [selected, setSelected] = useState<{ stringIndex: number; fret: number } | null>(null)
  const [focusCell, setFocusCell] = useState({ stringIndex: 0, fret: 0 })
  const boardRef = useRef<HTMLDivElement>(null)
  const instrument = INSTRUMENTS.find(item => item.id === instrumentId)!
  const structure = STRUCTURES.find(item => item.id === structureId)!
  const board = generateFretboard(instrument)
  const notes = activeNotes(root, structure)
  const position = selected ? board[selected.stringIndex]?.[selected.fret] : null
  const context = position ? relationship(position.pitchClass, root, structure) : null
  const rootName = displayNote(NOTE_NAMES[root])

  function changeInstrument(id: InstrumentId) {
    setInstrumentId(id)
    setSelected(null)
    setFocusCell({ stringIndex: 0, fret: 0 })
  }

  function selectPosition(position: Position) {
    const next = { stringIndex: position.stringIndex, fret: position.fret }
    setSelected(next)
    setFocusCell(next)
  }

  useFretboardTools({ instrumentId, root, structureId, mode, selected }, {
    setInstrument: changeInstrument, setRoot, setStructure: setStructureId, setMode,
    setPosition: position => { setSelected(position); setFocusCell(position) },
  })

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, position: Position) {
    let { stringIndex, fret } = position
    if (event.key === 'ArrowRight') fret = Math.min(12, fret + 1)
    else if (event.key === 'ArrowLeft') fret = Math.max(0, fret - 1)
    else if (event.key === 'ArrowDown') stringIndex = Math.min(board.length - 1, stringIndex + 1)
    else if (event.key === 'ArrowUp') stringIndex = Math.max(0, stringIndex - 1)
    else if (event.key === 'Home') fret = 0
    else if (event.key === 'End') fret = 12
    else return
    event.preventDefault()
    setFocusCell({ stringIndex, fret })
    boardRef.current?.querySelector<HTMLButtonElement>(`[data-position="${stringIndex}-${fret}"]`)?.focus()
  }

  return <>
    <main className="practice-app">
      <header className="app-header"><Brand/><span className="header-note">A little space to practice.</span></header>
      <section className="workspace" aria-label="Fretboard explorer">
        <div className="controls">
          <div className="instrument-switch segmented" role="group" aria-label="Instrument">
            {INSTRUMENTS.map(item => <button key={item.id} type="button" aria-label={item.name} aria-pressed={instrumentId === item.id} onClick={() => changeInstrument(item.id)}>{item.shortName}</button>)}
          </div>
          <div className="musical-selectors">
            <label className="select-wrap root-select"><span className="control-label">Root</span><select aria-label="Root note" value={root} onChange={event => setRoot(Number(event.target.value))}>{NOTE_NAMES.map((name, index) => <option key={name} value={index}>{displayNote(name)}</option>)}</select><span className="chevron" aria-hidden="true"/></label>
            <label className="select-wrap structure-select"><span className="control-label">Explore</span><select aria-label="Scale or chord" value={structureId} onChange={event => setStructureId(event.target.value)}>{(['scale', 'chord'] as const).map(type => <optgroup key={type} label={type === 'scale' ? 'Scales' : 'Chords'}>{STRUCTURES.filter(item => item.type === type).map(item => <option key={item.id} value={item.id}>{item.name} {type}</option>)}</optgroup>)}</select><span className="chevron" aria-hidden="true"/></label>
          </div>
          <div className="mode-switch segmented" role="group" aria-label="Display mode">{MODES.map(item => <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>
        </div>

        <div className="study-summary">
          <div className="study-heading"><h1>{rootName} {structure.name}</h1><span className="study-kind">{structure.type === 'scale' ? 'Scale' : 'Chord tones'}</span></div>
          <div className="note-formula" role="group" aria-label={`${structure.type === 'scale' ? 'Scale notes' : 'Chord tones'}: ${notes.map(item => displayNote(NOTE_NAMES[item.pitchClass])).join(', ')}`}>
            {notes.map(({ pitchClass, interval }) => <span key={pitchClass} className={interval.semitones === 0 ? 'formula-note formula-root' : 'formula-note'}>{markerLabel(NOTE_NAMES[pitchClass], interval, mode)}</span>)}
          </div>
          <div className="legend"><span className="legend-dot"/>Root<span className="legend-member"/> {structure.type === 'scale' ? 'Scale note' : 'Chord tone'}</div>
        </div>

        <div className="fretboard-area">
          <div className="string-labels" aria-hidden="true" style={{ '--string-count': board.length } as CSSProperties}>{board.map(row => <div key={row[0].stringNumber}><span>{row[0].note}</span><small>{row[0].stringNumber}</small></div>)}</div>
          <div className="fretboard" ref={boardRef} role="group" aria-label={`${instrument.name} fretboard, open strings through fret 12. Arrow keys move between positions; Enter or Space selects.`} style={{ '--string-count': board.length } as CSSProperties}>
            <div className="inlays" aria-hidden="true">{FRETS.map(fret => <div key={fret} className={fret === 0 ? 'open-lane' : 'fret-lane'}>{[3, 5, 7, 9].includes(fret) ? <i/> : fret === 12 ? <><i/><i/></> : null}</div>)}</div>
            {board.map((row, stringIndex) => <div className="string-row" key={row[0].stringNumber} style={{ '--string-width': `${0.8 + stringIndex * 0.28}px` } as CSSProperties}>
              {row.map(cell => {
                const relation = relationship(cell.pitchClass, root, structure)
                const isSelected = selected?.stringIndex === stringIndex && selected.fret === cell.fret
                return <button key={cell.fret} type="button" className={`fret-cell${relation.isMember ? ' is-member' : ''}${relation.isRoot ? ' is-root' : ''}${isSelected ? ' is-selected' : ''}${cell.fret === 0 ? ' is-open' : ''}`} data-position={`${stringIndex}-${cell.fret}`} data-note={cell.note} data-member={relation.isMember} data-root={relation.isRoot} aria-pressed={isSelected} aria-label={`${displayNote(cell.note)}${cell.octave}, ${cell.stringName} string ${cell.stringNumber}, ${cell.fret === 0 ? 'open' : `fret ${cell.fret}`}, ${relation.interval.name} of ${rootName}, ${relation.isMember ? `in ${structure.name} ${structure.type}` : `outside ${structure.name} ${structure.type}`}`} tabIndex={focusCell.stringIndex === stringIndex && focusCell.fret === cell.fret ? 0 : -1} onClick={() => selectPosition(cell)} onFocus={() => setFocusCell({ stringIndex, fret: cell.fret })} onKeyDown={event => moveFocus(event, cell)}>
                  <span className="note-marker" aria-hidden="true">{relation.isMember ? markerLabel(cell.note, relation.interval, mode) : isSelected ? displayNote(cell.note) : <span className="muted-position"/>}</span>
                </button>
              })}
            </div>)}
          </div>
          <div className="fret-numbers" aria-hidden="true">{FRETS.map(fret => <span className={[3, 5, 7, 9, 12].includes(fret) ? 'marked-fret' : ''} key={fret}>{fret === 0 ? <span className="open-word">Open</span> : fret}{fret === 12 ? <span className="octave-label">octave</span> : null}</span>)}</div>
        </div>

        <div className="selected-info" aria-live="polite" aria-atomic="true">
          {position && context ? <><span className={`selected-note-badge${context.isRoot ? ' root-badge' : ''}`}>{displayNote(position.note)}<small>{position.octave}</small></span><div className="selected-description"><strong>{context.interval.name} of {rootName}</strong><span>{position.stringName} string · {position.fret === 0 ? 'Open string' : `Fret ${position.fret}`}</span></div><span className={`membership${context.isMember ? ' inside' : ''}`}>{context.isMember ? `Degree ${context.interval.degree}` : `Outside this ${structure.type}`}</span></> : <div className="tap-hint"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg><span>Tap any position to get to know it.</span></div>}
          <span className="tuning-note">Standard tuning <span>·</span> {instrument.tuning.map(item => item.note).join(' · ')}</span>
        </div>
      </section>
      <footer className="app-footer"><span>Explore the notes. Find the connections.</span><span>0—12 frets <span className="footer-divider">/</span> v0.1</span></footer>
    </main>
    <section className="rotate-prompt" role="main" aria-label="Rotate your phone"><Brand/><div className="rotate-content"><svg className="rotate-icon" viewBox="0 0 100 100" aria-hidden="true"><rect x="31" y="14" width="38" height="72" rx="8"/><path d="M44 22h12M44 78h12M78 29a34 34 0 0 1 5 38M83 67l-2-12M83 67l10-7M22 71a34 34 0 0 1-5-38M17 33l2 12M17 33L7 40"/></svg><h2>A little more room<br/>for your fretboard.</h2><p>Rotate your phone to explore.</p><span className="rotate-detail">Guitar · Bass · Bass 5</span></div><span className="portrait-footer">Made for a moment with your instrument.</span></section>
  </>
}
