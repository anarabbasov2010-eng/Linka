/**
 * Adds Linka's typographic signature without hard-coding a global palette.
 * Theme and accent variables are owned by visual-system.js.
 */
export function initLinkaSignature() {
  const root = document.documentElement;
  if (root.dataset.linkaSignatureReady === "true") return;
  root.dataset.linkaSignatureReady = "true";

  const style = document.createElement("style");
  style.id = "linka-signature-theme";
  style.textContent = `
    :root {
      font-synthesis: none;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    :root[data-theme="forest"] body {
      background: radial-gradient(ellipse at 50% -24%, rgba(125,138,114,.17), transparent 58%), var(--bg) !important;
    }
    :root[data-theme="forest"] #linka-atmosphere .veil {
      background: linear-gradient(180deg,rgba(7,14,8,.36),rgba(7,14,8,.45) 44%,rgba(5,10,6,.80)),linear-gradient(90deg,rgba(6,12,7,.18),transparent 40%,rgba(6,12,7,.15)) !important;
    }
    :root[data-theme="forest"] .linka-player-dock {
      border-color: var(--line-strong) !important;
      background: color-mix(in srgb, var(--panel-solid) 88%, transparent) !important;
      color: var(--text) !important;
      box-shadow: 0 18px 52px rgba(0,0,0,.34), inset 0 1px rgba(232,223,200,.045) !important;
    }
    :root[data-theme="forest"] .linka-player-art {
      color: var(--accent) !important;
      background: linear-gradient(145deg, color-mix(in srgb,var(--accent) 24%,transparent), var(--panel-raised)) !important;
    }
    :root[data-theme="forest"] .linka-player-button:hover {
      background: color-mix(in srgb,var(--accent) 16%,transparent) !important;
      border-color: var(--line-strong) !important;
    }
    :root[data-theme="forest"] .linka-player-play {
      color: var(--accent-text) !important;
      background: var(--accent) !important;
      border-color: transparent !important;
    }
    :root[data-theme="forest"] .linka-player-window {
      color: var(--text) !important;
      border-color: var(--line-strong) !important;
      background: linear-gradient(150deg, color-mix(in srgb,var(--panel-raised) 96%,transparent), var(--bg)) !important;
    }
    :root[data-theme="forest"] .linka-player-disc {
      border-color: var(--line-strong) !important;
      background: radial-gradient(circle at 38% 32%,color-mix(in srgb,var(--accent) 35%,transparent),var(--bg) 75%) !important;
      box-shadow: 0 0 52px var(--glow) !important;
    }
    :root[data-theme="forest"] .linka-player-seek,
    :root[data-theme="forest"] .linka-player-volume input { accent-color: var(--accent) !important; }
    :root[data-theme="forest"] .linka-doc-body { color: var(--text); }
    :root[data-theme="forest"] .linka-doc-title { color: var(--text); }
    @media (prefers-reduced-motion: reduce) {
      *,*::before,*::after { scroll-behavior:auto !important; }
    }
  `;
  document.head.append(style);
}
