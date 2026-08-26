export function formatINR(value: number, decimals = 2): string {
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(decimals)}Cr`;
  if (abs >= 1_00_000) return `₹${(value / 1_00_000).toFixed(decimals)}L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}
