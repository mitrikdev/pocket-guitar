'use client'

import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import type { InstrumentId } from './music'
import { PracticeAudio, DEFAULT_BPM, chordNotes, clampBeatsPerBar, clampBpm, progressionTimeline, updateTapTempo, type ProgressionChord } from './practice-audio'

export function usePracticeAudio() {
  const [soundEnabled, updateSoundEnabled] = useState(true)
  const [bpm, updateBpm] = useState(DEFAULT_BPM)
  const [beatsPerBar, updateBeatsPerBar] = useState(4)
  const [metroRunning, setMetroRunning] = useState(false)
  const [progressionRunning, setProgressionRunning] = useState(false)
  const [activeChordId, setActiveChordId] = useState<string | null>(null)
  const [currentBeat, setCurrentBeat] = useState(-1)
  const [audioError, setAudioError] = useState<string | null>(null)
  const engineRef = useRef<PracticeAudio | null>(null)
  const mounted = useRef(false)
  const soundRef = useRef(true)
  const bpmRef = useRef(DEFAULT_BPM)
  const barRef = useRef(4)
  const noteGeneration = useRef(0)
  const metroGeneration = useRef(0)
  const progressionGeneration = useRef(0)
  const taps = useRef<number[]>([])

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new PracticeAudio({
        onBeat: beat => { if (mounted.current) setCurrentBeat(beat) },
        onRunning: running => { if (mounted.current) setMetroRunning(running) },
        onProgressionRunning: running => { if (mounted.current) setProgressionRunning(running) },
        onActiveChord: id => { if (mounted.current) setActiveChordId(id) },
        onError: message => { if (mounted.current) setAudioError(message) },
      })
      engineRef.current.setTempo(bpmRef.current, barRef.current)
    }
    return engineRef.current
  }, [])

  const reportError = useCallback((error: unknown) => {
    if (mounted.current) setAudioError(error instanceof Error ? error.message : 'Audio could not start. Tap again to retry.')
  }, [])

  const stopMetronome = useCallback(() => {
    metroGeneration.current++
    engineRef.current?.stopMetronome()
  }, [])

  const stopProgression = useCallback(() => {
    progressionGeneration.current++
    noteGeneration.current++
    engineRef.current?.stopProgression()
    if (mounted.current) {
      setProgressionRunning(false)
      setActiveChordId(null)
    }
  }, [])

  const setSoundEnabled = useCallback((action: SetStateAction<boolean>) => {
    const enabled = typeof action === 'function' ? action(soundRef.current) : action
    soundRef.current = enabled
    updateSoundEnabled(enabled)
    if (!enabled) {
      stopProgression()
      engineRef.current?.stopNotes()
    }
  }, [stopProgression])

  const setBpm = useCallback((action: SetStateAction<number>) => {
    const next = clampBpm(typeof action === 'function' ? action(bpmRef.current) : action)
    if (next !== bpmRef.current) stopProgression()
    bpmRef.current = next
    updateBpm(next)
    engineRef.current?.setTempo(next, barRef.current)
  }, [stopProgression])

  const setBeatsPerBar = useCallback((action: SetStateAction<number>) => {
    const next = clampBeatsPerBar(typeof action === 'function' ? action(barRef.current) : action)
    barRef.current = next
    updateBeatsPerBar(next)
    engineRef.current?.setTempo(bpmRef.current, next)
  }, [])

  const playNote = useCallback((midi: number, instrumentId: InstrumentId) => {
    if (!soundRef.current || document.hidden) return
    const generation = noteGeneration.current
    try {
      const engine = getEngine()
      void engine.unlock().then(() => {
        if (!mounted.current || document.hidden || !soundRef.current || generation !== noteGeneration.current || engineRef.current !== engine) return
        engine.playNote(midi, instrumentId)
        setAudioError(null)
      }).catch(error => {
        if (generation === noteGeneration.current && !document.hidden) reportError(error)
      })
    } catch (error) { reportError(error) }
  }, [getEngine, reportError])

  const playChord = useCallback((midis: readonly number[], instrumentId: InstrumentId = 'guitar') => {
    if (!soundRef.current || document.hidden) return
    stopProgression()
    const generation = ++noteGeneration.current
    try {
      const notes = chordNotes(midis)
      const engine = getEngine()
      void engine.unlock().then(() => {
        if (!mounted.current || document.hidden || !soundRef.current || generation !== noteGeneration.current || engineRef.current !== engine) return
        engine.playChord(notes, instrumentId)
        setAudioError(null)
      }).catch(error => {
        if (generation === noteGeneration.current && !document.hidden) reportError(error)
      })
    } catch (error) { reportError(error) }
  }, [getEngine, reportError, stopProgression])

  const startProgression = useCallback((chords: readonly ProgressionChord[]) => {
    if (document.hidden) return
    if (!soundRef.current) {
      setAudioError('Turn sound on to play your progression.')
      return
    }
    stopMetronome()
    stopProgression()
    const generation = ++progressionGeneration.current
    try {
      const snapshot = progressionTimeline(chords, bpmRef.current, 0).chords
      const engine = getEngine()
      // Show Stop while iOS resumes audio, so a pending start remains cancellable.
      setProgressionRunning(true)
      setAudioError(null)
      void engine.unlock().then(() => {
        if (!mounted.current || document.hidden || !soundRef.current || generation !== progressionGeneration.current || engineRef.current !== engine) return
        setAudioError(null)
        engine.startProgression(snapshot)
      }).catch(error => {
        if (generation === progressionGeneration.current && !document.hidden) {
          if (mounted.current) setProgressionRunning(false)
          reportError(error)
        }
      })
    } catch (error) {
      if (mounted.current) setProgressionRunning(false)
      reportError(error)
    }
  }, [getEngine, reportError, stopMetronome, stopProgression])

  const startMetronome = useCallback(() => {
    if (document.hidden) return
    stopProgression()
    const generation = ++metroGeneration.current
    try {
      const engine = getEngine()
      void engine.unlock().then(() => {
        if (!mounted.current || document.hidden || generation !== metroGeneration.current || engineRef.current !== engine) return
        setAudioError(null)
        engine.startMetronome()
      }).catch(error => {
        if (generation === metroGeneration.current && !document.hidden) reportError(error)
      })
    } catch (error) { reportError(error) }
  }, [getEngine, reportError, stopProgression])

  const tapTempo = useCallback(() => {
    const result = updateTapTempo(taps.current, performance.now())
    taps.current = result.taps
    if (result.bpm !== null) setBpm(result.bpm)
  }, [setBpm])

  useEffect(() => {
    mounted.current = true
    const suspend = () => {
      noteGeneration.current++
      metroGeneration.current++
      progressionGeneration.current++
      taps.current = []
      engineRef.current?.suspend()
    }
    const visibilityChange = () => { if (document.hidden) suspend() }
    document.addEventListener('visibilitychange', visibilityChange)
    window.addEventListener('pagehide', suspend)
    return () => {
      mounted.current = false
      noteGeneration.current++
      metroGeneration.current++
      progressionGeneration.current++
      document.removeEventListener('visibilitychange', visibilityChange)
      window.removeEventListener('pagehide', suspend)
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [])

  return { soundEnabled, setSoundEnabled, playNote, playChord, startProgression, stopProgression, progressionRunning, activeChordId, metroRunning, bpm, setBpm, beatsPerBar, setBeatsPerBar, currentBeat, startMetronome, stopMetronome, tapTempo, audioError }
}
