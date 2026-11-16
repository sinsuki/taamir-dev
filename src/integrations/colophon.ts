import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";

const TRACKER =
  /google-analytics|googletagmanager|gtag\(|facebook\.net|doubleclick|segment\.com|hotjar|mixpanel|plausible|umami/i;

export function colophon(): AstroIntegration {
  return {
    name: "colophon-measure",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const outDir = fileURLToPath(dir);
        const indexPath = path.join(outDir, "index.html");
        let html = readFileSync(indexPath, "utf8");
        const assets = await collectAssets(outDir, html);
        const fonts = assets.filter((file) => file.path.endsWith(".woff2"));
        if (fonts.length < 3) {
          throw new Error(`Expected 3 font files, found ${fonts.map((file) => file.path).join(", ") || "none"}`);
        }
        const assetBytes = assets.reduce((sum, file) => sum + file.bytes, 0);
        const requests = assets.length + 1;
        const trackers = countTrackers(html, assets.map((file) => file.text).join("\n"));
        const llmTokens = 0;
        const updated = gitDate();

        for (let pass = 0; pass < 6; pass += 1) {
          const bytes = Buffer.byteLength(html) + assetBytes;
          const line = `${(bytes / 1000).toFixed(1)} KB page weight · ${requests} requests · ${trackers} trackers · ${llmTokens} LLM tokens spent rendering this page`;
          const next = html
            .replace(
              /<p id="colophon-measured"[^>]*>[\s\S]*?<\/p>/,
              `<p id="colophon-measured" class="measured">${escapeHtml(line)}</p>`,
            )
            .replace(
              /<p id="colophon-updated"[^>]*>[\s\S]*?<\/p>/,
              `<p id="colophon-updated" class="measured">${escapeHtml(updated)}</p>`,
            );
          if (next === html) break;
          html = next;
        }
        if (!html.includes("page weight")) throw new Error("Colophon measurement was not written");
        writeFileSync(indexPath, html);

        const scriptHashes = new Set<string>();
        const styleHashes = new Set<string>();
        for (const file of htmlFiles(outDir)) {
          const page = readFileSync(file, "utf8");
          for (const match of page.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
            scriptHashes.add(`'sha256-${createHash("sha256").update(match[1] ?? "", "utf8").digest("base64")}'`);
          }
          for (const match of page.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
            if ((match[1] ?? "").trim().length === 0) continue;
            styleHashes.add(`'sha256-${createHash("sha256").update(match[1] ?? "", "utf8").digest("base64")}'`);
          }
        }
        const hashes = [...scriptHashes];
        const headersPath = path.join(outDir, "_headers");
        let headers = readFileSync(headersPath, "utf8");
        headers = headers.replace("__INLINE_HASHES__", hashes.join(" ") || "");
        if (styleHashes.size > 0) {
          headers = headers.replace("style-src 'self'", `style-src 'self' ${[...styleHashes].join(" ")}`);
        }
        if (headers.includes("__INLINE_HASHES__")) throw new Error("CSP placeholder was not replaced");
        writeFileSync(headersPath, headers);
      },
    },
  };
}

async function collectAssets(outDir: string, html: string): Promise<{ path: string; bytes: number; text: string }[]> {
  const urls = new Set<string>();
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (!url || /^(?:https?:|mailto:|data:|#)/.test(url)) continue;
    urls.add(url.split("?")[0] ?? url);
  }
  const files: { path: string; bytes: number; text: string }[] = [];
  const queue = [...urls];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const url = queue.pop();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const filePath = path.join(outDir, decodeURIComponent(url.replace(/^\//, "")));
    let raw: Buffer;
    try {
      raw = readFileSync(filePath);
    } catch {
      continue;
    }
    const text = raw.includes(0) ? "" : raw.toString("utf8");
    files.push({ path: filePath, bytes: raw.byteLength, text });
    if (filePath.endsWith(".css")) {
      for (const match of text.matchAll(/url\(([^)]+)\)/g)) {
        const ref = match[1]?.replace(/["']/g, "").trim();
        if (!ref || ref.startsWith("data:")) continue;
        const resolved = new URL(ref, `https://taamir.dev${url}`).pathname;
        if (!seen.has(resolved)) queue.push(resolved);
      }
    }
  }
  return files;
}

function htmlFiles(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) found.push(...htmlFiles(file));
    else if (file.endsWith(".html")) found.push(file);
  }
  return found;
}

function countTrackers(html: string, extra: string): number {
  return (html + extra).match(new RegExp(TRACKER, "gi"))?.length ?? 0;
}

function gitDate(): string {
  try {
    const date = execSync("git log -1 --format=%cs", { encoding: "utf8" }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `Last updated ${date}` : "";
  } catch {
    return "";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
