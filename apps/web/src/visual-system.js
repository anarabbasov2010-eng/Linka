import "./visual-system.css";

const ACCENTS = {
  forest: { dark: "#C8AD79", light: "#80643A", darkText: "#172014", lightText: "#FFFFFF", glowDark: "rgba(146,169,123,.13)", glowLight: "rgba(128,100,58,.10)" }
};
const DENSITIES = ["compact", "standard", "spacious"];
const EFFECTS = ["quiet", "balanced", "atmosphere"];
const THEMES = ["forest"];
const THEME_PRESETS = {
  forest: {
    "--bg": "#08100B", "--panel": "rgba(15,26,18,.84)", "--panel-solid": "#101B13", "--panel-raised": "#1A291D",
    "--line": "rgba(232,223,200,.11)", "--line-strong": "rgba(200,173,121,.34)", "--text": "#EEE7D4",
    "--muted": "#ADB5A3", "--soft": "#D9CFB7", "--shadow": "0 28px 88px rgba(0,0,0,.42)", "--surface-top": "rgba(255,248,224,.045)"
  },
  dark: {
    "--bg": "#09090B", "--panel": "rgba(17,17,20,.90)", "--panel-solid": "#111114", "--panel-raised": "#1B1B21",
    "--line": "rgba(255,255,255,.09)", "--line-strong": "rgba(255,255,255,.16)", "--text": "#EDEDF2",
    "--muted": "#9696A3", "--soft": "#CFCFD8", "--shadow": "0 22px 80px rgba(0,0,0,.34)", "--surface-top": "rgba(255,255,255,.035)"
  },
  light: {
    "--bg": "#F4F2ED", "--panel": "rgba(255,255,255,.88)", "--panel-solid": "#FFFFFF", "--panel-raised": "#EBE8E1",
    "--line": "rgba(37,34,28,.10)", "--line-strong": "rgba(37,34,28,.18)", "--text": "#24232A",
    "--muted": "#74717A", "--soft": "#53515A", "--shadow": "0 22px 70px rgba(42,35,24,.12)", "--surface-top": "rgba(25,20,10,.025)"
  },
  oled: {
    "--bg": "#000000", "--panel": "rgba(6,6,8,.92)", "--panel-solid": "#050506", "--panel-raised": "#101014",
    "--line": "rgba(255,255,255,.10)", "--line-strong": "rgba(255,255,255,.18)", "--text": "#F5F5F7",
    "--muted": "#92929D", "--soft": "#D0D0D8", "--shadow": "0 22px 80px rgba(0,0,0,.55)", "--surface-top": "rgba(255,255,255,.025)"
  }
};

function storageGet(key, fallback = "") {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function systemPrefersLight() {
  try { return window.matchMedia("(prefers-color-scheme: light)").matches; } catch { return false; }
}
function resolvedTheme(theme) {
  return theme === "system" ? (systemPrefersLight() ? "light" : "dark") : theme;
}

export function setLinkaTheme(value = storageGet("linka.theme", "forest")) {
  const key = THEMES.includes(value) ? value : "forest";
  const resolved = resolvedTheme(key);
  const root = document.documentElement;
  root.dataset.theme = key;
  root.dataset.colorScheme = resolved === "light" ? "light" : "dark";
  root.style.colorScheme = root.dataset.colorScheme;
  Object.entries(THEME_PRESETS[resolved] || THEME_PRESETS.forest).forEach(([property, color]) => {
    root.style.setProperty(property, color);
  });
  storageSet("linka.theme", key);
  setLinkaAccent("forest");
  window.dispatchEvent(new CustomEvent("linka:appearance-theme", { detail: { theme: key, resolvedTheme: resolved } }));
  return key;
}

export function setLinkaAccent(value = storageGet("linka.accent", "forest")) {
  const key = Object.hasOwn(ACCENTS, value) ? value : "forest";
  const root = document.documentElement;
  root.dataset.accent = key;
  storageSet("linka.accent", key);
  const palette = ACCENTS[key];
  const light = root.dataset.colorScheme === "light";
  root.style.setProperty("--accent", light ? palette.light : palette.dark);
  root.style.setProperty("--accent-text", light ? palette.lightText : palette.darkText);
  root.style.setProperty("--glow", light ? palette.glowLight : palette.glowDark);
  window.dispatchEvent(new CustomEvent("linka:accent-changed", { detail: { accent: key } }));
  return key;
}

export function setLinkaDensity(value = storageGet("linka.density", "standard")) {
  const key = DENSITIES.includes(value) ? value : "standard";
  document.documentElement.dataset.density = key;
  storageSet("linka.density", key);
  window.dispatchEvent(new CustomEvent("linka:density-changed", { detail: { density: key } }));
  return key;
}

export function setLinkaEffects(value = storageGet("linka.effects", "balanced")) {
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

  setLinkaTheme("forest");
  setLinkaAccent(storageGet("linka.accent", "forest"));
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

  const colorScheme = (() => {
    try { return window.matchMedia("(prefers-color-scheme: light)"); } catch { return null; }
  })();
  if (colorScheme?.addEventListener) {
    colorScheme.addEventListener("change", () => {
      if (storageGet("linka.theme", "forest") === "system") setLinkaTheme("system");
    });
  }

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
      '<div class="linka-command-footer"><span><kbd>Ctrl K</kbd> to open</span><span>Linka · Workspace</span></div>' +
    '</section>';
  document.body.append(palette);
  const commandInput = palette.querySelector("input");
  const commandResults = palette.querySelector(".linka-command-results");
  const dialog = palette.querySelector(".linka-command-dialog");
  let currentCommands = [];
  let activeIndex = 0;
  let previousFocus = null;

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
    { title: "Appearance settings", detail: "Linka twilight theme, atmosphere, density and motion", keywords: "style settings appearance atmosphere", shortcut: "", run: () => document.querySelector("#settings-button")?.click() },
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
      button.addEventListener("mouseenter", () => {
        activeIndex = index;
        commandResults.querySelectorAll(".linka-command-row").forEach((node, itemIndex) => {
          node.classList.toggle("is-active", itemIndex === activeIndex);
          node.setAttribute("aria-selected", String(itemIndex === activeIndex));
        });
      });
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
