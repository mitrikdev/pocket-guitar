'use client'

import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import type { InstrumentId } from './music'
import { PracticeAudio, DEFAULT_BPM, clampBeatsPerBar, clampBpm, updateTapTempo } from './practice-audio'

export function usePracticeAudio() {
  const [soundEnabled, updateSoundEnabled] = useState(true)
  const [bpm, updateBpm] = useState(DEFAULT_BPM)
  const [beatsPerBar, updateBeatsPerBar] = useState(4)
  const [metroRunning, setMetroRunning] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(-1)
  const [audioError, setAudioError] = useState<string | null>(null)
  const engineRef = useRef<PracticeAudio | null>(null)
  const mounted = useRef(false)
  const soundRef = useRef(true)
  const bpmRef = useRef(DEFAULT_BPM)
  const barRef = useRef(4)
  const noteGeneration = useRef(0)
  const metroGeneration = useRef(0)
  const taps = useRef<number[]>([])

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new PracticeAudio({
        onBeat: beat => { if (mounted.current) setCurrentBeat(beat) },
        onRunning: running => { if (mounted.current) setMetroRunning(running) },
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

  const setSoundEnabled = useCallback((action: SetStateAction<boolean>) => {
    const enabled = typeof action === 'function' ? action(soundRef.current) : action
    soundRef.current = enabled
    updateSoundEnabled(enabled)
    if (!enabled) {
      noteGeneration.current++
      engineRef.current?.stopNotes()
    }
  }, [])

  const setBpm = useCallback((action: SetStateAction<number>) => {
    const next = clampBpm(typeof action === 'function' ? action(bpmRef.current) : action)
    bpmRef.current = next
    updateBpm(next)
    engineRef.current?.setTempo(next, barRef.current)
  }, [])

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

  const startMetronome = useCallback(() => {
    if (document.hidden) return
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
  }, [getEngine, reportError])

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
      document.removeEventListener('visibilitychange', visibilityChange)
      window.removeEventListener('pagehide', suspend)
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [])

  return { soundEnabled, setSoundEnabled, playNote, metroRunning, bpm, setBpm, beatsPerBar, setBeatsPerBar, currentBeat, startMetronome, stopMetronome, tapTempo, audioError }
}
