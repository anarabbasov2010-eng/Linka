const TOKENS = {
  bg: "#0B120D",
  panel: "rgba(18,28,20,.88)",
  panelSolid: "#121C14",
  panelRaised: "#1B291D",
  line: "rgba(232,223,200,.105)",
  lineStrong: "rgba(181,154,105,.30)",
  text: "#E8DFC8",
  muted: "#B3BDA9",
  soft: "#D1C3A2",
  accent: "#B59A69",
  accentText: "#12170F",
  glow: "rgba(181,154,105,.10)"
};

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
    html, html[data-theme], html[data-theme="light"], html[data-theme="system"] { color-scheme:dark !important; background:var(--bg) !important; }
    body { background:radial-gradient(ellipse at 50% -24%,rgba(125,138,114,.17),transparent 58%),var(--bg) !important; color:var(--text) !important; }
    #linka-atmosphere { background:var(--bg) !important; }
    #linka-atmosphere .veil { background:linear-gradient(180deg,rgba(7,14,8,.36),rgba(7,14,8,.45) 44%,rgba(5,10,6,.80)),linear-gradient(90deg,rgba(6,12,7,.18),transparent 40%,rgba(6,12,7,.15)) !important; }
    #linka-atmosphere .grain { opacity:.032 !important; }
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
    .linka-player-dock { border-color:rgba(181,154,105,.32) !important; background:rgba(16,24,18,.90) !important; color:var(--text) !important; box-shadow:0 18px 52px rgba(0,0,0,.42),inset 0 1px rgba(232,223,200,.045) !important; }
    .linka-player-art { color:var(--accent) !important; background:linear-gradient(145deg,rgba(181,154,105,.22),rgba(32,44,36,.78)) !important; }
    .linka-player-button:hover { background:rgba(181,154,105,.16) !important; border-color:rgba(181,154,105,.42) !important; }
    .linka-player-play { color:#12170f !important; background:var(--accent) !important; border-color:transparent !important; }
    .linka-player-window { color:var(--text) !important; border-color:rgba(181,154,105,.28) !important; background:linear-gradient(150deg,rgba(32,44,36,.985),rgba(9,16,11,.985) 75%) !important; }
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
    @media (prefers-reduced-motion: reduce) {
      *,*::before,*::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; scroll-behavior:auto !important; transition-duration:.01ms !important; }
    }
  `;
  document.head.append(style);
}

export function initLinkaSignature() {
  const root = document.documentElement;
  if (root.dataset.linkaSignatureReady === "true") return;
  root.dataset.linkaSignatureReady = "true";
  ensureStyles();
  root.dataset.theme = "forest";
  root.dataset.accent = "forest";
  root.style.colorScheme = "dark";
  for (const [key, value] of Object.entries(TOKENS)) {
    const variable = ({
      bg:"--bg",panel:"--panel",panelSolid:"--panel-solid",panelRaised:"--panel-raised",
      line:"--line",lineStrong:"--line-strong",text:"--text",muted:"--muted",soft:"--soft",
      accent:"--accent",accentText:"--accent-text",glow:"--glow"
    })[key];
    if (variable) root.style.setProperty(variable, value);
  }
  try { localStorage.setItem("linka.theme", "forest"); localStorage.setItem("linka.accent", "forest"); } catch {}
  window.addEventListener("linka:appearance-theme", event => {
    if (event.detail?.theme !== "forest") {
      root.dataset.theme = "forest";
      try { localStorage.setItem("linka.theme", "forest"); } catch {}
    }
  });
}
