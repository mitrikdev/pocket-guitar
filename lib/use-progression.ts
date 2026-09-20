'use client'
import type { CustomChord } from './custom-chords'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PROGRESSION_STORAGE_KEY, addProgressionChord, moveProgressionChord,
  progressionTitle, updateProgressionChord, type ProgressionPatch,
} from './progression'
import {
  LIBRARY_STORAGE_KEY, emptyLibrary, restoreLibrary, createProgression,
  selectProgression, deleteProgression, updateActiveProgression,
  type SavedProgression,
} from './progression-library'

function newId(prefix: string) {
  return globalThis.crypto?.randomUUID?.() ?? prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
}

export function useProgression() {
  const [library, setLibrary] = useState(emptyLibrary)
  const [hydrated, setHydrated] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const canPersist = useRef(false)
  const ready = useRef(false)
  const active = library.progressions.find(item => item.id === library.activeId) ?? library.progressions[0]

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LIBRARY_STORAGE_KEY)
      const restored = restoreLibrary(saved, saved === null ? window.localStorage.getItem(PROGRESSION_STORAGE_KEY) : null)
      setLibrary(restored.data)
      canPersist.current = restored.canPersist
      setStorageError(restored.error)
    } catch {
      canPersist.current = false
      setStorageError('Saving is unavailable in this browser. Your progressions will stay in this session.')
    }
    ready.current = true
    setHydrated(true)
  }, [])

  useEffect(() => {
    // Hydrate before writing; leave the original v1 save intact as a migration backup.
    if (!hydrated || !canPersist.current) return
    try {
      window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library))
      setStorageError(null)
    } catch {
      setStorageError('Your latest changes could not be saved. Keep this tab open to keep your progressions.')
    }
  }, [library, hydrated])

  const updateCurrent = useCallback((update: (current: SavedProgression) => SavedProgression) => {
    if (ready.current) setLibrary(previous => updateActiveProgression(previous, update))
  }, [])

  const setTitle = useCallback((title: string) => {
    updateCurrent(previous => ({ ...previous, title: progressionTitle(title) }))
  }, [updateCurrent])

  const addChord = useCallback((root: number, structureId: string, voicingId?: string) => {
    const id = newId('chord')
    updateCurrent(previous => ({ ...previous, entries: addProgressionChord(previous.entries, id, root, structureId, voicingId) }))
  }, [updateCurrent])

  const addCustom = useCallback((chord: CustomChord) => {
    const id = newId('chord')
    updateCurrent(previous => previous.entries.length >= 24 ? previous : ({ ...previous, entries: [...previous.entries, { id, root: chord.root, structureId: chord.id, voicingId: chord.id, custom: chord }] }))
  }, [updateCurrent])

  const replaceCustom = useCallback((id: string, chord: CustomChord) => {
    updateCurrent(previous => ({ ...previous, entries: previous.entries.map(e => e.id === id ? { id, root: chord.root, structureId: chord.id, voicingId: chord.id, custom: chord } : e) }))
  }, [updateCurrent])

  const updateChord = useCallback((id: string, patch: ProgressionPatch) => {
    updateCurrent(previous => ({ ...previous, entries: updateProgressionChord(previous.entries, id, patch) }))
  }, [updateCurrent])

  const removeChord = useCallback((id: string) => {
    updateCurrent(previous => ({ ...previous, entries: previous.entries.filter(entry => entry.id !== id) }))
  }, [updateCurrent])

  const moveChord = useCallback((id: string, direction: -1 | 1) => {
    updateCurrent(previous => ({ ...previous, entries: moveProgressionChord(previous.entries, id, direction) }))
  }, [updateCurrent])

  const create = useCallback(() => {
    if (!ready.current) return
    const id = newId('progression')
    setLibrary(previous => createProgression(previous, id))
  }, [])

  const select = useCallback((id: string) => {
    if (ready.current) setLibrary(previous => selectProgression(previous, id))
  }, [])

  const remove = useCallback((id: string) => {
    if (ready.current) setLibrary(previous => deleteProgression(previous, id))
  }, [])

  return {
    title: active.title, setTitle, entries: active.entries,
    addChord, addCustom, replaceCustom, updateChord, removeChord, moveChord, storageError, hydrated,
    progressions: library.progressions, activeId: active.id, create, select, remove,
  }
}
