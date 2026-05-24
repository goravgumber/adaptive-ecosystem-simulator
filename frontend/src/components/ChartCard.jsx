function ChartCard({ title, children }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 w-full shadow-card">
      {title && <h2 className="text-text-secondary text-xs font-mono uppercase tracking-wider mb-4">{title}</h2>}
      <div>{children}</div>
    </div>
  );
}

export default ChartCard;
