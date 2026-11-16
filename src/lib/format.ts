export function formatInt(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = Math.abs(Math.trunc(value)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function statusKind(status: string): "shipped" | "planned" | "in-progress" {
  const normalized = status.toLowerCase();
  if (normalized.startsWith("shipped")) return "shipped";
  if (normalized.startsWith("planned")) return "planned";
  if (normalized.includes("progress") || normalized.includes("open")) return "in-progress";
  throw new Error(`Unrecognized status: ${status}`);
}
