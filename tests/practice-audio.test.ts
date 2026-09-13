import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { PracticeAudio, chordNotes, clampBeatsPerBar, clampBpm, midiToFrequency, progressionTimeline, scheduledBeats, scheduledChords, updateTapTempo } from '../lib/practice-audio.ts'

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


test('chord playback orders the actual pitches low to high and rejects invalid voicings', () => {
  const frettedNotes = Object.freeze([64, 60, 55, 52, 48])
  assert.deepEqual(chordNotes(frettedNotes), [48, 52, 55, 60, 64])
  assert.deepEqual(frettedNotes, [64, 60, 55, 52, 48])
  assert.deepEqual(chordNotes([40, 40, 52]), [40, 52])
  for (const notes of [[], [NaN], [Infinity], [-1], [128], [60.5], [0, 1, 2, 3, 4, 5, 6, 7, 8]]) {
    assert.throws(() => chordNotes(notes), RangeError)
  }
})

test('progressions preserve chord order and voicings with one four-beat bar per chord', () => {
  const chords = [
    { id: 'C-open', midis: [64, 60, 55, 52, 48] },
    { id: 'Am-open', midis: [64, 60, 57, 52, 45] },
    { id: 'C-again', midis: [64, 60, 55, 52, 48] },
  ]
  const plan = progressionTimeline(chords, 120, 10.04)
  assert.deepEqual(plan.chords.map(chord => chord.id), ['C-open', 'Am-open', 'C-again'])
  assert.deepEqual(plan.chords.map(chord => chord.time), [10.04, 12.04, 14.04])
  assert.equal(plan.endTime, 16.04)
  assert.deepEqual(plan.chords[1].midis, [45, 52, 57, 60, 64])
  chords[1].midis[0] = 0
  assert.deepEqual(plan.chords[1].midis, [45, 52, 57, 60, 64])
  assert.equal(progressionTimeline(chords, 60, 0).endTime, 12)
  assert.throws(() => progressionTimeline([], 120, 0), /Add a chord/)
  assert.throws(() => progressionTimeline([{ id: 'empty', midis: [] }], 120, 0), RangeError)
})

test('progression scheduling follows the audio clock once without catch-up bursts or repeats', () => {
  const plan = progressionTimeline([
    { id: 'one', midis: [48, 52, 55] },
    { id: 'two', midis: [50, 53, 57] },
    { id: 'three', midis: [55, 59, 62] },
  ], 240, 0.04)
  const first = scheduledChords(plan.chords, 0, 0)
  assert.deepEqual(first.chords.map(chord => chord.id), ['one'])
  assert.equal(first.nextIndex, 1)
  assert.deepEqual(scheduledChords(plan.chords, first.nextIndex, 0.05).chords, [])
  const resumed = scheduledChords(plan.chords, first.nextIndex, 2)
  assert.deepEqual(resumed.chords.map(chord => chord.id), ['three'])
  assert.equal(resumed.chords[0].time, 2.04)
  assert.equal(resumed.nextIndex, 3)
  assert.deepEqual(scheduledChords(plan.chords, resumed.nextIndex, plan.endTime), { chords: [], nextIndex: 3 })
})


/** Only the Web Audio surface used by the engine; time advances under the test's control. */
function audioHarness(t: TestContext) {
  class Parameter {
    value = 0
    setValueAtTime() {}
    linearRampToValueAtTime() {}
    exponentialRampToValueAtTime() {}
    cancelScheduledValues() {}
    setTargetAtTime() {}
  }
  class Node {
    gain = new Parameter()
    frequency = new Parameter()
    threshold = new Parameter()
    knee = new Parameter()
    ratio = new Parameter()
    type = 'sine'
    startTime = Infinity
    stopTime = Infinity
    ended = false
    disconnected = false
    onended: (() => void) | null = null
    connect() {}
    disconnect() { this.disconnected = true }
    start(time: number) { this.startTime = time }
    stop(time = context.currentTime) { this.stopTime = time }
  }
  let context: Context
  class Context {
    currentTime = 0
    sampleRate = 48000
    state = 'suspended'
    destination = new Node()
    onstatechange: (() => void) | null = null
    oscillators: Node[] = []
    constructor() { context = this }
    createGain() { return new Node() }
    createDynamicsCompressor() { return new Node() }
    createOscillator() { const node = new Node(); this.oscillators.push(node); return node }
    resume() { this.state = 'running'; return Promise.resolve() }
    suspend() { this.state = 'suspended'; this.onstatechange?.(); return Promise.resolve() }
    close() { this.state = 'closed'; this.onstatechange?.(); return Promise.resolve() }
  }
  const intervals = new Map<number, () => void>()
  const frames = new Map<number, () => void>()
  let nextId = 0
  const replace = (key: string, value: unknown) => {
    const original = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original)
      else Reflect.deleteProperty(globalThis, key)
    })
  }
  replace('window', { AudioContext: Context })
  replace('setInterval', (callback: () => void) => { intervals.set(++nextId, callback); return nextId })
  replace('clearInterval', (id: number) => intervals.delete(id))
  replace('requestAnimationFrame', (callback: () => void) => { frames.set(++nextId, callback); return nextId })
  replace('cancelAnimationFrame', (id: number) => frames.delete(id))
  const activeIds: (string | null)[] = []
  const running: boolean[] = []
  const metroRunning: boolean[] = []
  const errors: string[] = []
  const engine = new PracticeAudio({
    onBeat: () => {},
    onRunning: value => metroRunning.push(value),
    onError: message => errors.push(message),
    onActiveChord: id => activeIds.push(id),
    onProgressionRunning: value => running.push(value),
  })
  const advance = (time: number) => {
    context.currentTime = time
    for (const oscillator of context.oscillators) {
      if (!oscillator.ended && oscillator.stopTime <= time) {
        oscillator.ended = true
        oscillator.onended?.()
      }
    }
    for (const callback of [...intervals.values()]) callback()
    const currentFrames = [...frames.entries()]
    for (const [id, callback] of currentFrames) {
      if (frames.delete(id)) callback()
    }
  }
  return { engine, advance, activeIds, running, metroRunning, errors, intervals, frames, get context() { return context } }
}

