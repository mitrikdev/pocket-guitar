import test from 'node:test'
import assert from 'node:assert/strict'
import { createPitchDetector, frequencyToPitch, PitchSmoother, TUNER_BUFFER_SIZE } from '../lib/pitch.ts'

function signal(frequency: number, sampleRate = 48000, harmonics = [1], volume = 0.15) {
  return Float32Array.from({ length: TUNER_BUFFER_SIZE }, (_, i) =>
    volume * harmonics.reduce((sum, amplitude, harmonic) =>
      sum + amplitude * Math.sin(2 * Math.PI * frequency * (harmonic + 1) * i / sampleRate), 0))
}

test('A440 pitch conversion reports octave, MIDI, and signed cents', () => {
  assert.deepEqual(frequencyToPitch(440), { note: 'A', octave: 4, midi: 69, frequency: 440, cents: 0 })
  for (const cents of [-35, 22]) {
    const pitch = frequencyToPitch(440 * 2 ** (cents / 1200))!
    assert.equal(pitch.note, 'A')
    assert.ok(Math.abs(pitch.cents - cents) < 0.0001)
  }
  for (const frequency of [0, -50, NaN, Infinity, 20, 2000]) assert.equal(frequencyToPitch(frequency), null)
})

test('detector covers bass B0 through guitar E6 at 44.1 and 48 kHz', () => {
  const detect = createPitchDetector()
  for (const sampleRate of [44100, 48000]) {
    for (const midi of [23, 28, 33, 38, 40, 43, 45, 50, 55, 59, 64, 88]) {
      const expected = 440 * 2 ** ((midi - 69) / 12)
      const actual = detect(signal(expected, sampleRate), sampleRate)
      assert.ok(actual, `Expected MIDI ${midi} at ${sampleRate} Hz to be detected`)
      assert.ok(Math.abs(1200 * Math.log2(actual / expected)) < 1, `MIDI ${midi}: ${actual} Hz`)
      assert.equal(frequencyToPitch(actual)?.midi, midi)
    }
  }
})

test('detector measures flat/sharp bass and guitar strings with stronger harmonics', () => {
  const detect = createPitchDetector()
  for (const midi of [23, 40, 57, 64]) {
    for (const cents of [-28, 19]) {
      const expected = 440 * 2 ** ((midi - 69) / 12 + cents / 1200)
      const frequency = detect(signal(expected, 48000, [0.5, 1, 0.35, 0.2]), 48000)
      assert.ok(frequency, `Expected harmonic-rich MIDI ${midi} to be detected`)
      const pitch = frequencyToPitch(frequency)!
      assert.equal(pitch.midi, midi)
      assert.ok(Math.abs(pitch.cents - cents) < 1)
    }
  }
})

test('silence, quiet signals, and deterministic broadband noise produce no pitch', () => {
  const detect = createPitchDetector()
  assert.equal(detect(new Float32Array(TUNER_BUFFER_SIZE), 48000), null)
  assert.equal(detect(signal(440, 48000, [1], 0.0001), 48000), null)
  let seed = 12345
  const noise = Float32Array.from({ length: TUNER_BUFFER_SIZE }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return (seed / 2 ** 32 - 0.5) * 0.25
  })
  assert.equal(detect(noise, 48000), null)
})

test('smoothing needs repeated notes, rejects transient octave jumps and clears stale readings', () => {
  const smoother = new PitchSmoother()
  assert.equal(smoother.update(440, 0), null)
  assert.equal(smoother.update(440, 80)?.midi, 69)
  assert.equal(smoother.update(880, 160)?.midi, 69)
  assert.equal(smoother.update(440, 240)?.midi, 69)
  assert.equal(smoother.update(440, 320)?.midi, 69)
  assert.equal(smoother.update(null, 400)?.midi, 69)
  assert.equal(smoother.update(null, 700), null)
  assert.equal(smoother.update(329.63, 780), null)
  assert.equal(smoother.update(329.63, 860)?.midi, 64)
})

test('unstable candidates do not keep an old pitch displayed indefinitely', () => {
  const smoother = new PitchSmoother()
  smoother.update(440, 0)
  assert.equal(smoother.update(440, 80)?.midi, 69)
  smoother.update(200, 160)
  smoother.update(900, 240)
  smoother.update(180, 320)
  smoother.update(600, 400)
  assert.equal(smoother.update(240, 480), null)
})