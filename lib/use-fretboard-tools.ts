'use client'

import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { INSTRUMENTS, NOTE_NAMES, STRUCTURES, MAX_FRET, activeNotes, generateFretboard, getFretWindow, relationship, type Structure, type DisplayMode, type InstrumentId } from './music'

type State = { structureOverride?: Structure; instrumentId: InstrumentId; root: number; structureId: string; mode: DisplayMode; selected: { stringIndex: number; fret: number } | null; firstFret: number; windowSpan: number }
type Actions = {
  setInstrument: (id: InstrumentId) => void
  setRoot: (root: number) => void
  setStructure: (id: string) => void
  setMode: (mode: DisplayMode) => void
  setRange: (firstFret: number) => void
  setPosition: (position: { stringIndex: number; fret: number }) => void
}
type Tool = { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown }
type ModelContext = { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> }

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected an object of fretboard settings.')
  return input as Record<string, unknown>
}

// Optional progressive enhancement; ordinary browsers need no agent API.
export function useFretboardTools(state: State, actions: Actions) {
  const current = useRef({ state, actions })
  useEffect(() => { current.current = { state, actions } }, [state, actions])

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext
      ?? (navigator as Navigator & { modelContext?: ModelContext }).modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()
    const span = getFretWindow(0, state.windowSpan).end
    const readState = () => {
      const value = current.current.state
      const selectedStructure = value.structureOverride ?? STRUCTURES.find(item => item.id === value.structureId)!
      const window = getFretWindow(value.firstFret, value.windowSpan)
      return { instrument: value.instrumentId, root: NOTE_NAMES[value.root], structureId: value.structureId, displayMode: value.mode, notes: activeNotes(value.root, selectedStructure).map(item => NOTE_NAMES[item.pitchClass]), selectedPosition: value.selected, visibleFrets: { from: window.start, to: window.end } }
    }
    const tools: Tool[] = [{
      name: 'configure_fretboard',
      description: 'Set the visible instrument, root, scale or chord, and display mode. Clears the selected position.',
      inputSchema: { type: 'object', properties: { instrument: { type: 'string', enum: INSTRUMENTS.map(item => item.id) }, root: { type: 'string', enum: NOTE_NAMES }, structureId: { type: 'string', enum: STRUCTURES.map(item => item.id) }, displayMode: { type: 'string', enum: ['notes', 'degrees', 'intervals'] } }, required: ['instrument', 'root', 'structureId', 'displayMode'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const args = record(input)
        const instrument = INSTRUMENTS.find(item => item.id === args.instrument)
        const root = NOTE_NAMES.findIndex(item => item === args.root)
        const structure = STRUCTURES.find(item => item.id === args.structureId)
        if (!instrument || root < 0 || !structure || !['notes', 'degrees', 'intervals'].includes(String(args.displayMode)) || Object.keys(args).some(key => !['instrument', 'root', 'structureId', 'displayMode'].includes(key))) throw new Error('Choose a supported instrument, root, structure, and display mode.')
        flushSync(() => {
          const actions = current.current.actions
          actions.setInstrument(instrument.id)
          actions.setRoot(root)
          actions.setStructure(structure.id)
          actions.setMode(args.displayMode as DisplayMode)
        })
        return readState()
      },
    }, {
      name: 'select_fretboard_position',
      description: 'Select a string and fret from 0 through 24, moving the visible range if needed, and show its note and musical relationship. String 1 is the highest string.',
      inputSchema: { type: 'object', properties: { stringNumber: { type: 'integer', minimum: 1, maximum: 6 }, fret: { type: 'integer', minimum: 0, maximum: MAX_FRET } }, required: ['stringNumber', 'fret'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const args = record(input)
        const state = current.current.state
        const instrument = INSTRUMENTS.find(item => item.id === state.instrumentId)!
        if (!Number.isInteger(args.stringNumber) || !Number.isInteger(args.fret) || Number(args.stringNumber) < 1 || Number(args.stringNumber) > instrument.tuning.length || Number(args.fret) < 0 || Number(args.fret) > MAX_FRET || Object.keys(args).some(key => !['stringNumber', 'fret'].includes(key))) throw new Error('Choose an existing string and a fret from 0 through 24.')
        const selected = { stringIndex: Number(args.stringNumber) - 1, fret: Number(args.fret) }
        flushSync(() => current.current.actions.setPosition(selected))
        const cell = generateFretboard(instrument)[selected.stringIndex][selected.fret]
        const result = relationship(cell.pitchClass, state.root, state.structureOverride ?? STRUCTURES.find(item => item.id === state.structureId)!)
        return { ...readState(), note: cell.note, octave: cell.octave, interval: result.interval.name, isMember: result.isMember }
      },
    }, {
      name: 'set_fretboard_range',
      description: `Move the bottom fretboard slider. Show ${span + 1} positions starting at firstFret (0 through ${MAX_FRET - span}), up to fret 24. Keeps musical settings; clears a selected note only if it leaves the visible range.`,
      inputSchema: { type: 'object', properties: { firstFret: { type: 'integer', minimum: 0, maximum: MAX_FRET - span } }, required: ['firstFret'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const args = record(input)
        const maxStart = MAX_FRET - getFretWindow(0, current.current.state.windowSpan).end
        if (!Number.isInteger(args.firstFret) || Number(args.firstFret) < 0 || Number(args.firstFret) > maxStart || Object.keys(args).some(key => key !== 'firstFret')) throw new Error(`The first visible fret must be an integer from 0 through ${maxStart}.`)
        flushSync(() => current.current.actions.setRange(Number(args.firstFret)))
        return readState()
      },
    }]
    for (const tool of tools) {
      try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}) }
      catch { /* Unsupported experimental APIs must not interrupt practice. */ }
    }
    return () => lifecycle.abort()
  }, [state.windowSpan])
}
