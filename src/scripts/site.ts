import { channels, contrast } from "../lib/contrast.mjs";
import { decodeInput } from "../lib/decode.mjs";
import { leafCap, localDate, rememberVisit } from "../lib/plant.mjs";

type Mode = "auto" | "light" | "dark";
type Payload = {
  state?: string;
  title?: string;
  artist?: string;
  album?: string;
  url?: string;
  art?: string;
  playedAgoMinutes?: number | null;
};

const modes: Mode[] = ["light", "dark", "auto"];
const hueLimit = 25;

export function initSite(): void {
  bindTheme();
  bindHue();
  document.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", () => {
    document.documentElement.classList.toggle("paused", document.visibilityState === "hidden");
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
    button.addEventListener("click", () => copyText(button));
  }
  const search = document.querySelector<HTMLInputElement>("#post-search");
  search?.addEventListener("input", () => filterPosts(search.value));
  bindPalette();
  for (const node of document.querySelectorAll<HTMLElement>("[data-vt]")) {
    const name = node.dataset.vt;
    if (name) node.style.viewTransitionName = name;
  }
  const start = () => {
    void refreshNow();
    window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshNow();
    }, 60_000);
  };
  if ("requestIdleCallback" in window) requestIdleCallback(start);
  else window.setTimeout(start, 300);
  growPlant();
  paintTokens();
}

function currentTheme(): Mode {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "auto";
}

function applyTheme(mode: Mode): void {
  const root = document.documentElement;
  if (mode === "auto") {
    delete root.dataset.theme;
    localStorage.removeItem("theme");
  } else {
    root.dataset.theme = mode;
    localStorage.setItem("theme", mode);
  }
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="color-theme"]')) {
    radio.checked = radio.value === mode;
  }
  paintTokens();
}

function bindTheme(): void {
  applyTheme(currentTheme());
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="color-theme"]')) {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      if (radio.value === "light" || radio.value === "dark" || radio.value === "auto") applyTheme(radio.value);
    });
  }
}

function cycleTheme(): void {
  const next = modes[(modes.indexOf(currentTheme()) + 1) % modes.length] ?? "auto";
  applyTheme(next);
}

let armed = false;
let armTimer = 0;

function onKey(event: KeyboardEvent): void {
  const target = event.target;
  const typing =
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
  if (event.key === "Escape") return;
  if (typing) return;
  if (event.key === "?") {
    event.preventDefault();
    document.getElementById("shortcuts")?.togglePopover();
    return;
  }
  if (event.key === "t" && !event.metaKey && !event.ctrlKey && !event.altKey) {
    cycleTheme();
    return;
  }
  if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    openPalette();
    return;
  }
  if (event.key === "g" && !event.metaKey && !event.ctrlKey) {
    armed = true;
    window.clearTimeout(armTimer);
    armTimer = window.setTimeout(() => {
      armed = false;
    }, 1000);
    return;
  }
  if (!armed) return;
  armed = false;
  const place = event.key === "w" ? "work" : event.key === "p" ? "projects" : event.key === "s" ? "play" : "";
  if (event.key === "b") {
    location.href = "/blog";
    return;
  }
  if (!place || !document.getElementById(place)) return;
  if (location.pathname === "/") location.hash = place;
  else location.href = `/#${place}`;
}

async function copyText(button: HTMLButtonElement): Promise<void> {
  const value = button.dataset.copy;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    return;
  }
  const previous = button.textContent;
  button.textContent = "copied";
  window.setTimeout(() => {
    button.textContent = previous;
  }, 1200);
}

let paletteReturn: HTMLElement | null = null;

function bindPalette(): void {
  const palette = document.getElementById("palette");
  const input = document.querySelector<HTMLInputElement>("#palette-input");
  const result = document.getElementById("palette-result");
  if (!palette || !input || !result) return;
  input.addEventListener("input", () => paintPalette(input.value, result));
  palette.addEventListener("toggle", (event) => {
    if (!(event instanceof ToggleEvent) || event.newState !== "closed") return;
    input.value = "";
    result.textContent = "Type five cron fields, like 0 9 * * 1-5, or a Unix timestamp.";
    filterPosts("");
    paletteReturn?.focus();
    paletteReturn = null;
  });
}

