'use client'
import { useEffect, useId, useRef, type ReactNode } from 'react'

export function PracticeDialog({ open, title, onClose, children, wide = false }: {
  open: boolean; wide?: boolean; title: string; onClose: () => void; children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog?.open) dialog?.showModal()
    else if (!open && dialog?.open) dialog.close()
  }, [open])
  return <dialog className="practice-dialog" ref={ref} aria-labelledby={headingId} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }}>
    <div className="dialog-plane">
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true"/>
      <section className={'dialog-inner ' + (wide ? 'full-panel' : 'drawer-panel')}>
        <header className="dialog-heading"><h2 id={headingId}>{title}</h2><button type="button" className="icon-button" aria-label="Close panel" onClick={onClose}>✕</button></header>
        <div className="dialog-body">{children}</div>
      </section>
    </div>
  </dialog>
}
