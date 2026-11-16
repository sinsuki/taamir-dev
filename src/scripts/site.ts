export function initSite(): void {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => root.classList.add("theme-ready"));
    });
  }

  const toggle = document.querySelector<HTMLButtonElement>("#theme-toggle");
  const syncPressed = () => {
    const dark = root.getAttribute("data-theme") === "dark";
    toggle?.setAttribute("aria-pressed", dark ? "true" : "false");
  };
  syncPressed();
  toggle?.addEventListener("click", () => {
    setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    syncPressed();
  });

  const dialog = document.querySelector<HTMLDialogElement>("#shortcuts");
  const close = document.querySelector<HTMLButtonElement>("#shortcuts-close");
  let lastFocus: HTMLElement | null = null;
  const closeShortcuts = () => {
    if (!dialog?.open) return;
    dialog.close();
    lastFocus?.focus();
  };
  const openShortcuts = () => {
    if (!dialog || dialog.open) return;
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    close?.focus();
  };
  close?.addEventListener("click", closeShortcuts);
  dialog?.addEventListener("close", () => lastFocus?.focus());

  let pendingG = false;
  let timer = 0;
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) {
      return;
    }
    if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
      event.preventDefault();
      if (dialog?.open) closeShortcuts();
      else openShortcuts();
      return;
    }
    if (dialog?.open) return;
    if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
      syncPressed();
      return;
    }
    if (event.key === "g" || event.key === "G") {
      pendingG = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        pendingG = false;
      }, 800);
      return;
    }
    if (pendingG && (event.key === "p" || event.key === "P" || event.key === "c" || event.key === "C")) {
      event.preventDefault();
      pendingG = false;
      const id = event.key.toLowerCase() === "p" ? "projects" : "contact";
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView();
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus();
      return;
    }
    pendingG = false;
  });

  const figures = document.querySelectorAll<HTMLElement>(".figure");
  const figureObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in", "is-drawn");
        figureObserver.unobserve(entry.target);
      }
    },
    { threshold: 0.2 },
  );
  for (const figure of figures) {
    const rect = figure.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!reduce && !inView) figure.classList.add("is-pending");
    figureObserver.observe(figure);
  }

  const play = document.querySelector("#play");
  if (play) {
    const toyObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      toyObserver.disconnect();
      void import("./transfer-toy").then((mod) => mod.initTransferToy());
    });
    toyObserver.observe(play);
  }
}

function setTheme(theme: "light" | "dark"): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* storage can be blocked; the choice still applies for this view */
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#171512" : "#F5F0E6");
}