function openPalette(): void {
  const palette = document.getElementById("palette");
  const input = document.querySelector<HTMLInputElement>("#palette-input");
  if (!(palette instanceof HTMLElement) || typeof palette.showPopover !== "function" || !input) return;
  paletteReturn = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (!palette.matches(":popover-open")) palette.showPopover();
  input.focus();
}

function paintPalette(value: string, result: HTMLElement): void {
  const decoded = decodeInput(value);
  if (decoded.kind === "empty") {
    result.textContent = "Type five cron fields, like 0 9 * * 1-5, or a Unix timestamp.";
    filterPosts("");
    return;
  }
  if (decoded.kind === "help") {
    if (location.pathname.startsWith("/blog") && document.querySelector(".post-row")) {
      filterPosts(value);
      result.textContent = "Searching posts.";
      return;
    }
    result.textContent = decoded.message ?? "";
    return;
  }
  if (decoded.kind === "error") {
    result.textContent = decoded.message ?? "";
    filterPosts("");
    return;
  }
  filterPosts("");
  const summary = document.createElement("p");
  summary.textContent = decoded.summary ?? "";
  const note = document.createElement("p");
  note.textContent = decoded.note ?? "";
  result.replaceChildren(summary);
  if (decoded.runs && decoded.runs.length > 0) {
    const list = document.createElement("ol");
    list.className = "run-list";
    for (const run of decoded.runs) {
      const item = document.createElement("li");
      item.textContent = run;
      list.append(item);
    }
    result.append(list);
  }
  if (decoded.note) result.append(note);
}

function bindHue(): void {
  const panel = document.getElementById("hue-panel");
  const slider = document.querySelector<HTMLInputElement>("#hue-shift");
  const toggle = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  if (!panel || !slider) return;
  const current = readHue();
  slider.value = String(current);
  const label = document.getElementById("hue-value");
  if (label) label.textContent = formatHue(current);
  slider.addEventListener("input", () => {
    applyHue(Number(slider.value));
    paintTokens();
  });
  document.querySelector("[data-hue-reset]")?.addEventListener("click", () => {
    slider.value = "0";
    applyHue(0);
    paintTokens();
  });
  panel.addEventListener("toggle", (event) => {
    if (!(event instanceof ToggleEvent)) return;
    if (event.newState === "open") {
      paintTokens();
      panel.querySelector<HTMLElement>('input[name="color-theme"]:checked')?.focus();
    } else {
      toggle?.focus();
    }
  });
  if (!CSS.supports("color", "oklch(from red l c calc(h + 0))")) slider.disabled = true;
}