test('engine schedules strums on the audio timeline and changes active chords at their onset', async t => {
  const h = audioHarness(t)
  await h.engine.unlock()
  h.engine.setTempo(240, 3)
  h.engine.startProgression([
    { id: 'C', midis: [64, 60, 55, 52, 48] },
    { id: 'D', midis: [66, 62, 57, 50] },
  ])
  assert.equal(h.running.at(-1), true)
  assert.equal(h.activeIds.at(-1), null)
  const firstStarts = h.context.oscillators.filter((_, index) => index % 7 === 0).map(node => node.startTime)
  firstStarts.forEach((time, index) => assert.ok(Math.abs(time - (0.04 + index * 0.02)) < 1e-12))
  assert.equal(firstStarts.length, 5)
  h.advance(0.03)
  assert.equal(h.activeIds.at(-1), null)
  h.advance(0.04)
  assert.equal(h.activeIds.at(-1), 'C')
  h.advance(0.95)
  assert.equal(h.context.oscillators.length, 9 * 7)
  assert.equal(h.activeIds.at(-1), 'C')
  h.advance(1.04)
  assert.equal(h.activeIds.at(-1), 'D')
  h.advance(2.04)
  assert.equal(h.running.at(-1), false)
  assert.equal(h.activeIds.at(-1), null)
  assert.equal(h.intervals.size, 0)
  assert.equal(h.frames.size, 0)
  h.advance(5)
  assert.equal(h.context.oscillators.length, 9 * 7)
  assert.deepEqual(h.errors, [])
  h.engine.destroy()
})

test('voice cap preserves the old chord until the next strum and Stop cancels all future voices', async t => {
  const h = audioHarness(t)
  await h.engine.unlock()
  h.engine.setTempo(240, 4)
  h.engine.startProgression([
    { id: 'one', midis: [40, 41, 42, 43, 44, 45, 46, 47] },
    { id: 'two', midis: [48, 49, 50, 51, 52, 53, 54, 55] },
  ])
  h.advance(0.95)
  const oldVoices = h.context.oscillators.slice(0, 56)
  const newVoices = h.context.oscillators.slice(56)
  assert.equal(newVoices.length, 56)
  assert.ok(oldVoices.every(node => node.stopTime >= 1.04))
  assert.ok(newVoices.every(node => node.stopTime > node.startTime))
  h.engine.stopProgression()
  assert.ok(oldVoices.every(node => node.stopTime <= 0.975))
  assert.ok(newVoices.every(node => node.stopTime <= 0.95 && node.stopTime < node.startTime))
  h.advance(3)
  assert.equal(h.context.oscillators.length, 112)
  assert.ok(h.context.oscillators.every(node => node.ended && node.disconnected))
  assert.equal(h.intervals.size, 0)
  assert.equal(h.frames.size, 0)
  h.engine.destroy()
})

test('stopping just before a strum cancels every oscillator before it becomes audible', async t => {
  const h = audioHarness(t)
  await h.engine.unlock()
  h.engine.startProgression([{ id: 'C', midis: [48, 52, 55, 60, 64] }])
  h.advance(0.03)
  h.engine.stopProgression()
  assert.ok(h.context.oscillators.every(node => node.stopTime === 0.03 && node.stopTime < node.startTime))
  h.advance(10)
  assert.deepEqual(h.activeIds.filter(id => id !== null), [])
  assert.equal(h.running.at(-1), false)
  h.engine.destroy()
})

test('metronome, tempo edits, and context suspension cancel progression scheduling', async t => {
  const h = audioHarness(t)
  await h.engine.unlock()
  const chords = [{ id: 'C', midis: [48, 52, 55] }, { id: 'G', midis: [43, 50, 55] }]
  h.engine.startProgression(chords)
  h.engine.startMetronome()
  assert.equal(h.running.at(-1), false)
  assert.equal(h.metroRunning.at(-1), true)
  assert.equal(h.intervals.size, 1)
  h.engine.startProgression(chords)
  assert.equal(h.metroRunning.at(-1), false)
  assert.equal(h.running.at(-1), true)
  assert.equal(h.intervals.size, 1)
  h.engine.setTempo(100, 4)
  assert.equal(h.running.at(-1), false)
  assert.equal(h.intervals.size, 0)
  h.engine.startProgression(chords)
  h.engine.suspend()
  assert.equal(h.context.state, 'suspended')
  assert.equal(h.running.at(-1), false)
  assert.equal(h.activeIds.at(-1), null)
  assert.equal(h.intervals.size, 0)
  assert.equal(h.frames.size, 0)
  h.engine.destroy()
})


test('a delayed audio unlock cannot resurrect a destroyed engine', async t => {
  const h = audioHarness(t)
  await h.engine.unlock()
  let finishResume = () => {}
  h.context.resume = () => new Promise<void>(resolve => { finishResume = resolve })
  const unlock = h.engine.unlock()
  h.engine.destroy()
  finishResume()
  await assert.rejects(unlock, /Audio is paused/)
  h.engine.startProgression([{ id: 'C', midis: [48, 52, 55] }])
  assert.equal(h.context.oscillators.length, 0)
  assert.equal(h.running.at(-1), false)
  assert.equal(h.intervals.size, 0)
  assert.equal(h.frames.size, 0)
})
