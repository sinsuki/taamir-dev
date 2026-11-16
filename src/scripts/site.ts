type Mode = "system" | "light" | "dark";
type Payload = {
  state?: string;
  title?: string;
  artist?: string;
  album?: string;
  url?: string;
  art?: string;
  playedAgoMinutes?: number | null;
};

const modes: Mode[] = ["system", "light", "dark"];

export function initSite(): void {
  const toggle = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  toggle?.addEventListener("click", () => cycleTheme());
  document.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", () => {
    document.documentElement.classList.toggle("paused", document.visibilityState === "hidden");
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
    button.addEventListener("click", () => copyText(button));
  }
  const search = document.querySelector<HTMLInputElement>("#post-search");
  search?.addEventListener("input", () => filterPosts(search.value));
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
}

function cycleTheme(): void {
  const root = document.documentElement;
  const current: Mode = root.dataset.theme === "light" || root.dataset.theme === "dark" ? root.dataset.theme : "system";
  const next = modes[(modes.indexOf(current) + 1) % modes.length] ?? "system";
  if (next === "system") {
    delete root.dataset.theme;
    localStorage.removeItem("theme");
  } else {
    root.dataset.theme = next;
    localStorage.setItem("theme", next);
  }
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
  if (event.key === "/" && location.pathname.startsWith("/blog")) {
    const box = document.querySelector<HTMLInputElement>("#post-search");
    if (box) {
      event.preventDefault();
      box.focus();
    }
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
  if (payload.state !== "playing" && payload.state !== "recent") {
    root.dataset.state = "off";
    return;
  }
  root.dataset.state = payload.state;
  const label = root.querySelector("[data-air-label]");
  if (label) label.textContent = payload.state === "playing" ? "On air" : "Last played";
  const track = root.querySelector("[data-air-track]");
  if (track) {
    const when = payload.state === "recent" ? ` · ${ago(payload.playedAgoMinutes)}` : "";
    track.textContent = `${payload.title ?? ""} — ${payload.artist ?? ""}${when}`;
  }
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
