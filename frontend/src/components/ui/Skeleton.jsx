export default function Skeleton({ width, height, className = "", variant = "line" }) {
  const variants = {
    line: "h-3 rounded-full",
    block: "rounded-md", 
    circle: "rounded-full"
  }

  const style = {}
  if (width) style.width = width
  if (height) style.height = height

  return (
    <div 
      className={`bg-bg-raised animate-pulse ${variants[variant]} ${className}`}
      style={style}
    />
  )
}