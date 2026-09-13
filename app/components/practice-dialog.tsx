'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export function PracticeDialog({ open, title, onClose, children, wide = false }: { open: boolean; wide?: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog?.open) dialog?.showModal()
    else if (!open && dialog?.open) dialog.close()
  }, [open])

  return <dialog className={'practice-dialog' + (wide ? ' progression-dialog' : '')} ref={ref} aria-labelledby="panel-title" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="dialog-inner">
      <header className="dialog-heading"><h2 id="panel-title">{title}</h2><button type="button" className="close-button" aria-label="Close panel" onClick={onClose}>✕</button></header>
      {children}
    </div>
  </dialog>
}