function formatHue(value: number): string {
  if (value === 0) return "±0°";
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}°`;
}

function readHue(): number {
  const raw = document.documentElement.style.getPropertyValue("--hue-shift");
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return 0;
  return Math.max(-hueLimit, Math.min(hueLimit, value));
}

function applyHue(value: number): void {
  const shiftValue = Math.max(-hueLimit, Math.min(hueLimit, Math.round(value)));
  const label = document.getElementById("hue-value");
  if (label) label.textContent = formatHue(shiftValue);
  value = shiftValue;
  if (value === 0) {
    document.documentElement.style.removeProperty("--hue-shift");
    try {
      sessionStorage.removeItem("hue");
    } catch {
      /* the palette still resets for this view */
    }
    return;
  }
  const shift = String(value);
  document.documentElement.style.setProperty("--hue-shift", shift);
  try {
    sessionStorage.setItem("hue", shift);
  } catch {
    /* session storage can be blocked; the shift still applies */
  }
}

function paintTokens(): void {
  const body = getComputedStyle(document.body);
  const paper = channels(body.backgroundColor);
  const ink = channels(body.color);
  for (const out of document.querySelectorAll<HTMLElement>("[data-contrast]")) {
    const source = out.parentElement?.querySelector<HTMLElement>("[data-token]");
    if (!source) continue;
    const style = getComputedStyle(source);
    const rgb = channels(source.dataset.measure === "color" ? style.color : style.backgroundColor);
    const onPaper = contrast(rgb, paper);
    const onInk = contrast(rgb, ink);
    if (out.dataset.pair === "paper") fillStamp(out, onPaper);
    else out.replaceChildren(fillStamp(document.createElement("span"), onPaper), document.createTextNode(" paper "), fillStamp(document.createElement("span"), onInk), document.createTextNode(" ink"));
  }
}

function fillStamp(node: HTMLElement, ratio: number): HTMLElement {
  const pass = ratio >= 4.5;
  node.className = `contrast-stamp ${pass ? "pass" : "fail"}`;
  node.textContent = `${ratio.toFixed(2)} · ${ratio >= 7 ? "AAA" : pass ? "AA" : "FAIL"}`;
  return node;
}

function growPlant(): void {
  const plants = document.querySelectorAll<HTMLElement>("[data-plant]");
  if (plants.length === 0) return;
  let stored: unknown = [];
  try {
    stored = JSON.parse(localStorage.getItem("desk-plant") || "[]");
  } catch {
    stored = [];
  }
  const days = rememberVisit(Array.isArray(stored) ? stored : [], localDate());
  try {
    localStorage.setItem("desk-plant", JSON.stringify(days));
  } catch {
    /* the plant still shows the days already counted */
  }
  const count = Math.min(days.length, leafCap);
  for (const plant of plants) {
    plant.dataset.leaves = String(count);
    for (const leaf of plant.querySelectorAll<SVGElement>("[data-leaf]")) {
      const index = Number(leaf.dataset.leaf);
      leaf.toggleAttribute("hidden", index > count);
    }
  }
  const caption = document.querySelector("[data-plant-caption]");
  if (caption) caption.textContent = `day ${days.length} · grows a leaf each day you visit`;
}

function filterPosts(query: string): void {
  const needle = query.trim().toLowerCase();
  for (const row of document.querySelectorAll<HTMLElement>(".post-row")) {
    const text = row.textContent?.toLowerCase() ?? "";
    row.hidden = needle.length > 0 && !text.includes(needle);
  }
}

async function refreshNow(): Promise<void> {
  const root = document.querySelector<HTMLElement>("[data-now-playing]");
  if (!root) return;
  try {
    const response = await fetch("/api/now-playing");
    const payload = (await response.json()) as Payload;
    paintNow(root, payload);
  } catch {
    paintNow(root, { state: "off" });
  }
}

function paintNow(root: HTMLElement, payload: Payload): void {
  const trackTitle = root.querySelector<HTMLElement>("[data-air-title]");
  const trackSep = root.querySelector<HTMLElement>("[data-air-sep]");
  const trackArtist = root.querySelector<HTMLElement>("[data-air-artist]");
  const trackAgo = root.querySelector<HTMLElement>("[data-air-ago]");
  if (!trackTitle || !trackSep || !trackArtist || !trackAgo) {
    throw new Error("The on-air strip is missing its title, artist, or time");
  }
  if (payload.state !== "playing" && payload.state !== "recent") {
    root.dataset.state = "off";
    trackTitle.textContent = "Radio silence. Back soon.";
    trackSep.hidden = true;
    trackArtist.textContent = "";
    trackAgo.textContent = "";
    return;
  }
  root.dataset.state = payload.state;
  const label = root.querySelector("[data-air-label]");
  if (label) label.textContent = payload.state === "playing" ? "On air" : "Last played";
  trackTitle.textContent = payload.title ?? "";
  trackSep.hidden = !payload.artist;
  trackArtist.textContent = payload.artist ?? "";
  trackAgo.textContent = payload.state === "recent" ? ` · ${ago(payload.playedAgoMinutes)}` : "";
  const link = root.querySelector<HTMLAnchorElement>("[data-air-url]");
  const pop = document.querySelector<HTMLAnchorElement>("[data-pop-link]");
  const href = payload.url || "https://open.spotify.com";
  if (link) {
    link.href = href;
    link.hidden = false;
  }
  if (pop) pop.href = href;
  const title = document.querySelector("[data-pop-title]");
  const by = document.querySelector("[data-pop-by]");
  const album = document.querySelector("[data-pop-album]");
  if (title) title.textContent = payload.title ?? "";
  if (by) by.textContent = payload.artist ?? "";
  if (album) album.textContent = payload.album ?? "";
  const art = document.querySelector<HTMLImageElement>("[data-art]");
  if (art && payload.art) {
    art.src = payload.art;
    art.alt = "";
    art.hidden = false;
  }
}

function ago(minutes: number | null | undefined): string {
  if (minutes == null) return "";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}
