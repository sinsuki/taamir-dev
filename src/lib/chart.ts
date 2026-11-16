import { escapeXml } from "./format";

export interface ChartRow {
  label: string;
  lines: string[];
  value: number;
  display: string;
  accent?: boolean;
}

const HEIGHT = 248;

/** Build-time stem chart. Values must already be on one scale. */
export function stemChart(rows: ChartRow[], title: string, description: string): string {
  if (rows.length === 0) throw new Error("Chart has no rows");
  if (rows.some((row) => row.value > 1_000_000)) {
    throw new Error("A value on this scale would squash the other bars");
  }
  if (rows.length > 2) return horizontalChart(rows, title, description);
  const width = 360;
  const max = Math.max(...rows.map((row) => row.value));
  const plotLeft = 32;
  const plotRight = width - 16;
  const baseline = 188;
  const plotTop = 36;
  const plotHeight = baseline - plotTop;
  const slot = (plotRight - plotLeft) / rows.length;
  const stems = rows
    .map((row, index) => {
      const x = plotLeft + slot * (index + 0.5);
      const y = baseline - (row.value / max) * plotHeight;
      const klass = row.accent ? "stem accent" : "stem";
      const textKlass = row.accent ? "accent" : "muted";
      const label = row.lines
        .map(
          (line, lineIndex) =>
            `<tspan x="${x.toFixed(1)}" dy="${lineIndex === 0 ? 0 : 15}">${escapeXml(line)}</tspan>`,
        )
        .join("");
      return `<g>
        <path class="${klass}" pathLength="1" d="M ${x.toFixed(1)} ${baseline} L ${x.toFixed(1)} ${y.toFixed(1)} M ${(x - 6).toFixed(1)} ${y.toFixed(1)} L ${(x + 6).toFixed(1)} ${y.toFixed(1)}" />
        <text class="${textKlass}" font-size="14" x="${x.toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="middle">${escapeXml(row.display)}</text>
        <text class="tick" font-size="14" x="${x.toFixed(1)}" y="${baseline + 20}" text-anchor="middle">${label}</text>
      </g>`;
    })
    .join("");
  return `<svg class="chart" viewBox="0 0 ${width} ${HEIGHT}" role="img">
    <title>${escapeXml(title)}</title>
    <desc>${escapeXml(description)}</desc>
    <line class="baseline" x1="${plotLeft}" y1="${baseline}" x2="${plotRight}" y2="${baseline}" />
    <text class="tick zero" font-size="13" x="4" y="${baseline + 4}">0</text>
    ${stems}
  </svg>`;
}

function horizontalChart(rows: ChartRow[], title: string, description: string): string {
  const width = 360;
  const rowH = 40;
  const height = 16 + rows.length * rowH;
  const max = Math.max(...rows.map((row) => row.value));
  const barX = 148;
  const barMax = width - barX - 12;
  const body = rows
    .map((row, index) => {
      const y = 28 + index * rowH;
      const end = barX + (row.value / max) * barMax;
      const klass = row.accent ? "stem accent" : "stem";
      const textKlass = row.accent ? "accent" : "muted";
      const name = row.lines.join(" ");
      return `<g>
        <text class="tick" font-size="13" x="4" y="${y + 4}">${escapeXml(name)}</text>
        <path class="${klass}" pathLength="1" d="M ${barX} ${y} L ${end.toFixed(1)} ${y} M ${end.toFixed(1)} ${(y - 5).toFixed(1)} L ${end.toFixed(1)} ${(y + 5).toFixed(1)}" />
        <text class="${textKlass}" font-size="13" x="${Math.max(barX + 36, end - 4).toFixed(1)}" y="${y - 8}" text-anchor="end">${escapeXml(row.display)}</text>
      </g>`;
    })
    .join("");
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img">
    <title>${escapeXml(title)}</title>
    <desc>${escapeXml(description)}</desc>
    <line class="baseline" x1="${barX}" y1="12" x2="${barX}" y2="${height - 8}" />
    ${body}
  </svg>`;
}
