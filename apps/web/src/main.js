import { loadCaptures, saveCaptures, makeCapture, visibleCaptures } from "./store.js";
import { initLinkaExperience } from "./experience.js";
import { initVisualSystem, setLinkaAccent, setLinkaDensity, setLinkaEffects } from "./visual-system.js";
import {
  addDeletedId, disconnectCloud, getCloudConfig, getCloudSession,
  getOtpCooldown, readDeletedIds, requestEmailOtp, saveCloudConfig, syncCloudCaptures,
  verifyEmailOtp, readLinkaProfile, saveLinkaProfile, beginQrPairing, claimQrPairing,
  startGoogleOAuth, completeGoogleOAuthCallback
} from "./cloud-sync.js";
import QRCode from "qrcode";

const $ = selector => document.querySelector(selector);
const form = $("#capture-form");
const draft = $("#capture-text");
const saveButton = $("#save-button");
const list = $("#capture-list");
const search = $("#search");
const count = $("#capture-count");
const status = $("#status");
const composeLabel = $("#compose-label");
const filters = Array.from(document.querySelectorAll("[data-filter]"));
const modalRoot = $("#modal-root");
const selectedIds = new Set();
let selectionMode = false;
const selectionButton = document.createElement("button");
selectionButton.type = "button";
selectionButton.className = "ghost selection-mode-button";
selectionButton.textContent = "Select items";
selectionButton.setAttribute("aria-pressed", "false");
$("#export-button").insertAdjacentElement("beforebegin", selectionButton);
const bulkToolbar = document.createElement("div");
bulkToolbar.className = "bulk-toolbar";
bulkToolbar.hidden = true;
list.parentElement.insertBefore(bulkToolbar, list);
search.title = "Search operators: type:link, type:note, is:pinned, site:example.com, before:YYYY-MM-DD, after:YYYY-MM-DD";
const TERMS_VERSION = "2026-10-23-v2";
const TERMS_TEXT = `
Linka is a personal inbox for saving text and links on the device or browser profile where you use it.

1. Local storage. Your captures are stored in browser-local storage or local app storage. Clearing app data, resetting a browser, uninstalling the app or device failure may erase information. Export backups that matter to you.

2. Optional cloud sync. Linka keeps captures locally and can sync them across your devices when you configure the same Supabase project and sign in to the same account. Keep a backup of important data; local use and manual export/import remain available.

3. Your responsibility. You are responsible for the content you save, your device security and keeping backups. Do not rely on Linka as the only copy of critical, regulated or irreplaceable information.

4. External content. Linka may open links in other apps or your browser. Those destinations are operated by third parties and have their own terms and privacy practices.

5. Availability. Linka is provided as an early-stage utility. Features may change, and it is not guaranteed to be error-free or available on every device.

6. Acceptable use. Do not use Linka to store or distribute unlawful content or content that violates another person's rights. Keep sensitive information out of shared devices.

By selecting “I agree”, you confirm that you have read these terms and understand local storage, optional cloud synchronization and the need to keep backups. This notice is an in-app product agreement, not a substitute for professional legal advice.`;
let captures = loadCaptures();
let activeFilter = "all";
let editingId = null;
let statusTimer = null;
let cloudSyncTimer = null;
let cloudSyncBusy = false;
let cloudSyncStatus = "";
let lastCloudRefreshAt = 0;
const expandedCards = new Set();
const desktopBuildVersion = String(import.meta.env.VITE_LINKA_DESKTOP_VERSION || "").trim();
let themeMode = localStorage.getItem("linka.theme") || "dark";
let reduceMotion = localStorage.getItem("linka.reduceMotion") === "true" || (localStorage.getItem("linka.reduceMotion") === null && (() => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } })());

