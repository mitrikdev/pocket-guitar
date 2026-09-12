import type { InstrumentId } from './music'

export const MIN_BPM = 40
export const MAX_BPM = 240
export const DEFAULT_BPM = 96

export function clampBpm(value: number) {
  return Number.isFinite(value) ? Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(value))) : DEFAULT_BPM
}

export function clampBeatsPerBar(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.min(7, Math.round(value))) : 4
}

export function midiToFrequency(midi: number) {
  if (!Number.isFinite(midi) || midi < 0 || midi > 127) throw new RangeError('MIDI note must be between 0 and 127.')
  return 440 * 2 ** ((midi - 69) / 12)
}

export type BeatCursor = { time: number; beat: number }

/** Times are on the audio clock. Late callbacks skip missed beats instead of creating a burst. */
export function scheduledBeats(cursor: BeatCursor, now: number, bpm: number, beatsPerBar: number, lookahead = 0.1) {
  const secondsPerBeat = 60 / clampBpm(bpm)
  const bar = clampBeatsPerBar(beatsPerBar)
  let time = cursor.time
  let beat = cursor.beat % bar
  if (time < now) {
    const missed = Math.ceil((now - time) / secondsPerBeat)
    time += missed * secondsPerBeat
    beat = (beat + missed) % bar
  }
  const beats: BeatCursor[] = []
  while (time < now + lookahead) {
    beats.push({ time, beat })
    time += secondsPerBeat
    beat = (beat + 1) % bar
  }
  return { beats, next: { time, beat } }
}

/** Ignore accidental double taps, and begin a new measurement after a two-second pause. */
export function updateTapTempo(previous: readonly number[], now: number) {
  if (!Number.isFinite(now)) return { taps: [...previous], bpm: null }
  const last = previous.at(-1)
  if (last !== undefined && now - last >= 0 && now - last < 150) return { taps: [...previous], bpm: null }
  const taps = last === undefined || now <= last || now - last > 2000 ? [now] : [...previous.slice(-5), now]
  if (taps.length < 2) return { taps, bpm: null }
  const interval = (taps[taps.length - 1] - taps[0]) / (taps.length - 1)
  return { taps, bpm: clampBpm(60000 / interval) }
}

type Voice = { stop: () => void }
type AudioCallbacks = {
  onBeat: (beat: number) => void
  onRunning: (running: boolean) => void
  onError: (message: string) => void
}

