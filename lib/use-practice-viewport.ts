'use client'

import { useEffect } from 'react'

// Follow the browser's visible area without rotating the app or native controls.
export function usePracticeViewport() {
  useEffect(() => {
    try { localStorage.removeItem('pocket-guitar.orientation') } catch { /* Storage is optional. */ }
    const viewport = window.visualViewport
    const update = () => {
      // Keep pinch zoom available without reflowing during a zoom.
      if (viewport && viewport.scale !== 1) return
      const width = viewport?.width ?? window.innerWidth
      const height = viewport?.height ?? window.innerHeight
      const style = document.documentElement.style
      style.setProperty('--surface-width', width + 'px')
      style.setProperty('--surface-height', height + 'px')
      style.setProperty('--view-top', (viewport?.offsetTop ?? 0) + 'px')
      document.documentElement.dataset.layout = width > height ? 'wide' : 'tall'
    }
    update()
    window.addEventListener('resize', update)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      for (const property of ['--surface-width', '--surface-height', '--view-top']) document.documentElement.style.removeProperty(property)
      delete document.documentElement.dataset.layout
    }
  }, [])
}
