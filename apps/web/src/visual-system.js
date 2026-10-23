import "./visual-system.css";

const ACCENTS = {
  violet: { dark: "#C9C0FF", light: "#6554A6", glowDark: "rgba(169,154,255,.13)", glowLight: "rgba(101,84,166,.09)" },
  blue:   { dark: "#9CC5FF", light: "#356BB4", glowDark: "rgba(111,169,255,.13)", glowLight: "rgba(53,107,180,.09)" },
  mint:   { dark: "#8FE3CF", light: "#237A68", glowDark: "rgba(92,220,188,.11)", glowLight: "rgba(35,122,104,.08)" },
  rose:   { dark: "#FFB6D2", light: "#B14E78", glowDark: "rgba(255,145,191,.11)", glowLight: "rgba(177,78,120,.08)" }
};
const THEMES = ["dark", "oled", "light", "system"];
const DENSITIES = ["compact", "standard", "spacious"];
const EFFECTS = ["quiet", "balanced", "atmosphere"];

function storageGet(key, fallback = "") {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function lightTheme(root = document.documentElement) {
  if (root.dataset.theme === "light") return true;
  if (root.dataset.theme === "system") {
    try { return window.matchMedia("(prefers-color-scheme: light)").matches; } catch {}
  }
  return false;
}

export function setLinkaAccent(value = "violet") {
  const key = Object.hasOwn(ACCENTS, value) ? value : "violet";
  const root = document.documentElement;
  root.dataset.accent = key;
  storageSet("linka.accent", key);
  const palette = ACCENTS[key];
  const light = lightTheme(root);
  root.style.setProperty("--accent", light ? palette.light : palette.dark);
  root.style.setProperty("--accent-text", light ? "#FFFFFF" : "#171323");
  root.style.setProperty("--glow", light ? palette.glowLight : palette.glowDark);
  window.dispatchEvent(new CustomEvent("linka:accent-changed", { detail: { accent: key } }));
  return key;
}

export function setLinkaDensity(value = "standard") {
  const key = DENSITIES.includes(value) ? value : "standard";
  document.documentElement.dataset.density = key;
  storageSet("linka.density", key);
  window.dispatchEvent(new CustomEvent("linka:density-changed", { detail: { density: key } }));
  return key;
}

export function setLinkaEffects(value = "balanced") {
  const key = EFFECTS.includes(value) ? value : "balanced";
  document.documentElement.dataset.effects = key;
  storageSet("linka.effects", key);
  window.dispatchEvent(new CustomEvent("linka:effects-changed", { detail: { effects: key } }));
  return key;
}

function makeButton(text, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  return button;
}

export function initVisualSystem() {
  const root = document.documentElement;
  if (root.dataset.visualSystemReady === "true") return;
  root.dataset.visualSystemReady = "true";

  setLinkaAccent(storageGet("linka.accent", "violet"));
  setLinkaDensity(storageGet("linka.density", "standard"));
  setLinkaEffects(storageGet("linka.effects", "balanced"));

  const savedMotion = storageGet("linka.reduceMotion", "");
  let reducedMotion = savedMotion === "true";
  if (!savedMotion) {
    try { reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
  }
  root.classList.toggle("reduced-motion", reducedMotion);
  root.dataset.reduceMotion = String(reducedMotion);

  const motionQuery = (() => {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)"); } catch { return null; }
  })();
  if (motionQuery?.addEventListener) {
    motionQuery.addEventListener("change", event => {
      if (storageGet("linka.reduceMotion", "") !== "") return;
      reducedMotion = event.matches;
      root.classList.toggle("reduced-motion", reducedMotion);
      root.dataset.reduceMotion = String(reducedMotion);
    });
  }

  const appearanceChanged = () => setLinkaAccent(storageGet("linka.accent", "violet"));
  new MutationObserver(records => {
    if (records.some(record => record.attributeName === "data-theme")) appearanceChanged();
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  const colorScheme = (() => {
    try { return window.matchMedia("(prefers-color-scheme: light)"); } catch { return null; }
  })();
  colorScheme?.addEventListener?.("change", () => {
    if (root.dataset.theme === "system") appearanceChanged();
  });

  const toastStack = document.createElement("div");
  toastStack.className = "linka-toast-stack";
  toastStack.setAttribute("role", "status");
  toastStack.setAttribute("aria-live", "polite");
  toastStack.setAttribute("aria-relevant", "additions text");
  document.body.append(toastStack);

  function toast(message, actionLabel = "", action = null) {
    const node = document.createElement("div");
    node.className = "linka-toast";
    const copy = document.createElement("span");
    copy.className = "linka-toast-copy";
    copy.textContent = String(message || "");
    node.append(copy);
    if (actionLabel && typeof action === "function") {
      const button = makeButton(actionLabel, "linka-toast-action");
      button.addEventListener("click", () => {
        try { action(); } finally { node.classList.add("is-leaving"); setTimeout(() => node.remove(), 180); }
      });
      node.append(button);
    } else {
      const close = makeButton("×", "linka-toast-close");
      close.setAttribute("aria-label", "Dismiss notification");
      close.addEventListener("click", () => { node.classList.add("is-leaving"); setTimeout(() => node.remove(), 180); });
      node.append(close);
    }
    toastStack.append(node);
    const duration = actionLabel ? 7200 : 3600;
    setTimeout(() => {
      if (!node.isConnected) return;
      node.classList.add("is-leaving");
      setTimeout(() => node.remove(), 220);
    }, duration);
  }
  window.addEventListener("linka:toast", event => {
    const detail = event.detail || {};
    toast(detail.message, detail.actionLabel, detail.onAction);
  });

  const palette = document.createElement("div");
  palette.className = "linka-command-root";
  palette.hidden = true;
  palette.innerHTML =
    '<div class="linka-command-backdrop" data-close="true"></div>' +
    '<section class="linka-command-dialog" role="dialog" aria-modal="true" aria-labelledby="linka-command-title">' +
      '<div class="linka-command-head"><span class="linka-command-mark" aria-hidden="true">L</span>' +
      '<div class="linka-command-head-copy"><strong id="linka-command-title">Quick actions</strong><span>Search commands and jump to any workflow</span></div>' +
      '<kbd>ESC</kbd></div>' +
      '<label class="linka-command-search"><span aria-hidden="true">⌕</span><input type="search" autocomplete="off" spellcheck="false" placeholder="Type a command…" aria-label="Search commands"></label>' +
      '<div class="linka-command-meta"><span>COMMANDS</span><span>↑ ↓ select · ↵ run</span></div>' +
      '<div class="linka-command-results" role="listbox" aria-label="Commands"></div>' +
      '<div class="linka-command-footer"><span><kbd>Ctrl K</kbd> to open</span><span>Linka · Obsidian</span></div>' +
    '</section>';
  document.body.append(palette);
  const commandInput = palette.querySelector("input");
  const commandResults = palette.querySelector(".linka-command-results");
  const dialog = palette.querySelector(".linka-command-dialog");
  let currentCommands = [];
  let activeIndex = 0;
  let previousFocus = null;

  const updateTheme = mode => {
    if (!THEMES.includes(mode)) return;
    window.dispatchEvent(new CustomEvent("linka:appearance-theme", { detail: { theme: mode } }));
  };
  const notify = text => toast(text);
  const commands = [
    { title: "New capture", detail: "Write a thought or save a link", keywords: "note create save capture", shortcut: "N", run: () => {
      const input = document.querySelector("#capture-text");
      if (input) { input.focus(); window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }); }
    }},
    { title: "Search library", detail: "Find saved links and notes", keywords: "search find library", shortcut: "/", run: () => {
      const input = document.querySelector("#search");
      if (input) { input.focus(); input.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" }); }
    }},
    { title: "Appearance settings", detail: "Theme, accent color, density and motion", keywords: "theme style settings colors appearance", shortcut: "", run: () => document.querySelector("#settings-button")?.click() },
    { title: "Switch theme", detail: "Cycle Dark, OLED Black, Light and System", keywords: "dark light oled system theme", shortcut: "T", run: () => {
      const current = root.dataset.theme || "dark";
      updateTheme(THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]);
      notify("Theme changed");
    }},
    { title: "Cycle accent color", detail: "Violet, Blue, Mint or Rose", keywords: "accent color violet blue mint rose", shortcut: "A", run: () => {
      const values = Object.keys(ACCENTS);
      const current = root.dataset.accent || "violet";
      setLinkaAccent(values[(values.indexOf(current) + 1) % values.length]);
      notify("Accent: " + (root.dataset.accent || "violet"));
    }},
    { title: "Change interface density", detail: "Compact, Standard or Spacious", keywords: "density compact standard spacious", shortcut: "D", run: () => {
      const current = root.dataset.density || "standard";
      setLinkaDensity(DENSITIES[(DENSITIES.indexOf(current) + 1) % DENSITIES.length]);
      notify("Density: " + (root.dataset.density || "standard"));
    }},
    { title: "Toggle focus mode", detail: "Reduce ambient effects while you work", keywords: "focus quiet distraction atmosphere", shortcut: "F", run: () => {
      root.dataset.focus = root.dataset.focus === "true" ? "false" : "true";
      notify(root.dataset.focus === "true" ? "Focus mode enabled" : "Focus mode disabled");
    }},
    { title: "Export backup", detail: "Download your library as a JSON file", keywords: "backup export download", shortcut: "", run: () => document.querySelector("#export-button")?.click() },
    { title: "Import backup", detail: "Restore a Linka JSON backup", keywords: "backup import restore", shortcut: "", run: () => document.querySelector("#import-button")?.click() },
    { title: "Keyboard shortcuts", detail: "Ctrl+K commands · / search · Ctrl+Enter save", keywords: "keyboard shortcuts help", shortcut: "?", run: () => notify("Ctrl+K commands · / search · Ctrl+Enter saves the current capture") }
  ];

  function renderCommands() {
    const query = commandInput.value.trim().toLowerCase();
    currentCommands = commands.filter(command =>
      (command.title + " " + command.detail + " " + command.keywords).toLowerCase().includes(query)
    );
    activeIndex = Math.max(0, Math.min(activeIndex, currentCommands.length - 1));
    commandResults.replaceChildren();
    if (!currentCommands.length) {
      const empty = document.createElement("div");
      empty.className = "linka-command-empty";
      empty.textContent = "No matching commands. Try a shorter query.";
      commandResults.append(empty);
      return;
    }
    currentCommands.forEach((command, index) => {
      const button = makeButton("", "linka-command-row" + (index === activeIndex ? " is-active" : ""));
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(index === activeIndex));
      const glyph = document.createElement("span");
      glyph.className = "linka-command-glyph";
      glyph.textContent = command.title.slice(0, 1).toUpperCase();
      const copy = document.createElement("span");
      copy.className = "linka-command-row-copy";
      const title = document.createElement("strong");
      title.textContent = command.title;
      const detail = document.createElement("small");
      detail.textContent = command.detail;
      copy.append(title, detail);
      button.append(glyph, copy);
      if (command.shortcut) {
        const shortcut = document.createElement("kbd");
        shortcut.textContent = command.shortcut;
        button.append(shortcut);
      }
      button.addEventListener("mouseenter", () => { activeIndex = index; renderCommands(); });
      button.addEventListener("click", () => runCommand(command));
      commandResults.append(button);
    });
  }
  function closePalette() {
    if (palette.hidden) return;
    palette.hidden = true;
    root.classList.remove("palette-open");
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function openPalette() {
    previousFocus = document.activeElement;
    commandInput.value = "";
    activeIndex = 0;
    renderCommands();
    palette.hidden = false;
    root.classList.add("palette-open");
    requestAnimationFrame(() => commandInput.focus());
  }
  function runCommand(command) {
    closePalette();
    try { command.run(); } catch (error) { toast(error?.message || "Action could not be completed"); }
  }
  palette.addEventListener("click", event => {
    if (event.target.closest("[data-close]")) closePalette();
  });
  commandInput.addEventListener("input", () => { activeIndex = 0; renderCommands(); });
  commandInput.addEventListener("keydown", event => {
    if (event.key === "ArrowDown") { event.preventDefault(); activeIndex = (activeIndex + 1) % Math.max(currentCommands.length, 1); renderCommands(); }
    if (event.key === "ArrowUp") { event.preventDefault(); activeIndex = (activeIndex - 1 + currentCommands.length) % Math.max(currentCommands.length, 1); renderCommands(); }
    if (event.key === "Enter" && currentCommands[activeIndex]) { event.preventDefault(); runCommand(currentCommands[activeIndex]); }
    if (event.key === "Escape") { event.preventDefault(); closePalette(); }
  });

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (palette.hidden) openPalette(); else closePalette();
      return;
    }
    if (!palette.hidden && event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closePalette();
    }
  }, true);

  const pointer = (() => { try { return window.matchMedia("(pointer: fine)"); } catch { return null; } })();
  let activeCard = null;
  if (pointer?.matches) {
    document.addEventListener("pointermove", event => {
      if (event.pointerType === "touch" || root.classList.contains("reduced-motion") || root.dataset.effects !== "atmosphere") return;
      root.style.setProperty("--pointer-x", event.clientX + "px");
      root.style.setProperty("--pointer-y", event.clientY + "px");
      const card = event.target instanceof Element ? event.target.closest(".item, .capture") : null;
      if (card !== activeCard) {
        if (activeCard) {
          activeCard.style.setProperty("--tilt-x", "0deg");
          activeCard.style.setProperty("--tilt-y", "0deg");
        }
        activeCard = card;
      }
      if (card) {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - .5) * 1.6;
        const y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - .5) * -1.4;
        card.style.setProperty("--tilt-x", x.toFixed(2) + "deg");
        card.style.setProperty("--tilt-y", y.toFixed(2) + "deg");
      }
    }, { passive: true });
    document.addEventListener("pointerleave", () => {
      if (activeCard) {
        activeCard.style.setProperty("--tilt-x", "0deg");
        activeCard.style.setProperty("--tilt-y", "0deg");
        activeCard = null;
      }
    });
  }

  const status = document.querySelector("#status");
  if (status) {
    const observer = new MutationObserver(() => {
      status.classList.toggle("has-message", Boolean(status.textContent.trim()));
    });
    observer.observe(status, { childList: true, characterData: true, subtree: true });
  }
}
