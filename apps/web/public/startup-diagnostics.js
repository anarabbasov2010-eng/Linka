(() => {
  const STORAGE_KEY = "linka.startup.diagnostics.v1";
  const redact = value => String(value || "unknown")
    .slice(0, 2400)
    .replace(/(access_token|refresh_token|token|secret|code|key)=([^&\s]+)/gi, "$1=[redacted]");
  const logToDesktop = message => {
    try {
      const invoke = window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke;
      if (typeof invoke === "function") {
        return Promise.resolve(invoke("log_startup_diagnostic", { message: redact(message) }));
      }
    } catch (_) {}
    return Promise.reject(new Error("Desktop diagnostic logging is not available"));
  };
  const report = (kind, detail) => {
    const message = redact(kind + ": " + detail);
    try {
      const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      entries.push({ at: new Date().toISOString(), message });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-8)));
    } catch (_) {}
    void logToDesktop(message).catch(() => {});
  };
  window.addEventListener("error", event => {
    report("page error", (event.message || "unknown error") + " at " +
      (event.filename || "unknown") + ":" + (event.lineno || 0) + ":" + (event.colno || 0));
  });
  window.addEventListener("unhandledrejection", event => {
    const reason = event.reason;
    report("unhandled rejection", reason && (reason.stack || reason.message) || String(reason || "unknown rejection"));
  });
  try {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (entries.length) {
      void logToDesktop("Previous launch diagnostics: " + JSON.stringify(entries).slice(0, 1800))
        .then(() => localStorage.removeItem(STORAGE_KEY))
        .catch(() => {});
    }
  } catch (_) {}
})();