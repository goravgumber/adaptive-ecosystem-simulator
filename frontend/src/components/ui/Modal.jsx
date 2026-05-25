import { useEffect } from "react"

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === "Escape") onClose?.() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-panel border border-line-normal rounded-lg w-full max-w-lg mx-4 shadow-2xl animate-fade-in">
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-line-subtle">
            <h2 className="text-sm font-medium text-ink-primary">{title}</h2>
            <button
              onClick={onClose}
              className="text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
