'use client'
import { useEffect, useState } from 'react'

type Orientation = 'auto' | 'portrait' | 'landscape'
export function usePracticeViewport() {
  const [mode, setMode] = useState<Orientation>('auto')
  const [size, setSize] = useState({ width: 440, height: 760, nativeWide: false, top: 0 })
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pocket-guitar.orientation')
      if (saved === 'portrait' || saved === 'landscape') setMode(saved)
    } catch { /* The view also works without storage. */ }
    const viewport = window.visualViewport
    const update = () => {
      if (viewport && viewport.scale !== 1) return
      const nativeWide = navigator.maxTouchPoints > 0 && screen.orientation?.type
        ? screen.orientation.type.startsWith('landscape')
        : window.innerWidth > window.innerHeight
      setSize({ width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight, nativeWide, top: viewport?.offsetTop ?? 0 })
    }
    update()
    window.addEventListener('resize', update)
    screen.orientation?.addEventListener('change', update)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      screen.orientation?.removeEventListener('change', update)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
    }
  }, [])
  const desiredWide = mode === 'auto' ? size.nativeWide : mode === 'landscape'
  const rotated = desiredWide !== size.nativeWide
  const width = rotated ? size.height : size.width
  const height = rotated ? size.width : size.height
  useEffect(() => {
    const style = document.documentElement.style
    style.setProperty('--surface-width', width + 'px')
    style.setProperty('--surface-height', height + 'px')
    style.setProperty('--view-height', size.height + 'px')
    style.setProperty('--view-top', size.top + 'px')
    style.setProperty('--surface-rotation', rotated ? '90deg' : '0deg')
    document.documentElement.dataset.rotated = String(rotated)
    document.documentElement.dataset.layout = width > height ? 'wide' : 'tall'
  }, [width, height, rotated, size.height, size.top])
  function toggle() {
    const next = desiredWide ? 'portrait' : 'landscape'
    setMode(next)
    try { localStorage.setItem('pocket-guitar.orientation', next) } catch { /* Session-only preference. */ }
  }
  return { toggle, rotated, wide: desiredWide }
}
