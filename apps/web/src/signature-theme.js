const TOKENS = {
  bg: "#0B120D",
  panel: "rgba(18,28,20,.62)",
  panelSolid: "rgba(15,23,17,.84)",
  panelRaised: "rgba(29,41,31,.64)",
  line: "rgba(232,223,200,.14)",
  lineStrong: "rgba(181,154,105,.30)",
  text: "#E8DFC8",
  muted: "#B3BDA9",
  soft: "#D1C3A2",
  accent: "#B59A69",
  accentText: "#12170F",
  glow: "rgba(181,154,105,.10)"
};

const THEME_PALETTES = {
  forest: { scheme: "dark", bg: "#0B120D", panelRgb: "18,28,20", panelSolidRgb: "15,23,17", panelRaisedRgb: "29,41,31", line: "rgba(232,223,200,.14)", lineStrong: "rgba(181,154,105,.30)", text: "#E8DFC8", muted: "#B3BDA9", soft: "#D1C3A2", accent: "#B59A69", accentText: "#12170F", glow: "rgba(181,154,105,.10)" },
  carbon: { scheme: "dark", bg: "#101216", panelRgb: "28,32,39", panelSolidRgb: "21,24,30", panelRaisedRgb: "37,42,50", line: "rgba(230,235,244,.12)", lineStrong: "rgba(169,184,208,.28)", text: "#EDF1F5", muted: "#AAB3C0", soft: "#D1D8E2", accent: "#A9B8D0", accentText: "#10151D", glow: "rgba(135,156,190,.10)" },
  paper: { scheme: "light", bg: "#F4F0E8", panelRgb: "255,255,255", panelSolidRgb: "250,248,242", panelRaisedRgb: "240,236,226", line: "rgba(34,40,33,.10)", lineStrong: "rgba(139,106,63,.28)", text: "#282C25", muted: "#656B61", soft: "#414A40", accent: "#8C6B3E", accentText: "#FFFFFF", glow: "rgba(140,107,62,.08)" }
};

