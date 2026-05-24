export default function Card({ header, title, padding = "p-4", children, className = "" }) {
  return (
    <div className={`bg-surface border border-border rounded-lg shadow-card card-hover ${padding} ${className}`}>
      {(header || title) && (
        <div className="border-b border-border pb-3 mb-3">
          {title && <span className="text-text-secondary text-xs font-mono uppercase tracking-wider">{title}</span>}
          {header}
        </div>
      )}
      {children}
    </div>
  );
}
