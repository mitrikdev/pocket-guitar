'use client'

import { useEffect } from 'react'

// Chrome on iPhone can resize its visible area without changing the layout viewport.
export function useVisibleViewport() {
  useEffect(() => {
    const viewport = window.visualViewport
    const update = () => {
      // Keep pinch zoom available instead of reflowing the interface during a zoom.
      if (viewport && viewport.scale !== 1) return
      document.documentElement.style.setProperty('--app-height', `${viewport?.height ?? window.innerHeight}px`)
    }
    update()
    window.addEventListener('resize', update)
    viewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      viewport?.removeEventListener('resize', update)
      document.documentElement.style.removeProperty('--app-height')
    }
  }, [])
}
