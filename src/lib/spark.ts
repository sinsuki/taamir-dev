import { escapeXml } from "./format";

export function sparkline(counts: number[]): string {
  if (counts.length === 0) return "";
  const width = 128;
  const height = 36;
  const max = Math.max(1, ...counts);
  const step = counts.length === 1 ? 0 : width / (counts.length - 1);
  const coords = counts.map((count, index) => {
    const x = index * step;
    const y = height - 4 - (count / max) * (height - 10);
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = coords[coords.length - 1] ?? [0, 0];
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
    <title>${escapeXml("Posts per month")}</title>
    <polyline points="${line}" fill="none" stroke="currentColor" stroke-width="1.5" />
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.5" fill="var(--clay)" />
  </svg>`;
}
