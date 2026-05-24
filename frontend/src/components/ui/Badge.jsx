const variants = {
  success: "text-accent bg-accent-muted border-accent/20",
  warning: "text-warning bg-warning-muted border-warning/20",
  danger: "text-danger bg-danger-muted border-danger/20",
  neutral: "text-text-secondary bg-elevated border-border",
  info: "text-info bg-info-muted border-info/20",
};

export default function Badge({ variant = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
