import test from 'node:test'
import assert from 'node:assert/strict'
import { clampBeatsPerBar, clampBpm, midiToFrequency, scheduledBeats, updateTapTempo } from '../lib/practice-audio.ts'

test('note playback uses concert pitch across the guitar and five-string bass range', () => {
  assert.equal(midiToFrequency(69), 440)
  assert.equal(midiToFrequency(81), 880)
  assert.ok(Math.abs(midiToFrequency(40) - 82.406889) < 0.000001)
  assert.ok(Math.abs(midiToFrequency(23) - 30.867706) < 0.000001)
  assert.equal(midiToFrequency(64 + 24), midiToFrequency(64) * 4)
  assert.throws(() => midiToFrequency(NaN), RangeError)
  assert.throws(() => midiToFrequency(128), RangeError)
})

test('metronome settings stay within supported ranges', () => {
  assert.equal(clampBpm(20), 40)
  assert.equal(clampBpm(300), 240)
  assert.equal(clampBpm(99.7), 100)
  assert.equal(clampBpm(NaN), 96)
  assert.equal(clampBeatsPerBar(0), 1)
  assert.equal(clampBeatsPerBar(8), 7)
  assert.equal(clampBeatsPerBar(NaN), 4)
})

test('scheduled beats stay on the audio timeline despite irregular timer callbacks', () => {
  let cursor = { time: 0.04, beat: 0 }
  const played: { time: number; beat: number }[] = []
  for (const now of [0, 0.073, 0.146, 0.214, 0.284, 0.356, 0.431, 0.508, 0.581, 0.658, 0.732, 0.806, 0.881, 0.956, 1.031]) {
    const batch = scheduledBeats(cursor, now, 240, 3)
    played.push(...batch.beats)
    cursor = batch.next
  }
  assert.deepEqual(played.map(beat => beat.beat), [0, 1, 2, 0, 1])
  played.forEach((beat, index) => assert.ok(Math.abs(beat.time - (0.04 + index * 0.25)) < 1e-12))
})

test('stalled scheduling skips missed beats without playing a catch-up burst', () => {
  const batch = scheduledBeats({ time: 0.5, beat: 1 }, 3.01, 120, 4)
  assert.deepEqual(batch.beats, [])
  assert.deepEqual(batch.next, { time: 3.5, beat: 3 })
  const recovered = scheduledBeats(batch.next, 3.42, 120, 4)
  assert.deepEqual(recovered.beats, [{ time: 3.5, beat: 3 }])
  assert.deepEqual(recovered.next, { time: 4, beat: 0 })
})

test('tap tempo averages recent taps and resets after a pause', () => {
  let taps: number[] = []
  let bpm: number | null = null
  for (const time of [1000, 1500, 2005, 2500]) ({ taps, bpm } = updateTapTempo(taps, time))
  assert.equal(bpm, 120)
  const doubleTap = updateTapTempo(taps, 2550)
  assert.deepEqual(doubleTap.taps, taps)
  assert.equal(doubleTap.bpm, null)
  assert.deepEqual(updateTapTempo(taps, 5000), { taps: [5000], bpm: null })
  assert.equal(updateTapTempo([1000], 2500).bpm, 40)
  assert.equal(updateTapTempo([1000], 1250).bpm, 240)
  assert.deepEqual(updateTapTempo([1000], 900), { taps: [900], bpm: null })
})
