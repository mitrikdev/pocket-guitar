import type { CSSProperties } from 'react'
import type { ChordVoicing } from '@/lib/chords'

export const FINGER_NAMES = ['Open', 'Index', 'Middle', 'Ring', 'Little'] as const

export function FingerLegend() {
  return <div className="finger-legend" role="group" aria-label="Finger colors: 1 index, 2 middle, 3 ring, 4 little">
    {[1, 2, 3, 4].map(finger => <span key={finger}><i style={{ '--finger-color': 'var(--finger-' + finger + ')' } as CSSProperties}>{finger}</i>{FINGER_NAMES[finger]}</span>)}
    <small>○ open · × mute</small>
  </div>
}

export function ChordDiagram({ voicing, label, compact = false }: { voicing: ChordVoicing; label: string; compact?: boolean }) {
  const fretted = voicing.frets.filter((fret): fret is number => fret !== null && fret > 0)
  const lowest = Math.min(...fretted)
  const highest = Math.max(...fretted)
  const baseFret = highest <= 5 ? 1 : lowest
  const x = (stringIndex: number) => 28 + stringIndex * 21
  const y = (fret: number) => 35 + (fret - baseFret + .5) * 22
  const spoken = voicing.frets.map((fret, index) => fret === null ? 'muted' : fret === 0 ? 'open' : 'fret ' + fret + ', ' + FINGER_NAMES[voicing.fingers[index] ?? 0] + ' finger ' + voicing.fingers[index]).join(', ')
  return <svg className={'chord-diagram' + (compact ? ' compact' : '')} viewBox="0 0 162 166" role="img" aria-label={label + ', ' + voicing.name + '. Low E to high E: ' + spoken}>
    <title>{label + ' — ' + voicing.name}</title>
    {baseFret > 1 ? <text x="4" y="50" className="diagram-fret-label">{baseFret}fr</text> : null}
    {[0, 1, 2, 3, 4, 5].map(line => <path key={'fret' + line} className={line === 0 && baseFret === 1 ? 'diagram-nut' : 'diagram-wire'} d={'M28 ' + (35 + line * 22) + 'H133'}/>)}
    {[0, 1, 2, 3, 4, 5].map(string => <path key={'string' + string} className="diagram-wire" d={'M' + x(string) + ' 35V145'}/>)}
    {voicing.barres.map((barre, index) => <path key={index} className="diagram-barre" style={{ '--finger-color': 'var(--finger-' + barre.finger + ')' } as CSSProperties} d={'M' + x(6 - Math.max(barre.fromString, barre.toString)) + ' ' + y(barre.fret) + 'H' + x(6 - Math.min(barre.fromString, barre.toString))}/>)}
    {voicing.frets.map((fret, string) => {
      const finger = voicing.fingers[string] ?? 0
      if (fret === null || fret === 0) return <text key={string} x={x(string)} y="23" className="diagram-open">{fret === null ? '×' : '○'}</text>
      return <g key={string}><circle cx={x(string)} cy={y(fret)} r="8.5" className="diagram-dot" style={{ '--finger-color': 'var(--finger-' + finger + ')' } as CSSProperties}/><text x={x(string)} y={y(fret) + 3.5} className="diagram-finger">{finger}</text></g>
    })}
    {['E', 'A', 'D', 'G', 'B', 'e'].map((name, index) => <text key={index} x={x(index)} y="161" className="diagram-string-label">{name}</text>)}
  </svg>
}
