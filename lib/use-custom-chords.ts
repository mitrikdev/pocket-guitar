'use client'
import { useEffect, useRef, useState } from 'react'
import { CUSTOM_CHORDS_KEY, restoreCustomChords, sanitizeCustomChord, type CustomChord } from './custom-chords'

export function useCustomChords() {
  const [chords, setChords] = useState<CustomChord[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const persist = useRef(false)
  useEffect(() => {
    try {
      const saved = restoreCustomChords(localStorage.getItem(CUSTOM_CHORDS_KEY))
      setChords(saved.chords); persist.current = saved.canPersist; setError(saved.error)
    } catch { setError('Browser storage is unavailable. Chords will stay in this session.') }
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated || !persist.current) return
    try { localStorage.setItem(CUSTOM_CHORDS_KEY, JSON.stringify({ version: 1, chords })); setError(null) }
    catch { setError('Your chords could not be saved. Keep this tab open to keep your changes.') }
  }, [chords, hydrated])
  function save(value: CustomChord) {
    const chord = sanitizeCustomChord(value)
    if (!hydrated || !chord) return false
    setChords(previous => previous.some(c => c.id === chord.id) ? previous.map(c => c.id === chord.id ? chord : c) : [...previous, chord])
    return true
  }
  function remove(id: string) { if (hydrated) setChords(previous => previous.filter(c => c.id !== id)) }
  return { chords, hydrated, error, save, remove }
}
