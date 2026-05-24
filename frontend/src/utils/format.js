export function formatPop(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return Math.round(n).toLocaleString();
}

export function formatPct(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return (n * 100).toFixed(1) + "%";
}

export function formatMs(n) {
  if (!n) return "—";
  return Math.round(n) + "ms";
}

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatDuration(ms) {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + "s";
  if (s < 3600) return Math.floor(s / 60) + "m " + (s % 60) + "s";
  return Math.floor(s / 3600) + "h " + Math.floor((s % 3600) / 60) + "m";
}
