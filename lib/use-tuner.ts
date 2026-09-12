'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPitchDetector, PitchSmoother, TUNER_BUFFER_SIZE, type PitchReading } from './pitch'

export type TunerStatus = 'idle' | 'requesting' | 'listening' | 'error'

type TunerSession = {
  context: AudioContext
  stream: MediaStream | null
  source: MediaStreamAudioSourceNode | null
  analyser: AnalyserNode | null
  timer: ReturnType<typeof setTimeout> | null
}

function releaseSession(session: TunerSession) {
  if (session.timer !== null) clearTimeout(session.timer)
  session.timer = null
  session.source?.disconnect()
  session.analyser?.disconnect()
  session.stream?.getTracks().forEach(track => {
    track.onended = null
    track.stop()
  })
  if (session.context.state !== 'closed') void session.context.close().catch(() => {})
}

function microphoneError(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone access is blocked. Allow it in your browser’s site settings, then try again.'
  }
  if (name === 'NotFoundError') return 'No microphone was found. Connect one and try again.'
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'The microphone is unavailable. Close other apps using it, then try again.'
  }
  return 'The tuner could not start. Tap Start tuner to try again.'
}

export function useTuner() {
  const [status, setStatus] = useState<TunerStatus>('idle')
  const [reading, setReading] = useState<PitchReading | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<TunerSession | null>(null)
  const mountedRef = useRef(false)

  const stop = useCallback(() => {
    const session = sessionRef.current
    sessionRef.current = null
    if (session) releaseSession(session)
    if (mountedRef.current) {
      setStatus('idle')
      setReading(null)
      setError(null)
    }
  }, [])

  const start = useCallback(() => {
    if (sessionRef.current || !mountedRef.current || document.hidden) return
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setStatus('error')
      setError('The tuner needs microphone access in a browser using HTTPS. Open the published app to tune.')
      return
    }

    let session: TunerSession
    try {
      // Create and resume synchronously in the button's gesture, before asking for mic permission.
      const context = new AudioContext()
      session = { context, stream: null, source: null, analyser: null, timer: null }
      sessionRef.current = session
      setStatus('requesting')
      setReading(null)
      setError(null)
      const resumed = context.resume()
      // Also handle a synchronous media request failure before Promise.all is installed.
      void resumed.catch(() => {})
      const permission = navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
        video: false,
      }).then(stream => {
        // Permission may resolve after Stop, navigation, or a later start request.
        if (sessionRef.current !== session || !mountedRef.current || document.hidden) {
          stream.getTracks().forEach(track => track.stop())
          return null
        }
        session.stream = stream
        return stream
      })

      void Promise.all([resumed, permission]).then(([, stream]) => {
        if (!stream || sessionRef.current !== session || !mountedRef.current) return
        session.source = context.createMediaStreamSource(stream)
        session.analyser = context.createAnalyser()
        session.analyser.fftSize = TUNER_BUFFER_SIZE
        session.analyser.smoothingTimeConstant = 0
        session.source.connect(session.analyser)
        // Deliberately never connect microphone input to speakers or any network destination.
        const input = new Float32Array(TUNER_BUFFER_SIZE)
        const detect = createPitchDetector()
        const smoother = new PitchSmoother()
        stream.getAudioTracks().forEach(track => {
          track.onended = () => {
            if (sessionRef.current !== session) return
            stop()
            setStatus('error')
            setError('Microphone access ended. Tap Start tuner to reconnect.')
          }
        })
        setStatus('listening')
        const analyse = () => {
          if (sessionRef.current !== session || !session.analyser) return
          try {
            if (context.state !== 'running') {
              stop()
              setStatus('error')
              setError('Audio was interrupted. Tap Start tuner to reconnect.')
              return
            }
            session.analyser.getFloatTimeDomainData(input)
            const next = smoother.update(detect(input, context.sampleRate), performance.now())
            setReading(next)
            session.timer = setTimeout(analyse, 80)
          } catch (cause) {
            stop()
            setStatus('error')
            setError(microphoneError(cause))
          }
        }
        analyse()
      }).catch(cause => {
        if (sessionRef.current !== session) return
        sessionRef.current = null
        releaseSession(session)
        if (mountedRef.current) {
          setStatus('error')
          setReading(null)
          setError(microphoneError(cause))
        }
      })
    } catch (cause) {
      const current = sessionRef.current
      sessionRef.current = null
      if (current) releaseSession(current)
      setStatus('error')
      setError(microphoneError(cause))
    }
  }, [stop])

  useEffect(() => {
    mountedRef.current = true
    const onVisibility = () => { if (document.hidden) stop() }
    const onPageHide = () => stop()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      mountedRef.current = false
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      stop()
    }
  }, [stop])

  return { status, reading, error, start, stop }
}
