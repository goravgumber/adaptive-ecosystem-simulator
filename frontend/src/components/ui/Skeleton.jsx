const variants = {
  text: "h-4 w-full",
  title: "h-6 w-3/4",
  block: "h-full",
};

export default function Skeleton({ variant, width, height, className = "" }) {
  const variantClass = variants[variant] || "";
  return (
    <div
      className={`bg-elevated animate-pulse rounded ${variantClass} ${className}`}
      style={{ width, height }}
    />
  );
}
