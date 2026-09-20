'use client'
import { useState } from 'react'
import { NOTE_NAMES, displayNote } from '@/lib/music'
import { voicingMidi, type ChordVoicing, type Finger, type GuitarStrings } from '@/lib/chords'
import { chordProblem, suggestChord, type CustomChord } from '@/lib/custom-chords'
import { ChordDiagram, FingerLegend } from './chord-diagram'

export type BuilderSeed = { root: number; voicing?: ChordVoicing; name?: string; id?: string; targetEntryId?: string }
const blank = (): ChordVoicing => ({ id: 'draft', name: 'My chord', frets: [null,null,null,null,null,null], fingers: [null,null,null,null,null,null], barres: [] })
const stringNames = ['Low E','A','D','G','B','High E']

export function ChordBuilder({ seed, onSave, onPlay, ready, saveLabel }: {
  seed: BuilderSeed; onSave: (chord: CustomChord) => void; onPlay: (notes: readonly number[]) => void; ready: boolean; saveLabel?: string
}) {
  const [voicing, setVoicing] = useState<ChordVoicing>(seed.voicing ?? blank)
  const [root, setRoot] = useState(seed.root)
  const [name, setName] = useState(seed.name ?? '')
  const [finger, setFinger] = useState<1|2|3|4>(1)
  const positive = Array.from(seed.voicing?.frets ?? []).filter((f): f is number => f !== null && f > 0)
  const [firstFret, setFirstFret] = useState(positive.length ? Math.min(20, Math.min(...positive)) : 1)
  const [barreFret, setBarreFret] = useState(firstFret)
  const [fromString, setFromString] = useState(6)
  const [toString, setToString] = useState(1)
  const [notice, setNotice] = useState('')
  const suggestion = suggestChord(root, voicing)
  const problem = chordProblem(voicing)
  const label = name.trim() || suggestion?.name || 'My chord'

  function setString(index: number, fret: number | null) {
    const frets = [...voicing.frets], fingers = [...voicing.fingers]
    frets[index] = fret
    fingers[index] = fret === null ? null : fret === 0 ? 0 : finger
    setVoicing({ ...voicing, frets: frets as unknown as GuitarStrings<number|null>, fingers: fingers as unknown as GuitarStrings<Finger|null> })
    setNotice('')
  }

  function addBarre() {
    if (fromString === toString) { setNotice('Choose two different strings for the barre.'); return }
    const frets = [...voicing.frets], fingers = [...voicing.fingers]
    for (let s = Math.min(fromString, toString); s <= Math.max(fromString, toString); s++) {
      const i = 6 - s
      if (s === fromString || s === toString || frets[i] === null || frets[i]! <= barreFret) { frets[i] = barreFret; fingers[i] = finger }
    }
    setVoicing({ ...voicing, frets: frets as unknown as GuitarStrings<number|null>, fingers: fingers as unknown as GuitarStrings<Finger|null>, barres: [...voicing.barres.filter(b => !(b.finger === finger && b.fret === barreFret)), { fret: barreFret, fromString, toString, finger }] })
    setNotice('')
  }

  return <div className="chord-builder">
    <div className="builder-board-section">
      <div className="builder-fingers" role="group" aria-label="Finger for next note or barre">
        {[1,2,3,4].map(n => <button key={n} type="button" aria-pressed={finger === n} onClick={() => setFinger(n as 1|2|3|4)} style={{ background: 'var(--finger-' + n + ')' }}>Finger {n}</button>)}
        <button type="button" onClick={() => { setVoicing(blank()); setName(''); setNotice('Blank diagram ready.') }}>Clear</button>
      </div>
      <p className="field-hint">Pick a finger, then tap a fret. Tap the top buttons to cycle muted × and open ○. Tap a selected fret again to mute it.</p>
      <div className="builder-string-heads">{stringNames.map((s, i) => <div key={s}><span>{s}</span><button type="button" aria-label={s + ' string, ' + (voicing.frets[i] === null ? 'muted, set open' : 'set muted')} onClick={() => setString(i, voicing.frets[i] === null ? 0 : null)}>{voicing.frets[i] === null ? '×' : voicing.frets[i] === 0 ? '○' : '—'}</button></div>)}</div>
      <div className="builder-fret-grid" role="group" aria-label="Choose frets">
        {Array.from({ length: 5 }, (_, row) => firstFret + row).map(fret => <div className="builder-fret-row" key={fret}><span className="builder-fret-label">{fret}</span>{stringNames.map((s, i) => <button key={s} type="button" aria-label={s + ' string fret ' + fret} aria-pressed={voicing.frets[i] === fret} onClick={() => setString(i, voicing.frets[i] === fret && voicing.fingers[i] === finger ? null : fret)}><i style={{ background: voicing.frets[i] === fret ? 'var(--finger-' + voicing.fingers[i] + ')' : undefined }}>{voicing.frets[i] === fret ? voicing.fingers[i] : ''}</i></button>)}</div>)}
      </div>
      <label className="builder-range">Frets {firstFret}–{firstFret + 4}<input type="range" min={1} max={20} value={firstFret} aria-label="Builder first fret" onChange={e => setFirstFret(Number(e.target.value))}/></label>
      <FingerLegend/>
    </div>
    <div className="builder-details">
      <div className="builder-naming"><label>Root<select aria-label="Custom chord root" value={root} onChange={e => setRoot(Number(e.target.value))}>{NOTE_NAMES.map((n,i) => <option key={n} value={i}>{displayNote(n)}</option>)}</select></label><label>Name<input aria-label="Custom chord name" maxLength={80} value={name} placeholder={suggestion?.name ?? 'Name your chord'} onChange={e => setName(e.target.value)}/></label></div>
      <p className="field-hint">{suggestion ? 'Suggested: ' + suggestion.name : 'No exact catalog match. Give this shape your own name.'}</p>
      <details className="builder-barres"><summary>Barres ({voicing.barres.length})</summary>
        <div className="barre-fields">
          <label>Fret<select aria-label="Barre fret" value={barreFret} onChange={e => setBarreFret(Number(e.target.value))}>{Array.from({length:24},(_,i)=>i+1).map(n=><option key={n}>{n}</option>)}</select></label>
          <label>From string<select aria-label="Barre from string" value={fromString} onChange={e => setFromString(Number(e.target.value))}>{[6,5,4,3,2,1].map(n=><option key={n}>{n}</option>)}</select></label>
          <label>To string<select aria-label="Barre to string" value={toString} onChange={e => setToString(Number(e.target.value))}>{[6,5,4,3,2,1].map(n=><option key={n}>{n}</option>)}</select></label>
        </div>
        <button type="button" className="secondary-button" onClick={addBarre}>Add barre · finger {finger}</button>
        {voicing.barres.map((b,i)=><div className="barre-item" key={i}><span>Fret {b.fret} · strings {b.fromString}–{b.toString} · finger {b.finger}</span><button type="button" aria-label={'Remove barre ' + (i+1)} onClick={()=>setVoicing({...voicing,barres:voicing.barres.filter((_,index)=>index!==i)})}>×</button></div>)}
      </details>
      <ChordDiagram voicing={voicing} label={label} compact/>
      {notice ? <p role="status" className="field-hint">{notice}</p> : null}
      {problem ? <p className="field-hint">{problem}</p> : null}
      <div className="builder-save-actions"><button type="button" className="secondary-button" disabled={!voicing.frets.some(f=>f!==null)} onClick={()=>onPlay(voicingMidi(voicing))}>Strum</button><button type="button" className="primary-button" disabled={!!problem || !ready} onClick={()=>{
        const id = seed.id ?? ('custom-' + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)))
        onSave({id,root,name:label,voicing:{...voicing,id,name:label}})
      }}>{saveLabel ?? (seed.id ? 'Save changes' : 'Save to My chords')}</button></div>
      <p className="field-hint">Saved in this browser. You can use your chord in the explorer and any progression.</p>
    </div>
  </div>
}
