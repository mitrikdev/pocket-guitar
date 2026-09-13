'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PROGRESSION_STORAGE_KEY, addProgressionChord, emptyProgression, moveProgressionChord,
  progressionTitle, restoreProgression, updateProgressionChord, type ProgressionPatch,
} from './progression'

export function useProgression() {
  const [data, setData] = useState(emptyProgression)
  const [hydrated, setHydrated] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const canPersist = useRef(false)
  const ready = useRef(false)

  useEffect(() => {
    try {
      const restored = restoreProgression(window.localStorage.getItem(PROGRESSION_STORAGE_KEY))
      setData(restored.data)
      canPersist.current = restored.canPersist
      setStorageError(restored.error)
    } catch {
      canPersist.current = false
      setStorageError('Saving is unavailable in this browser. Your progression will stay in this session.')
    }
    ready.current = true
    setHydrated(true)
  }, [])

  useEffect(() => {
    // The initial server-rendered empty list must never replace a saved progression.
    if (!hydrated || !canPersist.current) return
    try {
      window.localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(data))
      setStorageError(null)
    } catch {
      setStorageError('Your latest changes could not be saved. Keep this tab open to keep your progression.')
    }
  }, [data, hydrated])

  const setTitle = useCallback((title: string) => {
    if (ready.current) setData(previous => ({ ...previous, title: progressionTitle(title) }))
  }, [])

  const addChord = useCallback((root: number, structureId: string, voicingId?: string) => {
    if (!ready.current) return
    const id = globalThis.crypto?.randomUUID?.() ?? `chord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    setData(previous => ({ ...previous, entries: addProgressionChord(previous.entries, id, root, structureId, voicingId) }))
  }, [])

  const updateChord = useCallback((id: string, patch: ProgressionPatch) => {
    if (ready.current) setData(previous => ({ ...previous, entries: updateProgressionChord(previous.entries, id, patch) }))
  }, [])

  const removeChord = useCallback((id: string) => {
    if (ready.current) setData(previous => ({ ...previous, entries: previous.entries.filter(entry => entry.id !== id) }))
  }, [])

  const moveChord = useCallback((id: string, direction: -1 | 1) => {
    if (ready.current) setData(previous => ({ ...previous, entries: moveProgressionChord(previous.entries, id, direction) }))
  }, [])

  return { title: data.title, setTitle, entries: data.entries, addChord, updateChord, removeChord, moveChord, storageError, hydrated }
}