function preference(key, fallback = "") {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function savePreference(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function ensureStyles() {
  if (document.getElementById("linka-signature-theme")) return;
  const style = document.createElement("style");
  style.id = "linka-signature-theme";
  style.textContent = `
    :root {
      color-scheme: dark;
      --bg: ${TOKENS.bg};
      --panel: ${TOKENS.panel};
      --panel-solid: ${TOKENS.panelSolid};
      --panel-raised: ${TOKENS.panelRaised};
      --line: ${TOKENS.line};
      --line-strong: ${TOKENS.lineStrong};
      --text: ${TOKENS.text};
      --muted: ${TOKENS.muted};
      --soft: ${TOKENS.soft};
      --accent: ${TOKENS.accent};
      --accent-text: ${TOKENS.accentText};
      --glow: ${TOKENS.glow};
      --radius: 19px;
      --shadow: 0 28px 88px rgba(0,0,0,.33);
      font-synthesis: none;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    html, html[data-theme] { background:var(--bg) !important; }
    body { background:radial-gradient(ellipse at 50% -24%,var(--glow),transparent 58%),var(--bg) !important; color:var(--text) !important; }
    #linka-atmosphere { background:var(--bg) !important; }
    #linka-atmosphere .veil { background:linear-gradient(180deg,rgba(7,14,8,.36),rgba(7,14,8,.45) 44%,rgba(5,10,6,.80)),linear-gradient(90deg,rgba(6,12,7,.18),transparent 40%,rgba(6,12,7,.15)) !important; }
    #linka-atmosphere .grain { opacity:.032 !important; }
    html[data-theme="paper"] #linka-atmosphere { opacity:.16 !important; }
    html[data-theme="paper"] #linka-atmosphere video,
    html[data-theme="paper"] #linka-atmosphere img,
    html[data-theme="paper"] #linka-atmosphere .grain { opacity:0 !important; }
    html[data-theme="carbon"] .linka-player-dock,
    html[data-theme="carbon"] .linka-player-window,
    html[data-theme="carbon"] .linka-atmosphere-settings,
    html[data-theme="carbon"] .linka-doc-window,
    html[data-theme="carbon"] .linka-command-dialog,
    html[data-theme="paper"] .linka-player-dock,
    html[data-theme="paper"] .linka-player-window,
    html[data-theme="paper"] .linka-atmosphere-settings,
    html[data-theme="paper"] .linka-doc-window,
    html[data-theme="paper"] .linka-command-dialog {
      color:var(--text) !important;
      background:var(--panel-solid) !important;
      border-color:var(--line-strong) !important;
      box-shadow:var(--shadow) !important;
    }
    html[data-theme="paper"] .linka-doc-title,
    html[data-theme="paper"] .linka-doc-body,
    html[data-theme="paper"] .linka-doc-type-mirror {
      color:var(--text) !important;
      -webkit-text-fill-color:var(--text) !important;
      background:var(--panel) !important;
    }
    .linka-glass-opacity-row { display:flex; align-items:center; gap:12px; }
    .linka-glass-opacity { width:100%; accent-color:var(--accent); }
    .brand-name, h1, h2, h3, .hero-title, .section-title, .linka-settings-block h3,
    .linka-atmosphere-settings h2, .linka-player-current strong,
    .linka-doc-headcopy h2, .linka-doc-title, .linka-doc-body,
    .capture-card-title, .capture-title {
      font-family:"Palatino Linotype","Book Antiqua",Georgia,"Times New Roman",serif !important;
      font-weight:500;
      letter-spacing:-.018em;
      text-wrap:pretty;
    }
    .linka-doc-body, .linka-doc-type-mirror { font-size:15px !important; line-height:1.86 !important; letter-spacing:.008em !important; }
    .linka-player-dock { border-color:rgba(181,154,105,.32) !important; background:rgba(16,24,18,.74) !important; color:var(--text) !important; box-shadow:0 18px 52px rgba(0,0,0,.42),inset 0 1px rgba(232,223,200,.045) !important; }
    .linka-player-art { color:var(--accent) !important; background:linear-gradient(145deg,rgba(181,154,105,.22),rgba(32,44,36,.78)) !important; }
    .linka-player-button:hover { background:rgba(181,154,105,.16) !important; border-color:rgba(181,154,105,.42) !important; }
    .linka-player-play { color:#12170f !important; background:var(--accent) !important; border-color:transparent !important; }
    .linka-player-window { color:var(--text) !important; border-color:rgba(181,154,105,.28) !important; background:linear-gradient(150deg,rgba(32,44,36,.88),rgba(9,16,11,.91) 75%) !important; }
    .linka-player-window .linka-player-art { color:var(--accent) !important; }
    .linka-player-disc { border-color:rgba(181,154,105,.40) !important; background:radial-gradient(circle at 38% 32%,rgba(209,195,162,.34),rgba(125,138,114,.19) 47%,rgba(7,13,8,.92) 75%) !important; box-shadow:0 0 52px rgba(181,154,105,.13) !important; }
    .linka-player-panel, .linka-atmosphere-settings { color:var(--text) !important; }
    .linka-player-seek, .linka-player-volume input { accent-color:var(--accent) !important; }
    .linka-player-playlist-item.active { border-color:rgba(181,154,105,.48) !important; background:rgba(181,154,105,.10) !important; }
    .linka-atmosphere-toggle[aria-pressed=true] i { background:var(--accent) !important; }
    .linka-atmosphere-actions button { color:var(--text) !important; border-color:var(--lineStrong) !important; }
    .linka-doc-btn { border-color:rgba(181,154,105,.28) !important; }
    .linka-doc-btn.primary { background:var(--accent) !important; color:var(--accentText) !important; }
    .linka-type-erasing { display:inline; animation:linka-ink-out .19s ease both; }
    @keyframes linka-ink-out { from {opacity:.9;filter:blur(0)} to {opacity:0;filter:blur(2px)} }
    .linka-player-panel, .linka-doc-overlay { transition-duration:.58s !important; }
    .linka-toast { animation:linka-forest-toast-in .56s cubic-bezier(.18,.78,.25,1) both !important; border-color:rgba(181,154,105,.30) !important; background:rgba(18,28,20,.97) !important; box-shadow:0 18px 58px rgba(0,0,0,.38),inset 0 1px rgba(232,223,200,.045) !important; }
    .linka-toast-action, .linka-toast-close { color:var(--accent) !important; }
    @keyframes linka-forest-toast-in { from {opacity:0;transform:translateY(9px) scale(.985);filter:blur(3px)} to {opacity:1;transform:translateY(0) scale(1);filter:blur(0)} }
    @media (prefers-reduced-motion: reduce) {
      *,*::before,*::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; scroll-behavior:auto !important; transition-duration:.01ms !important; }
    }
  `;
  document.head.append(style);
}

export function setLinkaTheme(value = "forest") {
  const key = Object.prototype.hasOwnProperty.call(THEME_PALETTES, value) ? value : "forest";
  const palette = THEME_PALETTES[key];
  const root = document.documentElement;
  const savedOpacity = Number(preference("linka.glassOpacity", "74"));
  const opacity = Math.max(55, Math.min(90, Number.isFinite(savedOpacity) ? savedOpacity : 74));
  const alpha = opacity / 100;
  root.dataset.theme = key;
  root.dataset.glassOpacity = String(opacity);
  root.style.colorScheme = palette.scheme;
  root.style.setProperty("--bg", palette.bg);
  root.style.setProperty("--panel", `rgba(${palette.panelRgb},${alpha})`);
  root.style.setProperty("--panel-solid", `rgba(${palette.panelSolidRgb},${Math.min(.97, alpha + .16)})`);
  root.style.setProperty("--panel-raised", `rgba(${palette.panelRaisedRgb},${Math.min(.94, alpha + .10)})`);
  root.style.setProperty("--line", palette.line);
  root.style.setProperty("--line-strong", palette.lineStrong);
  root.style.setProperty("--text", palette.text);
  root.style.setProperty("--muted", palette.muted);
  root.style.setProperty("--soft", palette.soft);
  if (!preference("linka.accent.user", "")) {
    root.style.setProperty("--accent", palette.accent);
    root.style.setProperty("--accent-text", palette.accentText);
    root.style.setProperty("--glow", palette.glow);
  }
  savePreference("linka.theme", key);
  window.dispatchEvent(new CustomEvent("linka:theme-changed", { detail: { theme: key } }));
  return key;
}

export function setLinkaGlassOpacity(value = 74) {
  const numeric = Number(value);
  const opacity = Math.max(55, Math.min(90, Number.isFinite(numeric) ? numeric : 74));
  savePreference("linka.glassOpacity", String(opacity));
  setLinkaTheme(document.documentElement.dataset.theme || preference("linka.theme", "forest"));
  return opacity;
}

export function initLinkaSignature() {
  const root = document.documentElement;
  if (root.dataset.linkaSignatureReady === "true") return;
  root.dataset.linkaSignatureReady = "true";
  ensureStyles();
  setLinkaTheme(preference("linka.theme", "forest"));
}
