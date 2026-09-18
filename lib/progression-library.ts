import { emptyProgression, sanitizeProgression, type Progression } from './progression.ts'

export const LIBRARY_STORAGE_KEY = 'pocket-guitar.progressions.v2'

export type SavedProgression = Progression & { id: string }
export type ProgressionLibrary = {
  version: 2
  activeId: string
  progressions: SavedProgression[]
}

type RestoredLibrary = { data: ProgressionLibrary; canPersist: boolean; error: string | null }

const storageError = 'Some saved progressions could not be opened. New changes will stay in this session so the saved copy is preserved.'

export function emptyLibrary(): ProgressionLibrary {
  return { version: 2, activeId: 'default', progressions: [{ ...emptyProgression(), id: 'default' }] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueId(requested: unknown, used: Set<string>, fallback: string) {
  const base = typeof requested === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(requested) ? requested : fallback
  let id = base
  let suffix = 2
  while (used.has(id)) {
    const ending = '-' + suffix++
    id = base.slice(0, 80 - ending.length) + ending
  }
  return id
}

function sanitizeLibrary(value: unknown): { data: ProgressionLibrary; hasUnreadableProgressions: boolean } | null {
  if (!isRecord(value) || value.version !== 2 || !Array.isArray(value.progressions)) return null
  const progressions: SavedProgression[] = []
  const used = new Set<string>()
  let activeId: string | null = null
  let hasUnreadableProgressions = false

  for (const [index, candidate] of value.progressions.entries()) {
    const progression = sanitizeProgression(candidate)
    if (!isRecord(candidate) || !progression) {
      hasUnreadableProgressions = true
      continue
    }
    const id = uniqueId(candidate.id, used, `progression-${index + 1}`)
    used.add(id)
    progressions.push({ ...progression, id })
    // If a selected ID needs repair, retain the selected progression whenever
    // its original ID identifies it. A duplicate ID selects its first occurrence.
    if (activeId === null && typeof value.activeId === 'string' && candidate.id === value.activeId) activeId = id
  }

  if (!progressions.length) return { data: emptyLibrary(), hasUnreadableProgressions }
  return {
    data: { version: 2, activeId: activeId ?? progressions[0].id, progressions },
    hasUnreadableProgressions,
  }
}

// V2 takes precedence even when it cannot be read: falling back and writing
// legacy data over a newer library could erase the user's other progressions.
export function restoreLibrary(rawV2: string | null, legacyRaw: string | null): RestoredLibrary {
  if (rawV2 !== null) {
    try {
      const restored = sanitizeLibrary(JSON.parse(rawV2))
      if (restored) return {
        data: restored.data,
        canPersist: !restored.hasUnreadableProgressions,
        error: restored.hasUnreadableProgressions ? storageError : null,
      }
    } catch { /* Leave unreadable storage unchanged. */ }
    return { data: emptyLibrary(), canPersist: false, error: storageError }
  }

  if (legacyRaw !== null) {
    try {
      const progression = sanitizeProgression(JSON.parse(legacyRaw))
      if (progression) return {
        data: { version: 2, activeId: 'default', progressions: [{ ...progression, id: 'default' }] },
        canPersist: true,
        error: null,
      }
    } catch { /* A failed migration must not overwrite the saved progression. */ }
    return { data: emptyLibrary(), canPersist: false, error: storageError }
  }

  return { data: emptyLibrary(), canPersist: true, error: null }
}

export function createProgression(library: ProgressionLibrary, requestedId: string): ProgressionLibrary {
  const id = uniqueId(requestedId, new Set(library.progressions.map(progression => progression.id)), 'progression')
  const titles = new Set(library.progressions.map(progression => progression.title.trim().toLowerCase()))
  let number = 2
  while (titles.has(`my progression ${number}`)) number++
  const progression: SavedProgression = { ...emptyProgression(), id, title: `My progression ${number}` }
  return { version: 2, activeId: id, progressions: [...library.progressions, progression] }
}

export function selectProgression(library: ProgressionLibrary, id: string): ProgressionLibrary {
  if (library.activeId === id || !library.progressions.some(progression => progression.id === id)) return library
  return { ...library, activeId: id }
}

export function deleteProgression(library: ProgressionLibrary, id: string): ProgressionLibrary {
  const index = library.progressions.findIndex(progression => progression.id === id)
  if (index < 0) return library
  const progressions = library.progressions.filter(progression => progression.id !== id)
  if (!progressions.length) return emptyLibrary()
  const activeId = progressions.some(progression => progression.id === library.activeId)
    ? library.activeId
    : progressions[Math.min(index, progressions.length - 1)].id
  return { ...library, activeId, progressions }
}

export function updateActiveProgression(library: ProgressionLibrary, updater: (current: SavedProgression) => SavedProgression): ProgressionLibrary {
  const index = library.progressions.findIndex(progression => progression.id === library.activeId)
  if (index < 0) return library
  const current = library.progressions[index]
  const candidate = updater({ ...current, entries: current.entries.map(entry => ({ ...entry })) })
  const progression = sanitizeProgression(candidate)
  if (!progression) return library
  return {
    ...library,
    progressions: library.progressions.map((saved, position) => position === index ? { ...progression, id: current.id } : saved),
  }
}
