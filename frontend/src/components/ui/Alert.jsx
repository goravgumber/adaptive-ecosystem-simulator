const styles = {
  info: "border-l-info bg-info-muted/50 text-text-primary",
  warning: "border-l-warning bg-warning-muted/50 text-warning",
  error: "border-l-danger bg-danger-muted/50 text-danger",
  success: "border-l-accent bg-accent-muted/50 text-accent",
};

export default function Alert({ type = "info", message, onDismiss, className = "" }) {
  return (
    <div className={`border-l-[3px] rounded-lg p-3 flex items-start justify-between gap-2 ${styles[type]} ${className}`}>
      <span className="text-sm">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
