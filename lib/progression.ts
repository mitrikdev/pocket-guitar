import { getChordVoicings } from './chords.ts'

export const PROGRESSION_STORAGE_KEY = 'pocket-guitar.progression.v1'
export const MAX_PROGRESSION_CHORDS = 24
export const MAX_PROGRESSION_TITLE = 80

export type ProgressionEntry = {
  id: string
  root: number
  structureId: string
  voicingId: string
}

export type Progression = {
  version: 1
  title: string
  entries: ProgressionEntry[]
}

export type ProgressionPatch = Partial<Pick<ProgressionEntry, 'root' | 'structureId' | 'voicingId'>>

export function emptyProgression(): Progression {
  return { version: 1, title: 'My progression', entries: [] }
}

export function progressionTitle(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, MAX_PROGRESSION_TITLE)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function chordEntry(id: string, root: unknown, structureId: unknown, voicingId?: unknown): ProgressionEntry | null {
  if (typeof root !== 'number' || !Number.isInteger(root) || root < 0 || root > 11 || typeof structureId !== 'string') return null
  const voicings = getChordVoicings(root, structureId)
  if (!voicings.length) return null
  return {
    id,
    root,
    structureId,
    voicingId: voicings.find(voicing => voicing.id === voicingId)?.id ?? voicings[0].id,
  }
}

// Saved browser data is untrusted: keep supported musical choices, repair stale
// fingerings, and give every card a stable, unique ID before React renders it.
export function sanitizeProgression(value: unknown): Progression | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.entries)) return null
  const entries: ProgressionEntry[] = []
  const ids = new Set<string>()
  for (const [index, candidate] of value.entries.entries()) {
    if (entries.length >= MAX_PROGRESSION_CHORDS) break
    if (!isRecord(candidate)) continue
    const baseId = typeof candidate.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(candidate.id) ? candidate.id : `restored-${index + 1}`
    let id = baseId
    let suffix = 2
    while (ids.has(id)) id = `${baseId.slice(0, 76)}-${suffix++}`
    const entry = chordEntry(id, candidate.root, candidate.structureId, candidate.voicingId)
    if (entry) {
      ids.add(id)
      entries.push(entry)
    }
  }
  return {
    version: 1,
    title: typeof value.title === 'string' ? progressionTitle(value.title) : 'My progression',
    entries,
  }
}

export function restoreProgression(raw: string | null): { data: Progression; canPersist: boolean; error: string | null } {
  if (raw === null) return { data: emptyProgression(), canPersist: true, error: null }
  try {
    const data = sanitizeProgression(JSON.parse(raw))
    if (data) return { data, canPersist: true, error: null }
  } catch { /* Preserve unreadable storage instead of overwriting it with an empty list. */ }
  return {
    data: emptyProgression(),
    canPersist: false,
    error: 'Your saved progression could not be opened. New changes will stay in this session so the saved copy is preserved.',
  }
}

export function addProgressionChord(entries: ProgressionEntry[], id: string, root: number, structureId: string, voicingId?: string): ProgressionEntry[] {
  if (entries.length >= MAX_PROGRESSION_CHORDS || !id || entries.some(entry => entry.id === id)) return entries
  const entry = chordEntry(id, root, structureId, voicingId)
  return entry ? [...entries, entry] : entries
}

export function updateProgressionChord(entries: ProgressionEntry[], id: string, patch: ProgressionPatch): ProgressionEntry[] {
  const index = entries.findIndex(entry => entry.id === id)
  if (index < 0) return entries
  const previous = entries[index]
  const entry = chordEntry(id, patch.root ?? previous.root, patch.structureId ?? previous.structureId, patch.voicingId ?? previous.voicingId)
  if (!entry) return entries
  return entries.map((current, position) => position === index ? entry : current)
}

export function moveProgressionChord(entries: ProgressionEntry[], id: string, direction: -1 | 1): ProgressionEntry[] {
  if (direction !== -1 && direction !== 1) return entries
  const index = entries.findIndex(entry => entry.id === id)
  const destination = index + direction
  if (index < 0 || destination < 0 || destination >= entries.length) return entries
  const next = [...entries]
  ;[next[index], next[destination]] = [next[destination], next[index]]
  return next
}