/** One lazy context for note playback and the metronome. No audio is created during rendering. */
export class PracticeAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private voices = new Map<number, Voice>()
  private clicks = new Set<Voice>()
  private timer: ReturnType<typeof setInterval> | null = null
  private animation: number | null = null
  private visualBeats: BeatCursor[] = []
  private cursor: BeatCursor = { time: 0, beat: 0 }
  private lastScheduledTime: number | null = null
  private bpm = DEFAULT_BPM
  private beatsPerBar = 4
  private destroyed = false
  private callbacks: AudioCallbacks

  constructor(callbacks: AudioCallbacks) {
    this.callbacks = callbacks
  }

  /** Call directly in the click/touch handler so iOS receives the user activation. */
  unlock(): Promise<void> {
    if (this.destroyed) return Promise.reject(new Error('Audio is unavailable. Reload the page to try again.'))
    if (!this.context || this.context.state === 'closed') {
      const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return Promise.reject(new Error('This browser does not support audio playback.'))
      this.context = new AudioContextClass({ latencyHint: 'interactive' })
      this.master = this.context.createGain()
      this.master.gain.value = 0.7
      this.compressor = this.context.createDynamicsCompressor()
      this.compressor.threshold.value = -8
      this.compressor.knee.value = 12
      this.compressor.ratio.value = 8
      this.master.connect(this.compressor)
      this.compressor.connect(this.context.destination)
      this.context.onstatechange = () => {
        if (this.context?.state !== 'running') {
          this.stopMetronome()
          this.stopNotes()
        }
      }
    }
    const context = this.context
    // Invoke resume before returning the promise; deferring it loses user activation on iOS.
    return context.resume().then(() => {
      if (context.state !== 'running') throw new Error('Audio is paused. Tap a note or Start to try again.')
    })
  }

  playNote(midi: number, instrument: InstrumentId) {
    const context = this.context
    if (!context || context.state !== 'running' || !this.master || this.destroyed) return
    const frequency = midiToFrequency(midi)
    this.voices.get(midi)?.stop()
    // Eight voices allow a chord to ring while keeping rapid tapping and gain bounded.
    while (this.voices.size >= 8) this.voices.values().next().value?.stop()
    const isBass = instrument !== 'guitar'
    const duration = isBass ? 2.2 : 1.7
    const now = context.currentTime
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(1, now)
    envelope.connect(this.master)
    const oscillators: OscillatorNode[] = []
    const partialGains: GainNode[] = []
    const weights = isBass ? [1, 0.55, 0.3, 0.13, 0.06] : [1, 0.58, 0.32, 0.19, 0.1, 0.055, 0.025]
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      oscillators.forEach(oscillator => { oscillator.onended = null; oscillator.disconnect() })
      partialGains.forEach(gain => gain.disconnect())
      envelope.disconnect()
      if (this.voices.get(midi) === voice) this.voices.delete(midi)
    }
    const voice: Voice = {
      stop: () => {
        if (cleaned) return
        this.voices.delete(midi)
        const release = context.currentTime
        envelope.gain.cancelScheduledValues(release)
        envelope.gain.setTargetAtTime(0, release, 0.004)
        oscillators.forEach(oscillator => { try { oscillator.stop(release + 0.025) } catch { /* Already ended. */ } })
      },
    }
    weights.forEach((weight, index) => {
      const harmonic = index + 1
      if (frequency * harmonic >= context.sampleRate / 2) return
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency * harmonic
      const amplitude = (0.34 * weight) / totalWeight
      const decay = duration / (1 + index * 0.35)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(amplitude, now + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.00001, now + decay)
      oscillator.connect(gain)
      gain.connect(envelope)
      oscillator.start(now)
      oscillator.stop(now + duration + 0.03)
      oscillators.push(oscillator)
      partialGains.push(gain)
    })
    oscillators[0].onended = cleanup
    this.voices.set(midi, voice)
  }

  setTempo(bpm: number, beatsPerBar: number) {
    const nextBpm = clampBpm(bpm)
    const nextBar = clampBeatsPerBar(beatsPerBar)
    const restartBar = this.timer !== null && nextBar !== this.beatsPerBar
    if (this.timer !== null && nextBpm !== this.bpm && this.lastScheduledTime !== null) {
      this.cursor.time = this.lastScheduledTime + 60 / nextBpm
    }
    this.bpm = nextBpm
    this.beatsPerBar = nextBar
    this.cursor.beat %= this.beatsPerBar
    if (restartBar) this.startMetronome()
  }

  startMetronome() {
    const context = this.context
    if (!context || context.state !== 'running' || this.destroyed) return
    this.stopMetronome()
    this.cursor = { time: context.currentTime + 0.04, beat: 0 }
    this.lastScheduledTime = null
    this.callbacks.onRunning(true)
    this.timer = setInterval(() => this.schedule(), 25)
    this.schedule()
    if (this.timer === null) return
    const draw = () => {
      if (this.timer === null || !this.context) return
      let latest: BeatCursor | undefined
      while (this.visualBeats[0]?.time <= this.context.currentTime) latest = this.visualBeats.shift()
      if (latest) this.callbacks.onBeat(latest.beat)
      this.animation = requestAnimationFrame(draw)
    }
    this.animation = requestAnimationFrame(draw)
  }

  private schedule() {
    const context = this.context
    if (!context || context.state !== 'running') {
      this.stopMetronome()
      return
    }
    try {
      const batch = scheduledBeats(this.cursor, context.currentTime, this.bpm, this.beatsPerBar)
      batch.beats.forEach(beat => {
        this.playClick(beat.time, beat.beat === 0)
        this.visualBeats.push(beat)
        this.lastScheduledTime = beat.time
      })
      this.cursor = batch.next
    } catch {
      this.stopMetronome()
      this.callbacks.onError('The metronome paused. Tap Start to try again.')
    }
  }

  private playClick(time: number, accented: boolean) {
    const context = this.context!
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = accented ? 1400 : 950
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(accented ? 0.33 : 0.22, time + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.045)
    oscillator.connect(gain)
    gain.connect(this.master!)
    const voice: Voice = { stop: () => { gain.disconnect(); try { oscillator.stop() } catch { /* Already ended. */ } } }
    this.clicks.add(voice)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.clicks.delete(voice) }
    oscillator.start(time)
    oscillator.stop(time + 0.055)
  }

  stopMetronome() {
    if (this.timer !== null) clearInterval(this.timer)
    if (this.animation !== null) cancelAnimationFrame(this.animation)
    this.timer = null
    this.animation = null
    this.visualBeats = []
    this.lastScheduledTime = null
    this.clicks.forEach(click => click.stop())
    this.clicks.clear()
    this.callbacks.onRunning(false)
    this.callbacks.onBeat(-1)
  }

  stopNotes() {
    this.voices.forEach(voice => voice.stop())
    this.voices.clear()
  }

  suspend() {
    this.stopMetronome()
    this.stopNotes()
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {})
  }

  destroy() {
    this.destroyed = true
    this.stopMetronome()
    this.stopNotes()
    if (this.context) {
      this.context.onstatechange = null
      if (this.context.state !== 'closed') void this.context.close().catch(() => {})
    }
    this.master?.disconnect()
    this.compressor?.disconnect()
    this.context = null
  }
}
