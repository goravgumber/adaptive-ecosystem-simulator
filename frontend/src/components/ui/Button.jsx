export default function Button({ variant = "primary", size = "md", loading = false, onClick, disabled, children, className = "" }) {
  const variants = {
    primary:
      "bg-accent hover:bg-accent-dim text-base font-medium shadow-glow-sm hover:shadow-glow-md transition-all duration-150",
    ghost:
      "border border-border hover:border-border-bright text-text-secondary hover:text-text-primary hover:bg-elevated transition-all duration-150",
    danger:
      "bg-danger-muted border border-danger/30 text-danger hover:border-danger/60 hover:bg-red-950 transition-all duration-150",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded",
    md: "px-4 py-2 text-sm rounded",
    lg: "px-5 py-2.5 text-sm rounded-lg",
  };
  const isDisabled = disabled || loading;

  return (
    <button
      className={`inline-flex items-center justify-center ${variants[variant]} ${sizes[size]} ${isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""} ${className}`}
      onClick={onClick}
      disabled={isDisabled}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
