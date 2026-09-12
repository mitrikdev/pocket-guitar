import { PitchDetector } from 'pitchy'

export type PitchReading = {
  note: string
  octave: number
  frequency: number
  cents: number
  midi: number
}

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// About 170 ms at 48 kHz: enough complete cycles for a five-string bass's B0.
export const TUNER_BUFFER_SIZE = 8192
const MIN_FREQUENCY = 27.5
const MAX_FREQUENCY = 1500
const SILENCE_TIMEOUT_MS = 350

export function frequencyToPitch(frequency: number): PitchReading | null {
  if (!Number.isFinite(frequency) || frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) return null
  const exactMidi = 69 + 12 * Math.log2(frequency / 440)
  const midi = Math.round(exactMidi)
  return {
    note: CHROMATIC_NOTES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    frequency,
    cents: (exactMidi - midi) * 100,
    midi,
  }
}

/** Reuses FFT work buffers; callers also reuse their input time-domain buffer. */
export function createPitchDetector(bufferSize = TUNER_BUFFER_SIZE) {
  const detector = PitchDetector.forFloat32Array(bufferSize)
  detector.minVolumeAbsolute = 0.003 // About -50 dBFS RMS; ignore room hiss and decayed strings.

  return (input: Float32Array, sampleRate: number): number | null => {
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) return null
    const [frequency, clarity] = detector.findPitch(input, sampleRate)
    if (clarity < 0.9 || !frequencyToPitch(frequency)) return null
    return frequency
  }
}

/** Rejects isolated jumps, smooths the needle, and clears a decayed or noisy note. */
export class PitchSmoother {
  private candidates: number[] = []
  private lastReadingAt = -Infinity
  private lastReading: PitchReading | null = null

  update(frequency: number | null, now: number): PitchReading | null {
    if (now - this.lastReadingAt >= SILENCE_TIMEOUT_MS) this.lastReading = null
    if (frequency === null || !frequencyToPitch(frequency)) {
      this.candidates = []
      return this.lastReading
    }
    const previous = this.candidates.at(-1)
    if (previous && Math.abs(1200 * Math.log2(frequency / previous)) > 65) {
      this.candidates = []
    }
    this.candidates.push(frequency)
    if (this.candidates.length > 3) this.candidates.shift()
    // Two matching observations keep a single pluck transient from moving the needle.
    if (this.candidates.length < 2) return this.lastReading
    const sorted = [...this.candidates].sort((a, b) => a - b)
    const middle = sorted.length === 2 ? (sorted[0] + sorted[1]) / 2 : sorted[1]
    this.lastReading = frequencyToPitch(middle)
    this.lastReadingAt = now
    return this.lastReading
  }
}
