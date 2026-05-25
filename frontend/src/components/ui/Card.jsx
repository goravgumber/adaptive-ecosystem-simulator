export default function Card({ children, className = "", padding = "md", header }) {
  const paddings = {
    none: "p-0",
    sm: "p-3", 
    md: "p-4",
    lg: "p-5"
  }

  return (
    <div className={`bg-panel border border-edge rounded-lg ${className}`}>
      {header && (
        <div className="px-4 pt-4 pb-3 border-b border-edge">
          <span className="text-2xs font-mono text-lo uppercase tracking-[0.08em]">
            {header}
          </span>
        </div>
      )}
      <div className={paddings[padding]}>
        {children}
      </div>
    </div>
  )
}
