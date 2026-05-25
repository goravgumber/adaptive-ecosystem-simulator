import { useEffect } from "react"

export default function Alert({ variant = "info", onClose, children, className = "" }) {
  useEffect(() => {
    if (onClose) {
      const timer = setTimeout(onClose, 6000)
      return () => clearTimeout(timer)
    }
  }, [onClose])

  const variants = {
    info: "border-status-info/20 bg-blue-950/20 text-ink-primary",
    warning: "border-status-warning/20 bg-warning-bg text-ink-primary",
    danger: "border-status-danger/20 bg-danger-bg text-ink-primary",
    success: "border-green-vivid/20 bg-green-ghost text-ink-primary",
  }

  return (
    <div className={`flex items-start gap-3 px-3.5 py-2.5 border rounded-md text-sm leading-relaxed animate-fade-in ${variants[variant] || variants.info} ${className}`}>
      <div className="flex-1 min-w-0">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
          aria-label="Close alert"
        >
          &times;
        </button>
      )}
    </div>
  )
}
