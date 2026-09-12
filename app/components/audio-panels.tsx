'use client'

import { useEffect, useState } from 'react'
import { useTuner } from '@/lib/use-tuner'
import type { usePracticeAudio } from '@/lib/use-practice-audio'
import { displayNote } from '@/lib/music'

type AudioControls = ReturnType<typeof usePracticeAudio>

export function MetronomePanel({ audio }: { audio: AudioControls }) {
  const [tempoDraft, setTempoDraft] = useState<string | null>(null)

  function commitTempo() {
    if (tempoDraft !== null && tempoDraft.trim() !== '') {
      const value = Number(tempoDraft)
      if (Number.isFinite(value)) audio.setBpm(value)
    }
    setTempoDraft(null)
  }

  return <div className="metronome-panel">
    <p className="panel-intro">Find your tempo. Keep it steady.</p>
    <div className="tempo-stepper">
      <button type="button" className="step-button" aria-label="Decrease tempo" disabled={audio.bpm <= 40} onClick={() => audio.setBpm(previous => previous - 1)}>−</button>
      <label className="tempo-value"><input aria-label="Tempo in beats per minute" type="number" inputMode="numeric" enterKeyHint="done" min={40} max={240} value={tempoDraft ?? String(audio.bpm)} onFocus={() => setTempoDraft(String(audio.bpm))} onChange={event => setTempoDraft(event.target.value)} onBlur={commitTempo} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }}/><span>BPM</span></label>
      <button type="button" className="step-button" aria-label="Increase tempo" disabled={audio.bpm >= 240} onClick={() => audio.setBpm(previous => previous + 1)}>+</button>
    </div>
    <input className="audio-range" type="range" min={40} max={240} value={audio.bpm} aria-label="Tempo" onChange={event => audio.setBpm(Number(event.target.value))}/>
    <div className="beat-lights" aria-label={`${audio.beatsPerBar} beats per bar`}>
      {Array.from({ length: audio.beatsPerBar }, (_, beat) => <span key={beat} className={`${beat === 0 ? 'downbeat ' : ''}${audio.currentBeat === beat ? 'lit' : ''}`} aria-hidden="true">{beat + 1}</span>)}
    </div>
    <div className="metronome-options"><label>Beats per bar<select aria-label="Beats per bar" value={audio.beatsPerBar} onChange={event => audio.setBeatsPerBar(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map(value => <option key={value} value={value}>{value === 1 ? '1 · no accent' : value}</option>)}</select></label><button className="secondary-button" type="button" onClick={audio.tapTempo}>Tap tempo</button></div>
    <button type="button" className="primary-button" onClick={audio.metroRunning ? audio.stopMetronome : audio.startMetronome}>{audio.metroRunning ? 'Stop metronome' : 'Start metronome'}</button>
    <p className="panel-footnote">Keep this tab open while you play. The first beat is accented.</p>
    {audio.audioError ? <p className="error-message" role="alert">{audio.audioError}</p> : null}
  </div>
}

export function TunerPanel() {
  const tuner = useTuner()
  const reading = tuner.reading
  const active = tuner.status === 'listening' || tuner.status === 'requesting'
  const inTune = Boolean(reading && Math.abs(reading.cents) <= 5)
  const guidance = reading ? inTune ? 'In tune' : reading.cents < 0 ? 'Flat · tighten slightly' : 'Sharp · loosen slightly' : tuner.status === 'listening' ? 'Play one open string' : tuner.status === 'requesting' ? 'Waiting for microphone access…' : 'Ready when you are'
  const [announcement, setAnnouncement] = useState('')
  const nextAnnouncement = reading ? `${reading.note.replace('#', ' sharp')} ${reading.octave}. ${guidance.replace(' · ', '. ')}` : guidance
  useEffect(() => {
    // Speak stable note/category changes, not every cents reading from the analyser.
    const timer = setTimeout(() => setAnnouncement(nextAnnouncement), 600)
    return () => clearTimeout(timer)
  }, [nextAnnouncement])

  return <div className="tuner-panel">
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    <p className="panel-intro">Chromatic tuner <span>· A4 = 440 Hz</span></p>
    <div className={`tuner-reading${inTune ? ' in-tune' : ''}`}><span className="tuner-note">{reading ? displayNote(reading.note) : '—'}<small>{reading?.octave}</small></span><span className="tuner-frequency">{reading ? `${reading.frequency.toFixed(1)} Hz` : 'Guitar & bass'}</span></div>
    <div className={`tuner-meter${inTune ? ' in-tune' : ''}`} role="meter" aria-label="Tuning deviation in cents" aria-valuemin={-50} aria-valuemax={50} aria-valuenow={reading ? Math.max(-50, Math.min(50, reading.cents)) : 0} aria-valuetext={reading ? `${Math.round(reading.cents)} cents, ${guidance}` : 'No pitch detected'}><span className="in-tune-zone"/><span className="meter-center"/><span className={`meter-needle${reading ? '' : ' no-reading'}`} style={{ left: `${50 + Math.max(-50, Math.min(50, reading?.cents ?? 0))}%` }}/></div>
    <div className="meter-labels"><span>♭ −50</span><span>0</span><span>+50 ♯</span></div>
    <p className={`tuner-guidance${inTune ? ' in-tune' : ''}`}>{guidance}</p>
    <button type="button" className="primary-button" onClick={active ? tuner.stop : tuner.start}>{active ? 'Stop microphone' : 'Start tuner'}</button>
    {tuner.error ? <p className="error-message" role="alert">{tuner.error}</p> : null}
    <p className="panel-footnote">Microphone audio stays on your device. Nothing is recorded or uploaded. Closing this panel stops the microphone.</p>
  </div>
}