function say(message) {
  status.textContent = message;
  status.style.opacity = "1";
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { status.style.opacity = "0"; }, 2800);
}
function isLink(text) { return /^https?:\/\//i.test(text.trim()); }
function formatDate(value) {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return "Saved"; }
}
function persist() {
  if (!saveCaptures(captures)) say("Storage unavailable or full. Export a backup before closing.");
  scheduleCloudSync();
}
function scheduleCloudSync() {
  if (!getCloudSession()) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => { void syncNow({ silent: true }).catch(() => {}); }, 1400);
}
async function syncNow({ silent = false } = {}) {
  if (cloudSyncBusy) return null;
  cloudSyncBusy = true;
  try {
    const result = await syncCloudCaptures(captures, readDeletedIds());
    captures = result.captures;
    saveCaptures(captures);
    cloudSyncStatus = result.message;
    render();
    if (!silent) say(result.message);
    return result;
  } catch (error) {
    cloudSyncStatus = error?.message || "Облачная синхронизация failed";
    if (!silent) say("Sync failed: " + cloudSyncStatus);
    throw error;
  } finally {
    cloudSyncBusy = false;
  }
}
function compareVersions(a, b) {
  const left = String(a || "").match(/\d+/g)?.map(Number) || [];
  const right = String(b || "").match(/\d+/g)?.map(Number) || [];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const x = left[i] || 0, y = right[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function applyTheme(mode = themeMode) {
  if (!["dark", "oled", "light", "system"].includes(mode)) mode = "dark";
  themeMode = mode;
  document.documentElement.dataset.theme = mode;
  localStorage.setItem("linka.theme", mode);
  window.dispatchEvent(new CustomEvent("linka:theme-changed", { detail: { theme: mode } }));
}
applyTheme();

function render() {
  for (const id of selectedIds) if (!captures.some(item => item.id === id)) selectedIds.delete(id);
  const shown = visibleCaptures(captures, activeFilter, search.value);
  count.textContent = captures.length + (captures.length === 1 ? " item" : " items");
  selectionButton.textContent = selectionMode ? "Exit selection" : "Select items";
  selectionButton.setAttribute("aria-pressed", String(selectionMode));
  selectionButton.classList.toggle("selection-mode-active", selectionMode);
  bulkToolbar.hidden = !selectionMode;
  bulkToolbar.replaceChildren();
  if (selectionMode) {
    const summary = document.createElement("span");
    summary.className = "bulk-summary";
    summary.textContent = selectedIds.size + " selected";
    bulkToolbar.append(summary);
    const bulkButton = (label, action, danger = false) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = danger ? "action bulk-danger" : "action";
      button.dataset.bulkAction = action;
      button.textContent = label;
      bulkToolbar.append(button);
    };
    bulkButton("Select visible", "select-visible");
    bulkButton("Clear", "clear");
    bulkButton("Pin", "pin");
    bulkButton("Unpin", "unpin");
    bulkButton("Copy", "copy");
    bulkButton("Export", "export");
    bulkButton("Delete", "delete", true);
  }
  list.replaceChildren();
  if (!shown.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.innerHTML = '<span class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/></svg></span>';
    const title = document.createElement("strong");
    title.textContent = captures.length ? "Nothing matches this view" : "A little room for what matters";
    const description = document.createElement("p");
    description.textContent = captures.length ? "Try another search or switch the filter." : "Paste a link or write a thought above. It will stay in this browser profile until you remove it.";
    empty.append(title, description);
    list.append(empty);
    return;
  }
  shown.forEach((item, index) => {
    const card = document.createElement("article");
    card.dataset.itemId = item.id;
    card.className = "item" + (item.pinned ? " pinned" : "") + (expandedCards.has(item.id) ? " expanded" : "") + (selectedIds.has(item.id) ? " is-selected" : "");
    card.style.setProperty("--index", String(index));
    const head = document.createElement("div"); head.className = "item-head";
    const kind = document.createElement("span"); kind.className = "kind";
    kind.textContent = item.pinned ? "Pinned" : (isLink(item.text) ? "Link" : "Note");
    if (selectionMode) {
      const selectItem = makeAction(selectedIds.has(item.id) ? "✓ Selected" : "Select", "select", item.id);
      selectItem.setAttribute("aria-pressed", String(selectedIds.has(item.id)));
      head.append(kind, selectItem, makeAction(item.pinned ? "Unpin" : "Pin", "pin", item.id));
    } else {
      head.append(kind, makeAction(item.pinned ? "Unpin" : "Pin", "pin", item.id));
    }
    const body = document.createElement("p");
    body.className = "item-text" + (isLink(item.text) ? " link" : "");
    body.textContent = item.text;
    const previewBits = [];
    if (isLink(item.text) && /^https:\/\//i.test(item.previewImageUrl || "")) {
      const frame = document.createElement("div"); frame.className = "item-cover-frame";
      const cover = document.createElement("img"); cover.className = "item-cover"; cover.src = item.previewImageUrl;
      cover.alt = item.previewTitle || "Link preview"; cover.loading = "lazy"; cover.decoding = "async"; cover.referrerPolicy = "no-referrer";
      cover.addEventListener("load", () => cover.classList.add("loaded"), { once: true });
      cover.addEventListener("error", () => frame.remove(), { once: true }); frame.append(cover); previewBits.push(frame);
    }
    if (isLink(item.text) && item.previewTitle) { const title = document.createElement("p"); title.className = "item-title"; title.textContent = item.previewTitle; previewBits.push(title); }
    if (isLink(item.text) && item.previewDescription) { const description = document.createElement("p"); description.className = "item-description"; description.textContent = item.previewDescription; previewBits.push(description); }
    if (isLink(item.text)) {
      const url = document.createElement("a");
      url.href = item.text.trim(); url.target = "_blank"; url.rel = "noopener noreferrer";
      url.className = "open-link"; url.textContent = "Open link ↗";
      body.append(document.createElement("br"), url);
    }
    const foot = document.createElement("div"); foot.className = "item-foot";
    const date = document.createElement("span"); date.className = "date"; date.textContent = formatDate(item.updatedAt || item.createdAt);
    const actions = document.createElement("div"); actions.className = "actions";
    actions.append(makeAction("Copy", "copy", item.id), makeAction("Edit", "edit", item.id), makeAction("Delete", "delete", item.id));
    if (item.text.length > 240) {
      const expand = makeAction(expandedCards.has(item.id) ? "Show less" : "Read more", "expand", item.id);
      expand.setAttribute("aria-expanded", String(expandedCards.has(item.id)));
      actions.prepend(expand);
    }
    foot.append(date, actions); card.append(head, ...previewBits, body, foot); list.append(card);
  });
}
function showSearchSpace(initial = "") {
  const content = document.createElement("div"); content.className = "search-space";
  const head = document.createElement("div"); head.className = "modal-head";
  const logo = document.createElement("img"); logo.className = "modal-logo"; logo.src = "/linka-mark.svg"; logo.alt = "";
  const meta = document.createElement("div");
  const title = document.createElement("h2"); title.textContent = "Search your library";
  const subtitle = document.createElement("p"); subtitle.textContent = "Find a saved link, page title, or thought.";
  meta.append(title, subtitle); head.append(logo, meta);
  const searchWrap = document.createElement("label"); searchWrap.className = "search-space-input-wrap";
  searchWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4 4"/></svg>';
  const input = document.createElement("input"); input.className = "search-space-input"; input.type = "search";
  input.placeholder = "Search everything you’ve saved…"; input.value = initial; input.autocomplete = "off"; input.setAttribute("aria-label", "Search your Linka library");
  const hint = document.createElement("span"); hint.className = "search-hint"; hint.textContent = "Esc to close";
  searchWrap.append(input, hint);
  const info = document.createElement("div"); info.className = "search-space-meta";
  const count = document.createElement("span"); const scope = document.createElement("span"); scope.textContent = "Across links and notes";
  info.append(count, scope);
  const results = document.createElement("div"); results.className = "search-space-results"; results.setAttribute("role", "listbox"); results.setAttribute("aria-label", "Search results");
  content.append(head, searchWrap, info, results);
  const layer = modalShell(content, { dismissable: true }); layer.classList.add("search-space-layer");
  function refresh() {
    const q = input.value.trim().toLocaleLowerCase();
    const found = visibleCaptures(captures, "all", input.value).slice(0, 80);
    count.textContent = q ? (found.length + " matching " + (found.length === 1 ? "item" : "items")) : ("Recently saved · " + found.length);
    results.replaceChildren();
    if (!found.length) {
      const empty = document.createElement("div"); empty.className = "search-empty";
      empty.innerHTML = '<div style="font-size:22px;margin-bottom:9px">⌕</div><strong>No matches yet</strong><br>Try a different word, domain, or page title.';
      results.append(empty); return;
    }
    found.forEach(item => {
      const row = document.createElement("button"); row.type = "button"; row.className = "search-result"; row.setAttribute("role", "option");
      const thumb = document.createElement("span"); thumb.className = "search-thumb";
      if (isLink(item.text) && /^https:\/\//i.test(item.previewImageUrl || "")) {
        const image = document.createElement("img"); image.src = item.previewImageUrl; image.alt = ""; image.loading = "lazy"; image.decoding = "async"; image.referrerPolicy = "no-referrer";
        thumb.append(image);
      } else {
        thumb.textContent = isLink(item.text) ? "↗" : "Aa";
      }
      const copy = document.createElement("span"); copy.className = "search-result-copy";
      const rowTitle = document.createElement("span"); rowTitle.className = "search-result-title";
      let host = ""; if (isLink(item.text)) { try { host = new URL(item.text).hostname.replace(/^www\./i, ""); } catch {} }
      rowTitle.textContent = item.previewTitle || host || item.text.slice(0, 100);
      const detail = document.createElement("span"); detail.className = "search-result-detail";
      detail.textContent = item.previewDescription || item.text;
      const type = document.createElement("span"); type.className = "search-result-type"; type.textContent = item.pinned ? "Pinned" : (isLink(item.text) ? "Link" : "Note");
      copy.append(rowTitle, detail); row.append(thumb, copy, type);
      row.addEventListener("click", () => {
        search.value = input.value; activeFilter = "all";
        filters.forEach(button => button.classList.toggle("active", button.dataset.filter === activeFilter));
        render(); modalRoot.replaceChildren();
        requestAnimationFrame(() => {
          const match = Array.from(list.querySelectorAll("[data-item-id]")).find(node => node.dataset.itemId === item.id);
          if (match) { match.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }); match.classList.add("spotlight"); setTimeout(() => match.classList.remove("spotlight"), 950); }
        });
      });
      results.append(row);
    });
  }
  input.addEventListener("input", refresh);
  refresh(); input.focus(); input.select();
}
function makeAction(label, action, id) {
  const button = document.createElement("button");
  button.type = "button"; button.className = "action"; button.textContent = label;
  button.dataset.action = action; button.dataset.id = id;
  return button;
}
function resetEditor() {
  editingId = null; draft.value = ""; composeLabel.textContent = "Quick capture";
  saveButton.innerHTML = 'Save to inbox <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>';
  saveButton.disabled = true;
}
function modalShell(content, { dismissable = false } = {}) {
  const layer = document.createElement("div");
  layer.className = "modal-layer";
  layer.innerHTML = '<section class="modal" role="dialog" aria-modal="true"></section>';
  layer.firstElementChild.append(content);
  if (dismissable) {
    layer.addEventListener("click", event => { if (event.target === layer) layer.remove(); });
    const esc = event => { if (event.key === "Escape") { layer.remove(); document.removeEventListener("keydown", esc); } };
    document.addEventListener("keydown", esc);
  }
  modalRoot.replaceChildren(layer);
  return layer;
}
function addTermsBody(container) {
  const head = document.createElement("div"); head.className = "modal-head";
  const logo = document.createElement("img"); logo.className = "modal-logo"; logo.src = "/linka-mark.svg"; logo.alt = "";
  const meta = document.createElement("div");
  const title = document.createElement("h2"); title.textContent = "A quick agreement";
  const subtitle = document.createElement("p"); subtitle.textContent = "Please read this before using Linka";
  meta.append(title, subtitle); head.append(logo, meta); container.append(head);
  const body = document.createElement("div");
  const sections = [
    ["Your data stays local", "Captures live in this browser profile or local app storage. Browser resets, cleared data, device loss or uninstallation may erase them. Keep an export backup."],
    ["Optional cloud sync", "Войти to the same Linka account on Android, Windows and the web to sync your library. Local storage and manual export/import remain available even when you are offline. Sync needs a configured shared Supabase project; never enter a service-role or secret key into the app."],
    ["Use and responsibility", "You are responsible for what you save, protecting your device, and keeping backups. Do not use Linka as the only copy of critical information."],
    ["Links and early access", "Opened links are handled by external apps/sites. Linka is an early-stage utility; features can change and uninterrupted, error-free operation is not guaranteed."],
    ["Acceptable use", "Use Linka lawfully, respect other people’s rights, and avoid saving sensitive information on shared devices."]
  ];
  sections.forEach(([h,p]) => { const h3=document.createElement("h3"); h3.textContent=h; const para=document.createElement("p"); para.textContent=p; body.append(h3,para); });
  const note=document.createElement("p"); note.textContent="This in-app product agreement explains how the current version works; it is not professional legal advice.";
  body.append(note); container.append(body);
}
function showAgreement({mustAccept = false} = {}) {
  const content = document.createElement("div"); addTermsBody(content);
  const actions = document.createElement("div"); actions.className="modal-actions";
  if (mustAccept) {
    const decline=document.createElement("button"); decline.className="ghost"; decline.textContent="Decline";
    decline.addEventListener("click", () => {
      modalRoot.replaceChildren();
      $("#app").replaceChildren();
      const panel=document.createElement("section"); panel.className="declined";
      const h=document.createElement("h1"); h.textContent="Linka is paused";
      const p=document.createElement("p"); p.className="hero-sub"; p.textContent="You need to accept the in-app agreement to use this version. You can close this window or reload to review it again.";
      panel.append(h,p); $("#app").append(panel);
    });
    const accept=document.createElement("button"); accept.className="primary"; accept.textContent="I agree and continue";
    accept.addEventListener("click", () => { localStorage.setItem("linka.termsAccepted", TERMS_VERSION); modalRoot.replaceChildren(); say("Agreement saved on this device"); window.dispatchEvent(new Event("linka:agreement-accepted")); });
    actions.append(decline, accept);
  } else {
    const close=document.createElement("button"); close.className="primary"; close.textContent="Готово";
    close.addEventListener("click", () => modalRoot.replaceChildren());
    actions.append(close);
  }
  content.append(actions);
  return modalShell(content);
}
function showCloudSyncНастройки() {
  const content = document.createElement("div");
  const head = document.createElement("div"); head.className = "modal-head";
  const logo = document.createElement("img"); logo.className = "modal-logo"; logo.src = "/linka-mark.svg"; logo.alt = "";
  const meta = document.createElement("div");
  const title = document.createElement("h2"); title.textContent = "Linka";
  const sub = document.createElement("p"); sub.textContent = "Один аккаунт · твои сохранения на всех устройствах";
  meta.append(title, sub); head.append(logo, meta); content.append(head);

  const note = document.createElement("p");
  note.textContent = "Войди через Google. Один аккаунт — твоя библиотека на телефоне, компьютере и сайте.";
  content.append(note);

  const config = getCloudConfig();
  const session = getCloudSession();
  const form = document.createElement("div"); form.className = "cloud-form";
  const field = (labelText, type, value, placeholder, autocomplete) => {
    const wrap = document.createElement("label"); wrap.className = "cloud-field";
    const label = document.createElement("span"); label.textContent = labelText;
    const input = document.createElement("input"); input.type = type; input.value = value || ""; input.placeholder = placeholder || "";
    input.autocomplete = autocomplete || (type === "email" ? "email" : "off");
    wrap.append(label, input); form.append(wrap); return input;
  };
  const email = field("Электронная почта · запасной вход", "email", session?.email || "", "you@example.com", "email");
  const code = field("Код из письма", "text", "", "6 цифр", "one-time-code");
  code.inputMode = "numeric"; code.maxLength = 6; code.pattern = "[0-9]{6}";
  const profile = readLinkaProfile() || {};
  const profileWrap = document.createElement("div"); profileWrap.className = "cloud-form";
  const displayName = field("Как тебя называть", "text", profile.displayName || session?.displayName || "", "Имя или псевдоним", "nickname");
  const age = field("Возраст (необязательно)", "number", profile.age == null ? "" : String(profile.age), "Можно оставить пустым", "off");
  age.min = "13"; age.max = "120";
  const profileFields = [displayName.parentElement, age.parentElement];
  profileFields.forEach(el => { if (el) profileWrap.append(el); });
  const advanced = document.createElement("details"); advanced.className = "linka-config";
  const summary = document.createElement("summary"); summary.textContent = "Для разработчика · настройки проекта";
  const advancedForm = document.createElement("div"); advancedForm.className = "cloud-form";
  const urlWrap = document.createElement("label"); urlWrap.className = "cloud-field";
  const urlLabel = document.createElement("span"); urlLabel.textContent = "Project URL";
  const url = document.createElement("input"); url.type = "url"; url.value = config.url; url.placeholder = "https://…supabase.co"; url.autocomplete = "url";
  urlWrap.append(urlLabel,url); advancedForm.append(urlWrap);
  const keyWrap = document.createElement("label"); keyWrap.className = "cloud-field";
  const keyLabel = document.createElement("span"); keyLabel.textContent = "Public publishable key";
  const key = document.createElement("input"); key.type = "text"; key.value = config.key; key.placeholder = "sb_publishable_…"; key.autocomplete = "off";
  keyWrap.append(keyLabel,key); advancedForm.append(keyWrap);
  advanced.append(summary,advancedForm);
  content.append(form, profileWrap, advanced);

  const statusLine = document.createElement("p"); statusLine.className = "cloud-status";
  statusLine.textContent = session ? `Вход выполнен: ${session.email || "твой аккаунт"}.` : "Продолжи через Google, чтобы включить синхронизацию.";
  content.append(statusLine);
  const actions = document.createElement("div"); actions.className = "modal-actions";
  const close = document.createElement("button"); close.type = "button"; close.className = "ghost"; close.textContent = "Закрыть";
  let pairingCancelled = false;
  close.addEventListener("click", () => { pairingCancelled = true; if (cooldownTimer) clearInterval(cooldownTimer); modalRoot.replaceChildren(); });
  const makeButton = (label, cls, fn) => {
    const button = document.createElement("button"); button.type = "button"; button.className = cls; button.textContent = label;
    button.addEventListener("click", fn); actions.append(button); return button;
  };
  let otpSent = getOtpCooldown(email.value) > 0;
  let sessionVerified = Boolean(getCloudSession());
  let cooldownTimer = null;
  const googleButton = makeButton("Продолжить с Google", "primary", () => { try { startGoogleOAuth({url:url.value,key:key.value,redirectTo:window.location.href.split("#")[0]}); } catch (error) { statusLine.textContent = error?.message || "Не удалось открыть Google."; } });
  const requestButton = makeButton("Войти по коду из письма", "ghost", () => void requestCode(false));
  const registerButton = makeButton("Создать аккаунт", "ghost", () => void requestCode(true));
  const verifyButton = makeButton("Подтвердить код и синхронизировать", "primary", () => void verifyCode());
  const qrButton = makeButton("Войти по QR с телефона", "ghost", () => void startQrSignIn());
  const syncButton = makeButton("Синхронизировать", "primary", () => void runSync());
  const profileSaveButton = makeButton("Сохранить профиль и синхронизировать", "primary", () => void saveProfileAndSync());
  const disconnectButton = makeButton("Выйти из аккаунта", "ghost", () => {
    disconnectCloud();
    statusLine.textContent = "Выход выполнен. Локальные сохранения остались на устройстве.";
    modalRoot.replaceChildren();
  });
  if (session) {
    form.hidden = true; advanced.hidden = true;
    email.parentElement.hidden = true; code.parentElement.hidden = true;
    googleButton.hidden = true; requestButton.hidden = true; registerButton.hidden = true; verifyButton.hidden = true; qrButton.hidden = true;
    profileWrap.hidden = Boolean(readLinkaProfile());
    profileSaveButton.hidden = Boolean(readLinkaProfile());
  } else {
    form.hidden = true; profileWrap.hidden = true; profileSaveButton.hidden = true;
    syncButton.hidden = true; disconnectButton.hidden = true;
    requestButton.hidden = true; registerButton.hidden = true; verifyButton.hidden = true;
  }
  actions.append(close); content.append(actions);
  modalShell(content, { dismissable: true });

  function setBusy(value) {
    [googleButton,requestButton,registerButton,verifyButton,qrButton,profileSaveButton,syncButton,disconnectButton].forEach(b => { b.disabled = value; });
  }
  function setCooldown() {
    const remaining = Math.ceil(getOtpCooldown(email.value) / 1000);
    requestButton.disabled = remaining > 0;
    registerButton.disabled = remaining > 0;
    if (remaining > 0) {
      requestButton.textContent = `Повторить через ${remaining} с`;
      registerButton.textContent = `Повторить через ${remaining} с`;
      otpSent = true;
    } else {
      requestButton.textContent = "Отправить код для входа";
      registerButton.textContent = "Создать аккаунт";
      if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
    }
  }
  async function requestCode(createUser) {
    try {
      setBusy(true);
      saveCloudConfig(url.value, key.value);
      statusLine.textContent = "Отправляем код…";
      await requestEmailOtp({url:url.value,key:key.value,email:email.value,createUser});
      otpSent = true;
      statusLine.textContent = "Код отправлен. Проверь входящие и папку «Спам». Код действует около двух минут.";
      setCooldown();
      if (cooldownTimer) clearInterval(cooldownTimer);
      cooldownTimer = setInterval(setCooldown, 1000);
      code.focus();
    } catch (error) {
      statusLine.textContent = error?.message || "Не удалось отправить код.";
    } finally { setBusy(false); setCooldown(); }
  }
  async function verifyCode() {
    if (!sessionVerified && !otpSent && getOtpCooldown(email.value) <= 0) {
      statusLine.textContent = "Сначала запроси код из письма.";
      return;
    }
    try {
      setBusy(true);
      saveCloudConfig(url.value,key.value);
      if (!sessionVerified) {
        statusLine.textContent = "Проверяем код…";
        await verifyEmailOtp({url:url.value,key:key.value,email:email.value,token:code.value});
        sessionVerified = true;
      }
      if (!String(displayName.value || "").trim()) {
        statusLine.textContent = "Вход выполнен. Укажи имя или псевдоним, чтобы завершить профиль.";
        displayName.focus();
        return;
      }
      saveLinkaProfile({
        displayName:String(displayName.value).trim().slice(0,60),
        age:age.value.trim() ? Math.max(1,Math.min(120,Number(age.value))) : null,
        updatedAt:Date.now()
      });
      const result = await syncNow({silent:true});
      statusLine.textContent = result?.message ? `Готово. ${result.message}` : "Вход выполнен.";
      form.hidden = true; profileWrap.hidden = true; advanced.hidden = true;
      requestButton.hidden = true; registerButton.hidden = true; verifyButton.hidden = true; qrButton.hidden = true;
      syncButton.hidden = false; disconnectButton.hidden = false;
      say("Linka синхронизирована");
    } catch (error) {
      statusLine.textContent = error?.message || "Не удалось подтвердить код.";
    } finally { setBusy(false); }
  }
  async function startQrSignIn() {
    let challenge;
    try {
      setBusy(true);
      saveCloudConfig(url.value,key.value);
      statusLine.textContent = "Создаём одноразовый QR-код…";
      challenge = await beginQrPairing({url:url.value,key:key.value});
      const uri = `linka://pair?id=${encodeURIComponent(challenge.id)}&secret=${encodeURIComponent(challenge.secret)}`;
      const dataUrl = await QRCode.toDataURL(uri, {
        width: 240, margin: 2, errorCorrectionLevel: "H",
        color: { dark: "#09090b", light: "#ffffff" }
      });
      const img = document.createElement("img");
      img.src = dataUrl; img.alt = "Одноразовый QR-код для входа в Linka";
      img.width = 240; img.height = 240;
      img.style.display = "block"; img.style.width = "min(240px, 100%)";
      img.style.height = "auto"; img.style.margin = "16px auto";
      img.style.borderRadius = "16px"; img.style.background = "#ffffff"; img.style.padding = "8px";
      content.insertBefore(img, statusLine);
      statusLine.textContent = "Открой Linka на телефоне, отсканируй QR-код и подтверди вход. Код действует 2 минуты.";
      while (!pairingCancelled && Date.now() < Date.parse(challenge.expiresAt)) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (pairingCancelled) return;
        const result = await claimQrPairing({id:challenge.id,secret:challenge.secret,url:url.value,key:key.value});
        if (result.pending) continue;
        sessionVerified = true;
        otpSent = true;
        code.value = "";
        statusLine.textContent = "Вход подтверждён. Заверши профиль, если это первый вход.";
        img.remove();
        if (!String(displayName.value || "").trim()) {
          displayName.focus();
          return;
        }
        await verifyCode();
        return;
      }
      img.remove();
      if (!pairingCancelled) statusLine.textContent = "QR-код истёк. Создай новый и попробуй ещё раз.";
    } catch (error) {
      statusLine.textContent = error?.message || "Не удалось выполнить вход по QR.";
    } finally { setBusy(false); }
  }
  async function saveProfileAndSync() {
    try {
      setBusy(true);
      saveLinkaProfile({
        displayName: String(displayName.value || "").trim(),
        age: age.value.trim() ? Number(age.value) : null,
        updatedAt: Date.now()
      });
      const result = await syncNow({silent:true});
      statusLine.textContent = result?.message ? `Профиль сохранён. ${result.message}` : "Профиль сохранён.";
      profileWrap.hidden = true; profileSaveButton.hidden = true;
      syncButton.hidden = false; disconnectButton.hidden = false;
      say("Профиль Linka сохранён");
    } catch (error) {
      statusLine.textContent = error?.message || "Не удалось сохранить профиль.";
    } finally { setBusy(false); }
  }
  async function runSync() {
    try {
      setBusy(true);
      const result = await syncNow({silent:true});
      statusLine.textContent = result?.message || "Синхронизация завершена.";
    } catch (error) { statusLine.textContent = error?.message || "Ошибка синхронизации."; }
    finally { setBusy(false); }
  }
}
async function checkWindowsInstaller(statusLine, downloadLink) {
  statusLine.textContent = "Проверитьing the latest Linka release…";
  downloadLink.hidden = true;
  try {
    const response = await fetch("https://api.github.com/repos/anarabbasov2010-eng/Linka/releases/latest", {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "Linka-Web" }
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}. Try again later.`);
    const release = await response.json();
    const tag = String(release.tag_name || "").replace(/^v/, "");
    const asset = (release.assets || []).find(item => item.name === "Linka-Windows-x64-setup.exe");
    if (!asset) {
      statusLine.textContent = "The Windows installer for this release is still being built. Проверить again shortly.";
      return;
    }
    downloadLink.href = asset.browser_download_url;
    downloadLink.hidden = false;
    downloadLink.textContent = desktopBuildVersion && compareVersions(tag, desktopBuildVersion) > 0
      ? `Скачать update ${tag}`
      : "Скачать Windows installer";
    if (desktopBuildVersion && compareVersions(tag, desktopBuildVersion) <= 0) {
      statusLine.textContent = `Приложение для Windows version ${desktopBuildVersion} is current. You can reinstall the latest installer over the existing copy.`;
    } else {
      statusLine.textContent = `Linka Windows ${tag} is available. Run the installer over your existing copy to update it.`;
    }
  } catch (error) {
    statusLine.textContent = error?.message || "Не удалось проверить обновления Windows.";
  }
}

function showНастройки() {
  const content=document.createElement("div");
  const head=document.createElement("div"); head.className="modal-head";
  const logo=document.createElement("img"); logo.className="modal-logo"; logo.src="/linka-mark.svg"; logo.alt="";
  const meta=document.createElement("div"); const title=document.createElement("h2"); title.textContent="Настройки";
  const sub=document.createElement("p"); sub.textContent="Настрой Linka под себя"; meta.append(title,sub); head.append(logo,meta); content.append(head);
  const themeRow=document.createElement("div"); themeRow.className="setting-row visual-theme-row";
  const themeMeta=document.createElement("div"); const themeTitle=document.createElement("strong"); themeTitle.textContent="Appearance";
  const themeDesc=document.createElement("p"); themeDesc.textContent="Выбери удобную цветовую тему"; themeMeta.append(themeTitle,themeDesc);
  const choices=document.createElement("div"); choices.className="theme-options"; choices.setAttribute("aria-label","Theme");
  [["dark","Тёмная"],["oled","OLED чёрная"],["light","Светлая"],["system","Системная"]].forEach(([value,label])=>{
    const b=document.createElement("button"); b.type="button"; b.className="theme-option"+(themeMode===value?" active":""); b.textContent=label;
    b.addEventListener("click",()=>{applyTheme(value);choices.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));});
    choices.append(b);
  });
  themeRow.append(themeMeta,choices); content.append(themeRow);
  function addChoiceSetting(titleText, descriptionText, options, selectedValue, onSelect, ariaLabel) {
    const row = document.createElement("div"); row.className = "setting-row visual-setting-row";
    const meta = document.createElement("div");
    const title = document.createElement("strong"); title.textContent = titleText;
    const description = document.createElement("p"); description.textContent = descriptionText;
    meta.append(title, description);
    const group = document.createElement("div"); group.className = "theme-options"; group.setAttribute("aria-label", ariaLabel || titleText);
    options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-option" + (selectedValue === option.value ? " active" : "");
      button.textContent = option.label;
      if (option.color) button.style.setProperty("--option-color", option.color);
      button.addEventListener("click", () => {
        onSelect(option.value);
        group.querySelectorAll("button").forEach(node => node.classList.toggle("active", node === button));
      });
      group.append(button);
    });
    row.append(meta, group); content.append(row);
  }
  addChoiceSetting("Акцентный цвет", "Выбери фирменный цвет интерфейса", [
    {value:"violet",label:"Violet",color:"#A99AFF"},
    {value:"blue",label:"Blue",color:"#8CB8FF"},
    {value:"mint",label:"Mint",color:"#8FE3CF"},
    {value:"rose",label:"Rose",color:"#FFB6D2"}
  ], localStorage.getItem("linka.accent") || "violet", setLinkaAccent, "Accent color");
  addChoiceSetting("Плотность интерфейса", "Больше пространства или больше содержимого", [
    {value:"compact",label:"Компактно"},
    {value:"standard",label:"Стандарт"},
    {value:"spacious",label:"Свободно"}
  ], localStorage.getItem("linka.density") || "standard", setLinkaDensity, "Interface density");
  addChoiceSetting("Интенсивность эффектов", "От спокойного режима до глубины и параллакса", [
    {value:"quiet",label:"Тихо"},
    {value:"balanced",label:"Баланс"},
    {value:"atmosphere",label:"Атмосфера"}
  ], localStorage.getItem("linka.effects") || "balanced", setLinkaEffects, "Visual effects intensity");
  const motionRow=document.createElement("div"); motionRow.className="setting-row";
  const motionMeta=document.createElement("div"); const mt=document.createElement("strong"); mt.textContent="Меньше анимации";
  const md=document.createElement("p"); md.textContent="Уменьшает движение и переходы интерфейса"; motionMeta.append(mt,md);
  const toggle=document.createElement("button"); toggle.type="button"; toggle.className="toggle"; toggle.setAttribute("aria-pressed",String(reduceMotion)); toggle.setAttribute("aria-label","Toggle reduced motion");
  const knob=document.createElement("span"); toggle.append(knob);
  toggle.addEventListener("click",()=>{reduceMotion=!reduceMotion;localStorage.setItem("linka.reduceMotion",String(reduceMotion));toggle.setAttribute("aria-pressed",String(reduceMotion));document.documentElement.classList.toggle("reduced-motion",reduceMotion);});
  motionRow.append(motionMeta,toggle);content.append(motionRow);
  if(reduceMotion)document.documentElement.classList.add("reduced-motion");
  const cloudRow=document.createElement("div"); cloudRow.className="setting-row";
  const cloudMeta=document.createElement("div");
  const cloudTitle=document.createElement("strong"); cloudTitle.textContent="Облачная синхронизация";
  const cloudDesc=document.createElement("p"); const cloudSession=getCloudSession();
  cloudDesc.textContent=cloudSession ? `Connected as ${cloudSession.email || "your account"} · ${cloudSyncStatus || "sync across your devices"}` : "Синхронизируй ссылки и заметки между Android, Windows и сайтом";
  cloudMeta.append(cloudTitle,cloudDesc);
  const cloudButton=document.createElement("button"); cloudButton.type="button"; cloudButton.className="ghost"; cloudButton.textContent=cloudSession?"Manage":"Set up";
  cloudButton.addEventListener("click",()=>{modalRoot.replaceChildren();showCloudSyncНастройки();});
  cloudRow.append(cloudMeta,cloudButton);content.append(cloudRow);

  const windowsRow=document.createElement("div"); windowsRow.className="setting-row";
  const windowsMeta=document.createElement("div");
  const windowsTitle=document.createElement("strong"); windowsTitle.textContent="Приложение для Windows";
  const windowsDesc=document.createElement("p"); windowsDesc.textContent=desktopBuildVersion ? `Installed version ${desktopBuildVersion}. Updates install over the existing app.` : "Проверить the latest Windows installer or update your existing desktop app.";
  windowsMeta.append(windowsTitle,windowsDesc);
  const windowsControls=document.createElement("div"); windowsControls.className="windows-update-controls";
  const windowsПроверить=document.createElement("button"); windowsПроверить.type="button"; windowsПроверить.className="ghost"; windowsПроверить.textContent="Проверить";
  const windowsСкачать=document.createElement("a"); windowsСкачать.className="primary"; windowsСкачать.textContent="Скачать"; windowsСкачать.target="_blank"; windowsСкачать.rel="noopener noreferrer"; windowsСкачать.hidden=true;
  windowsControls.append(windowsПроверить,windowsСкачать);
  windowsRow.append(windowsMeta,windowsControls);content.append(windowsRow);
  const windowsStatus=document.createElement("p"); windowsStatus.className="cloud-status"; windowsStatus.textContent="Проверить release status before downloading an installer.";
  content.append(windowsStatus);
  windowsПроверить.addEventListener("click",()=>{void checkWindowsInstaller(windowsStatus,windowsСкачать);});

  const agreementRow=document.createElement("div"); agreementRow.className="setting-row";
  const am=document.createElement("div"); const at=document.createElement("strong");at.textContent="Пользовательское соглашение";const ap=document.createElement("p");ap.textContent="Review the local-storage and privacy terms";am.append(at,ap);
  const view=document.createElement("button");view.type="button";view.className="ghost";view.textContent="Читать условия";
  view.addEventListener("click",()=>{modalRoot.replaceChildren();showAgreement({mustAccept:false});});
  agreementRow.append(am,view);content.append(agreementRow);
  const actions=document.createElement("div");actions.className="modal-actions";const close=document.createElement("button");close.type="button";close.className="primary";close.textContent="Готово";close.addEventListener("click",()=>modalRoot.replaceChildren());actions.append(close);content.append(actions);
  const layer=modalShell(content,{dismissable:true});
  const priorFocus=document.activeElement;
  layer.querySelector("button")?.focus();
}
draft.addEventListener("input",()=>{saveButton.disabled=!draft.value.trim();});
draft.addEventListener("keydown",event=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"&&draft.value.trim()){event.preventDefault();form.requestSubmit();}});
form.addEventListener("submit",event=>{
  event.preventDefault();const text=draft.value.trim();if(!text)return;
  const existing=editingId?captures.find(item=>item.id===editingId):null;
  if(existing){captures=captures.map(item=>item.id===editingId?{...item,text:text.slice(0,100000),updatedAt:Date.now()}:item);say("Запись обновлена");}
  else{captures.unshift(makeCapture(text));say("Сохранено на этом устройстве");window.dispatchEvent(new CustomEvent("linka:capture-saved",{detail:{title:"Saved to Linka",body:text.slice(0,140)}}));}
  persist();resetEditor();render();
});
search.addEventListener("input",render);
filters.forEach(button=>button.addEventListener("click",()=>{
  activeFilter=button.dataset.filter;filters.forEach(item=>item.classList.toggle("active",item===button));render();
}));
selectionButton.addEventListener("click", () => {
  selectionMode = !selectionMode;
  selectedIds.clear();
  render();
  if (selectionMode) say("Select the items you want to manage together");
});
bulkToolbar.addEventListener("click", async event => {
  const button = event.target.closest("button[data-bulk-action]");
  if (!button) return;
  const action = button.dataset.bulkAction;
  const selected = captures.filter(item => selectedIds.has(item.id));
  if (action === "select-visible") {
    visibleCaptures(captures, activeFilter, search.value).forEach(item => selectedIds.add(item.id));
    render(); return;
  }
  if (action === "clear") { selectedIds.clear(); selectionMode = false; render(); return; }
  if (!selected.length) { say("Select at least one item first"); return; }
  if (action === "pin" || action === "unpin") {
    const pinned = action === "pin";
    const now = Date.now();
    captures = captures.map(item => selectedIds.has(item.id) ? { ...item, pinned, updatedAt: now } : item);
    persist(); render(); say(pinned ? "Selected items pinned" : "Selected items unpinned"); return;
  }
  if (action === "copy") {
    const value = selected.map(item => item.text).join("\n\n");
    try { await navigator.clipboard.writeText(value); say("Copied " + selected.length + " selected item(s)"); }
    catch {
      const fallback = document.createElement("textarea");
      fallback.value = value; fallback.setAttribute("readonly", ""); fallback.style.position = "fixed";
      fallback.style.opacity = "0"; document.body.append(fallback); fallback.select();
      const copied = (() => { try { return document.execCommand("copy"); } catch { return false; } })();
      fallback.remove();
      say(copied ? "Copied " + selected.length + " selected item(s)" : "Clipboard access is unavailable in this window");
    }
    return;
  }
  if (action === "export") {
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl; anchor.download = "linka-selection.json"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    say("Exported " + selected.length + " selected item(s)"); return;
  }
  if (action === "delete") {
    if (!window.confirm("Delete " + selected.length + " selected item(s)? This cannot be undone from this dialog.")) return;
    selected.forEach(item => addDeletedId(item.id));
    captures = captures.filter(item => !selectedIds.has(item.id));
    selectedIds.clear(); selectionMode = false;
    if (editingId && !captures.some(item => item.id === editingId)) resetEditor();
    persist(); render(); say("Selected items deleted");
  }
});
list.addEventListener("click",async event=>{
  const button=event.target.closest("button[data-action]");if(!button)return;
  const {action,id}=button.dataset;
  if (action === "select") {
    selectionMode = true;
    if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
    render(); return;
  }
  const item=captures.find(entry=>entry.id===id);if(!item)return;
  if(action==="expand"){if(expandedCards.has(id))expandedCards.delete(id);else expandedCards.add(id);render();}
  else if(action==="pin"){captures=captures.map(entry=>entry.id===id?{...entry,pinned:!entry.pinned,updatedAt:Date.now()}:entry);persist();render();say(item.pinned?"Откреплено":"Закреплено");}
  else if(action==="delete"){
    addDeletedId(id);
    captures=captures.filter(entry=>entry.id!==id);
    if(editingId===id)resetEditor();
    persist();render();say("Запись удалена");
    window.dispatchEvent(new CustomEvent("linka:toast", { detail: {
      message: "Запись удалена",
      actionLabel: "Отменить",
      onAction: () => {
        const deleted = readDeletedIds();
        deleted.delete(id);
        try { localStorage.setItem("linka.deletedIds.v1", JSON.stringify(Array.from(deleted))); } catch {}
        captures = [...captures.filter(entry => entry.id !== id), item].sort((a,b) => b.updatedAt - a.updatedAt).slice(0,1000);
        persist(); render(); say("Удаление отменено");
      }
    }}));
  }
  else if(action==="edit"){editingId=id;draft.value=item.text;composeLabel.textContent="Edit capture";saveButton.textContent="Save changes ↗";saveButton.disabled=false;draft.focus();window.scrollTo({top:0,behavior:"smooth"});}
  else if(action==="copy"){try{await navigator.clipboard.writeText(item.text);say("Скопировано");}catch{draft.value=item.text;draft.focus();draft.select();say("Text selected for manual copying");}}
});
$("#export-button").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(captures,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="linka-inbox.json";anchor.click();URL.revokeObjectURL(url);say("Резервная копия создана");
});
$("#import-button").addEventListener("click",()=>$("#import-file").click());
$("#import-file").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{const parsed=JSON.parse(await file.text());const imported=Array.isArray(parsed)?parsed:parsed.captures;if(!Array.isArray(imported))throw new Error("Invalid file");
    const normalized=imported.map(item=>makeCapture(item.text,item)).filter(Boolean);const restoredIds=new Set(normalized.map(item=>item.id));const deleted=readDeletedIds();restoredIds.forEach(id=>deleted.delete(id));try{localStorage.setItem("linka.deletedIds.v1",JSON.stringify(Array.from(deleted)));}catch{}const map=new Map(captures.map(item=>[item.id,item]));normalized.forEach(item=>map.set(item.id,item));
    captures=Array.from(map.values()).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,1000);persist();render();say("Imported "+normalized.length+" capture(s)");
  }catch{say("Этот файл не похож на экспорт Linka");}finally{event.target.value="";}
});
$("#settings-button").addEventListener("click",showНастройки);
$("#search-space-button").addEventListener("click",()=>showSearchSpace(search.value));
document.addEventListener("keydown",event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
    event.preventDefault();showSearchSpace(search.value);
  }
  if(event.key==="/"&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!(event.target instanceof HTMLInputElement)&&!(event.target instanceof HTMLTextAreaElement)){
    event.preventDefault();showSearchSpace("");
  }
});
document.documentElement.classList.toggle("reduced-motion",reduceMotion);
render();
if(getCloudSession()) setTimeout(() => { void syncNow({ silent: true }).catch(() => {}); }, 1200);
function refreshCloudIfDue() {
  if (document.hidden || !getCloudSession() || Date.now() - lastCloudRefreshAt < 15000) return;
  lastCloudRefreshAt = Date.now();
  void syncNow({ silent: true }).catch(() => {});
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshCloudIfDue(); });
window.addEventListener("focus", refreshCloudIfDue);
setInterval(refreshCloudIfDue, 60000);
if(localStorage.getItem("linka.termsAccepted")!==TERMS_VERSION)showAgreement({mustAccept:true});
window.addEventListener("linka:authenticated", () => {
  if (getCloudSession()) void syncNow({ silent: true }).catch(error => say(error?.message || "Sync unavailable"));
});
window.addEventListener("linka:profile-saved", () => {
  if (getCloudSession()) void syncNow({ silent: true }).catch(error => say(error?.message || "Sync unavailable"));
});
void completeGoogleOAuthCallback().then(session => {
  if (!session) return;
  window.dispatchEvent(new CustomEvent("linka:oauth-complete", { detail: session }));
}).catch(error => {
  say(error?.message || "Google sign-in could not be completed.");
});
initLinkaExperience();
window.addEventListener("linka:appearance-theme", event => {
  const mode = event.detail?.theme;
  if (["dark", "oled", "light", "system"].includes(mode)) applyTheme(mode);
});
initVisualSystem();
