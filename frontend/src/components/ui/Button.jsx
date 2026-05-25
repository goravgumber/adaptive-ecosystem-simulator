export default function Button({
  variant = "primary", size = "md", loading = false, disabled = false,
  icon = null, children, onClick, className = "", ...props
}) {
  const base = "font-medium rounded-md transition-colors duration-100 cursor-pointer inline-flex items-center gap-2 whitespace-nowrap select-none"

  const variants = {
    primary: "bg-cyan text-void hover:bg-cyan-soft font-medium",
    ghost: "border border-edge text-mid hover:border-edge-mid hover:text-hi hover:bg-raised",
    danger: "bg-danger-bg border border-danger-edge text-danger hover:border-danger/40",
    subtle: "bg-raised text-mid hover:bg-overlay hover:text-hi",
  }

  const sizes = {
    xs: "px-2.5 py-1 text-xs",
    sm: "px-3 py-1.5 text-sm", 
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  }

  const isDisabled = disabled || loading
  const state = isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${state} ${className}`}
      {...props}
    >
      {loading && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {!loading && icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
