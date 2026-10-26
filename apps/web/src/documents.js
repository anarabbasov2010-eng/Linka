import { linkaFilename, normalizeLinkaDocument, parseLinkaDocument, serializeLinkaDocument } from "./linka-format.js";
import { readEmergencyDocumentDraft, writeEmergencyDocumentDraft, clearEmergencyDocumentDraft, clearEmergencyDocumentDraftIfMatches } from "./document-recovery.js";
import { renderMarkdownToHtml } from "./markdown-preview.js";

const DB_NAME = "linka-documents-v1";
const STORE_NAME = "documents";
const MAX_RECENT = 8;
const labels = {
  ru: { documents: "Текстовые документы", newDoc: "Новый документ", open: "Открыть .linka", save: "Сохранить .linka", saved: "Черновик сохранён на этом устройстве", unsaved: "Есть несохранённые изменения", saving: "Сохраняем…", savedAt: "Сохранено в {time}", recoverFound: "Найден несохранённый черновик «{title}». Можно восстановить его или удалить.", restoreDraft: "Восстановить черновик", discardDraft: "Удалить черновик", discardDraftConfirm: "Удалить несохранённый черновик? Это действие нельзя отменить.", draftDiscarded: "Несохранённый черновик удалён.", draftRecovered: "Несохранённый черновик восстановлен и сохранён.", failed: "Не удалось сохранить черновик", untitled: "Новый документ", placeholder: "Начни писать…", close: "Закрыть", recent: "Недавние документы", local: "Локально · не отправляется в облако", openFailed: "Не удалось открыть файл .linka", fileSaved: "Файл .linka подготовлен", content: "Текст документа", title: "Название документа", help: "Файл можно открыть в Linka на другом устройстве.", previewMarkdown: "Предпросмотр Markdown", editMarkdown: "Вернуться к редактированию", previewLabel: "Предпросмотр Markdown-документа", },
  en: { documents: "Text documents", newDoc: "New document", open: "Open .linka", save: "Save .linka", saved: "Draft saved on this device", unsaved: "Unsaved changes", saving: "Saving…", savedAt: "Saved at {time}", recoverFound: "An unsaved draft “{title}” was found. Restore or discard it.", restoreDraft: "Restore draft", discardDraft: "Discard draft", discardDraftConfirm: "Discard this unsaved draft? This cannot be undone.", draftDiscarded: "Unsaved draft discarded.", draftRecovered: "Unsaved draft restored and saved.", failed: "Could not save draft", untitled: "New document", placeholder: "Start writing…", close: "Close", recent: "Recent documents", local: "Local only · not sent to cloud sync", openFailed: "Could not open this .linka file", fileSaved: ".linka file prepared", content: "Document text", title: "Document title", help: "Open this file in Linka on another device.", previewMarkdown: "Preview Markdown", editMarkdown: "Edit Markdown", previewLabel: "Markdown document preview", },
  az: { documents: "Mətn sənədləri", newDoc: "Yeni sənəd", open: ".linka aç", save: ".linka saxla", saved: "Qaralama bu cihazda saxlanıldı", unsaved: "Saxlanmamış dəyişikliklər var", saving: "Saxlanılır…", savedAt: "{time} vaxtı saxlanıldı", recoverFound: "Saxlanmamış “{title}” qaralaması tapıldı. Onu bərpa et və ya sil.", restoreDraft: "Qaralamanı bərpa et", discardDraft: "Qaralamanı sil", discardDraftConfirm: "Saxlanmamış qaralama silinsin? Bu əməliyyat geri qaytarılmır.", draftDiscarded: "Saxlanmamış qaralama silindi.", draftRecovered: "Qaralama bərpa edildi və saxlanıldı.", failed: "Qaralamanı saxlamaq olmadı", untitled: "Yeni sənəd", placeholder: "Yazmağa başla…", close: "Bağla", recent: "Son sənədlər", local: "Yalnız cihazda · buludla paylaşılmır", openFailed: ".linka faylını açmaq olmadı", fileSaved: ".linka faylı hazırdır", content: "Sənədin mətni", title: "Sənədin adı", help: "Bu faylı başqa cihazda Linka ilə aça bilərsən.", previewMarkdown: "Markdown önbaxış", editMarkdown: "Redaktəyə qayıt", previewLabel: "Markdown sənədinin önbaxışı", },
  tr: { documents: "Metin belgeleri", newDoc: "Yeni belge", open: ".linka aç", save: ".linka kaydet", saved: "Taslak bu cihazda kaydedildi", unsaved: "Kaydedilmemiş değişiklikler", saving: "Kaydediliyor…", savedAt: "Kaydedildi · {time}", recoverFound: "Kaydedilmemiş “{title}” taslağı bulundu. Geri yükleyebilir veya silebilirsin.", restoreDraft: "Taslağı geri yükle", discardDraft: "Taslağı sil", discardDraftConfirm: "Kaydedilmemiş taslak silinsin mi? Bu işlem geri alınamaz.", draftDiscarded: "Kaydedilmemiş taslak silindi.", draftRecovered: "Taslak geri yüklendi ve kaydedildi.", failed: "Taslak kaydedilemedi", untitled: "Yeni belge", placeholder: "Yazmaya başla…", close: "Kapat", recent: "Son belgeler", local: "Yalnızca cihazda · bulut eşitlemesine gönderilmez", openFailed: ".linka dosyası açılamadı", fileSaved: ".linka dosyası hazır", content: "Belge metni", title: "Belge başlığı", help: "Bu dosyayı başka bir cihazda Linka ile açabilirsin.", previewMarkdown: "Markdown önizleme", editMarkdown: "Düzenlemeye dön", previewLabel: "Markdown belge önizlemesi", }
};
let initialized = false;
let dbPromise = null;
let overlay = null;
let currentDocument = null;
let titleField = null;
let bodyField = null;
let markdownPreviewPane = null;
let markdownPreviewButton = null;
let markdownBodyLabel = null;
let markdownPreviewMode = false;
let statusLine = null;
let recentList = null;
let saveTimer = 0;
let animationTimer = 0;
let editRevision = 0;
let lastSavedAt = 0;
let previousFocus = null;
let inputPicker = null;
let suppressSaveOnInput = false;
let recoveryBanner = null;
let recoveryNotice = null;
let recoveryDraftCandidate = null;
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || document.documentElement.classList.contains("reduced-motion");
const uid = () => globalThis.crypto?.randomUUID?.() || ("doc-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9));
const lang = () => {
  const v = (localStorage.getItem("linka.language.v1") || document.documentElement.lang || "ru").toLowerCase().slice(0, 2);
  return labels[v] ? v : "ru";
};
const t = key => labels[lang()][key] || labels.ru[key] || key;

function setMarkdownPreviewMode(enabled) {
  if (!markdownPreviewPane || !markdownPreviewButton || !markdownBodyLabel) return;
  markdownPreviewMode = Boolean(enabled);
  if (markdownPreviewMode) {
    markdownPreviewPane.innerHTML = renderMarkdownToHtml(bodyField?.value || "");
    markdownPreviewPane.hidden = false;
    markdownBodyLabel.hidden = true;
    markdownPreviewPane.setAttribute("aria-label", t("previewLabel"));
    markdownPreviewButton.textContent = t("editMarkdown");
    markdownPreviewButton.setAttribute("aria-label", t("editMarkdown"));
    markdownPreviewButton.setAttribute("aria-pressed", "true");
  } else {
    markdownPreviewPane.hidden = true;
    markdownBodyLabel.hidden = false;
    markdownPreviewButton.textContent = t("previewMarkdown");
    markdownPreviewButton.setAttribute("aria-label", t("previewMarkdown"));
    markdownPreviewButton.setAttribute("aria-pressed", "false");
  }
}

function addStyles() {
  if (document.getElementById("linka-documents-styles")) return;
  const style = document.createElement("style");
  style.id = "linka-documents-styles";
  style.textContent = `
    :root { --linka-forest:#101814; --linka-forest-raised:#1d2a20; --linka-paper:#e8dfc8; --linka-brass:#b59a69; --linka-sage:#7d8a72; }
    .linka-doc-trigger { position:relative; display:inline-grid; place-items:center; }
    .linka-doc-trigger svg { width:18px; height:18px; }
    .linka-doc-overlay { position:fixed; inset:0; z-index:10050; display:grid; place-items:center; padding:clamp(10px,3vw,28px); background:rgba(4,9,6,.12); opacity:0; backdrop-filter:blur(0); transition:opacity .44s ease,background .44s ease,backdrop-filter .44s ease; }
    .linka-doc-overlay.is-open { opacity:1; background:rgba(4,9,6,.76); backdrop-filter:blur(17px) saturate(.8); }
    .linka-doc-window { width:min(920px,100%); max-height:min(92dvh,1000px); overflow:hidden; display:flex; flex-direction:column; border:1px solid rgba(181,154,105,.38); border-radius:25px; color:var(--linka-paper); background:linear-gradient(152deg,rgba(31,45,34,.985),rgba(10,16,12,.99) 72%); box-shadow:0 34px 115px rgba(0,0,0,.52),inset 0 1px rgba(255,255,255,.045); transform:translateY(16px) scale(.985); filter:blur(4px); transition:transform .55s cubic-bezier(.2,.8,.2,1),filter .55s,box-shadow .4s; }
    .linka-doc-overlay.is-open .linka-doc-window { transform:translateY(0) scale(1); filter:blur(0); }
    .linka-doc-header { display:flex; align-items:center; gap:14px; padding:18px 21px 15px; border-bottom:1px solid rgba(232,223,200,.11); }
    .linka-doc-mark { flex:0 0 42px; width:42px; height:42px; display:grid; place-items:center; border:1px solid rgba(181,154,105,.38); border-radius:15px; color:var(--linka-brass); background:linear-gradient(145deg,rgba(181,154,105,.18),rgba(16,24,20,.5)); }
    .linka-doc-mark svg { width:22px; height:22px; }
    .linka-doc-headcopy { flex:1; min-width:0; }
    .linka-doc-headcopy h2 { margin:0; color:var(--linka-paper); font-family:"Palatino Linotype","Book Antiqua",Georgia,serif; font-size:clamp(20px,3vw,27px); font-weight:500; letter-spacing:-.035em; }
    .linka-doc-headcopy p { margin:5px 0 0; color:#aeb7a7; font-size:11px; line-height:1.55; }
    .linka-doc-actions { display:flex; flex-wrap:wrap; gap:8px; padding:12px 21px; border-bottom:1px solid rgba(232,223,200,.08); }
    .linka-doc-btn { min-height:38px; padding:9px 13px; border:1px solid rgba(181,154,105,.25); border-radius:12px; color:var(--linka-paper); background:rgba(232,223,200,.045); font:500 12px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; cursor:pointer; transition:background .23s,border-color .23s,transform .23s; }
    .linka-doc-btn:hover { background:rgba(181,154,105,.15); border-color:rgba(181,154,105,.55); }
    .linka-doc-btn:active { transform:scale(.985); }
    .linka-doc-btn.primary { color:#13180f; background:var(--linka-brass); border-color:transparent; }
    .linka-doc-btn.primary:hover { background:#c8b184; }
    .linka-doc-btn:focus-visible,.linka-doc-title:focus-visible,.linka-doc-body:focus-visible { outline:2px solid #d7c39a; outline-offset:3px; }
    .linka-doc-fields { display:flex; flex-direction:column; gap:12px; min-height:0; padding:16px 21px 10px; }
    .linka-doc-markdown-preview { box-sizing:border-box; width:100%; min-height:220px; max-height:45vh; overflow:auto; padding:17px; border:1px solid rgba(232,223,200,.14); border-radius:15px; color:#e8dfc8; background:rgba(4,10,6,.28); font:400 15px/1.86 "Palatino Linotype","Book Antiqua",Georgia,serif; overflow-wrap:anywhere; }
    .linka-doc-markdown-preview[hidden] { display:none; }
    .linka-doc-markdown-preview > :first-child { margin-top:0; }
    .linka-doc-markdown-preview > :last-child { margin-bottom:0; }
    .linka-doc-markdown-preview h1,.linka-doc-markdown-preview h2,.linka-doc-markdown-preview h3,.linka-doc-markdown-preview h4 { color:#f0e8d7; line-height:1.35; letter-spacing:-.02em; }
    .linka-doc-markdown-preview h1 { font-size:1.7em; }
    .linka-doc-markdown-preview h2 { font-size:1.4em; }
    .linka-doc-markdown-preview h3 { font-size:1.18em; }
    .linka-doc-markdown-preview p { margin:.7em 0; }
    .linka-doc-markdown-preview ul,.linka-doc-markdown-preview ol { padding-left:1.6em; margin:.6em 0; }
    .linka-doc-markdown-preview li { padding-left:.12em; }
    .linka-doc-markdown-preview blockquote { margin:.8em 0; padding:.1em .9em; border-left:3px solid var(--linka-brass); color:#c8c4b4; }
    .linka-doc-markdown-preview code { padding:.12em .32em; border-radius:5px; background:rgba(232,223,200,.1); font: .88em/1.6 ui-monospace,SFMono-Regular,Consolas,monospace; }
    .linka-doc-markdown-preview pre { overflow:auto; padding:13px; border:1px solid rgba(232,223,200,.12); border-radius:11px; background:rgba(0,0,0,.22); }
    .linka-doc-markdown-preview pre code { padding:0; background:transparent; }
    .linka-doc-markdown-preview a { color:#d9c18e; text-decoration:underline; text-underline-offset:3px; }
    .linka-doc-markdown-preview hr { border:0; border-top:1px solid rgba(232,223,200,.18); margin:1em 0; }
    .linka-doc-markdown-preview .linka-md-task { display:flex; align-items:baseline; gap:8px; list-style:none; margin-left:-1.35em; }
    .linka-doc-markdown-preview .linka-md-task input { accent-color:var(--linka-brass); }
    :root[data-color-scheme="light"] .linka-doc-markdown-preview { color:var(--text)!important; background:color-mix(in srgb,var(--bg) 62%,var(--panel-solid))!important; border-color:var(--line)!important; }
    :root[data-color-scheme="light"] .linka-doc-markdown-preview h1,:root[data-color-scheme="light"] .linka-doc-markdown-preview h2,:root[data-color-scheme="light"] .linka-doc-markdown-preview h3,:root[data-color-scheme="light"] .linka-doc-markdown-preview h4 { color:var(--text)!important; }
    :root[data-color-scheme="light"] .linka-doc-markdown-preview a { color:var(--accent)!important; }
    @media(max-width:600px) { .linka-doc-markdown-preview { min-height:190px; max-height:38vh; padding:13px; } }
    .linka-doc-label { display:block; color:#c1c8ba; font-size:10px; font-weight:650; letter-spacing:.09em; text-transform:uppercase; }
    .linka-doc-title { width:100%; margin-top:7px; padding:12px 14px; border:1px solid rgba(232,223,200,.15); border-radius:12px; outline:none; color:#f0e8d7; background:rgba(4,10,6,.28); font:500 18px/1.35 "Palatino Linotype","Book Antiqua",Georgia,serif; }
    .linka-doc-body-wrap { position:relative; flex:1; min-height:220px; max-height:45vh; overflow:hidden; border:1px solid rgba(232,223,200,.14); border-radius:15px; background:rgba(4,10,6,.28); }
    .linka-doc-type-mirror,.linka-doc-body { box-sizing:border-box; width:100%; min-height:220px; max-height:45vh; margin:0; padding:17px 17px 20px; border:0; border-radius:15px; font:400 15px/1.86 "Palatino Linotype","Book Antiqua",Georgia,serif; letter-spacing:.008em; white-space:pre-wrap; overflow-wrap:anywhere; tab-size:4; }
    .linka-doc-type-mirror { position:absolute; inset:0; overflow:auto; pointer-events:none; color:#e8dfc8; z-index:0; }
    .linka-doc-body { position:relative; z-index:1; display:block; resize:vertical; outline:none; color:transparent; -webkit-text-fill-color:transparent; caret-color:#d3bd8c; background:transparent; }
    .linka-doc-body-wrap.plain-text-mode .linka-doc-type-mirror { display:none; }
    .linka-doc-body-wrap.plain-text-mode .linka-doc-body { color:#e8dfc8; -webkit-text-fill-color:#e8dfc8; }
    .linka-doc-body-wrap.plain-text-mode .linka-doc-body::selection { color:#111; -webkit-text-fill-color:#111; }
    .linka-doc-body::selection { background:rgba(181,154,105,.32); color:transparent; }
    .linka-doc-letter { display:inline; animation:linka-doc-letter-in .2s cubic-bezier(.2,.8,.2,1) both; }
    .linka-doc-gone { display:inline; animation:linka-doc-letter-out .19s ease both; }
    @keyframes linka-doc-letter-in { from {opacity:0;filter:blur(2px);transform:translateY(2px)} to {opacity:1;filter:blur(0);transform:translateY(0)} }
    @keyframes linka-doc-letter-out { from {opacity:.88;filter:blur(0)} to {opacity:0;filter:blur(2px)} }
    .linka-doc-footer { display:flex; align-items:center; flex-wrap:wrap; gap:8px 14px; padding:10px 21px 16px; color:#aeb7a7; font-size:10px; line-height:1.6; }
    .linka-doc-recovery { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:12px 14px; border:1px solid rgba(181,154,105,.45); border-radius:13px; background:rgba(181,154,105,.09); }
    .linka-doc-recovery[hidden] { display:none; }
    .linka-doc-recovery p { margin:0; color:var(--linka-paper); font-size:11px; line-height:1.55; flex:1 1 220px; }
    .linka-doc-recovery-actions { display:flex; flex-wrap:wrap; gap:7px; }
    .linka-doc-recovery-actions .linka-doc-btn { min-height:34px; padding:7px 10px; font-size:11px; }
    .linka-doc-footer-status { flex:1 1 170px; color:#c6b78e; }
    .linka-doc-recent { padding:0 21px 15px; }
    .linka-doc-recent h3 { margin:0 0 8px; color:#b7c0ad; font-size:10px; font-weight:650; letter-spacing:.11em; text-transform:uppercase; }
    .linka-doc-recent-list { display:flex; gap:7px; flex-wrap:wrap; max-height:74px; overflow:auto; }
    .linka-doc-recent-item { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:7px 10px; border:1px solid rgba(232,223,200,.1); border-radius:9px; color:#c6ccb9; background:rgba(232,223,200,.04); font-size:10px; cursor:pointer; }
    .linka-doc-recent-item:hover { border-color:rgba(181,154,105,.5); background:rgba(181,154,105,.11); }
    .linka-doc-error { color:#f2b8a8; }
    @media(max-width:600px) { .linka-doc-window { max-height:94dvh; border-radius:19px; } .linka-doc-header { padding:14px 14px 12px; } .linka-doc-actions,.linka-doc-fields { padding-left:14px; padding-right:14px; } .linka-doc-actions { gap:6px; } .linka-doc-btn { flex:1 1 auto; padding:9px 10px; } .linka-doc-recent,.linka-doc-footer { padding-left:14px; padding-right:14px; } .linka-doc-body-wrap,.linka-doc-type-mirror,.linka-doc-body { min-height:190px; max-height:38vh; } }
    @media(prefers-reduced-motion:reduce) { .linka-doc-overlay,.linka-doc-window,.linka-doc-btn { transition:none!important; } .linka-doc-letter,.linka-doc-gone { animation:none!important; } }
    html.reduced-motion .linka-doc-overlay,html.reduced-motion .linka-doc-window,html.reduced-motion .linka-doc-btn { transition:none!important; }
    html.reduced-motion .linka-doc-letter,html.reduced-motion .linka-doc-gone { animation:none!important; }
    .top-actions #linka-document-button { border-color:rgba(181,154,105,.28); }
    :root[data-color-scheme="light"] .linka-doc-window {
      color:var(--text)!important;background:var(--panel-solid)!important;border-color:var(--line-strong)!important;
      box-shadow:0 28px 90px rgba(35,31,24,.16),inset 0 1px rgba(255,255,255,.85)!important;
    }
    :root[data-color-scheme="light"] .linka-doc-headcopy p,
    :root[data-color-scheme="light"] .linka-doc-label,
    :root[data-color-scheme="light"] .linka-doc-footer,
    :root[data-color-scheme="light"] .linka-doc-recent h3 { color:var(--muted)!important; }
    :root[data-color-scheme="light"] .linka-doc-title,
    :root[data-color-scheme="light"] .linka-doc-body-wrap,
    :root[data-color-scheme="light"] .linka-doc-recent-item {
      color:var(--text)!important;background:color-mix(in srgb,var(--bg) 62%,var(--panel-solid))!important;
      border-color:var(--line)!important;
    }
    :root[data-color-scheme="light"] .linka-doc-title { -webkit-text-fill-color:var(--text)!important; }
    :root[data-color-scheme="light"] .linka-doc-body { caret-color:var(--accent)!important; }
    :root[data-color-scheme="light"] .linka-doc-type-mirror { color:var(--text)!important; }
    :root[data-color-scheme="light"] .linka-doc-body-wrap.plain-text-mode .linka-doc-body {
      color:var(--text)!important;-webkit-text-fill-color:var(--text)!important;
    }
    :root[data-color-scheme="light"] .linka-doc-btn {
      color:var(--text)!important;background:var(--panel-raised)!important;border-color:var(--line-strong)!important;
    }
    :root[data-color-scheme="light"] .linka-doc-btn.primary {
      color:var(--accent-text)!important;background:var(--accent)!important;border-color:transparent!important;
    }
  `;
  document.head.append(style);
}

function openDatabase() {
  if (!("indexedDB" in window)) return Promise.resolve(null);
  return new Promise(resolve => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}
function database() {
  if (!dbPromise) dbPromise = openDatabase();
  return dbPromise;
}
let beforeDocumentSave = null;
export function setLinkaDocumentBeforeSave(handler) {
  beforeDocumentSave = typeof handler === "function" ? handler : null;
}
async function storeDocument(document) {
  const normalized = normalizeLinkaDocument(document);
  // An optional callback may write a prior-state snapshot. Snapshot failures
  // must never block the user's document autosave.
  try { await beforeDocumentSave?.(normalized); }
  catch (error) { console.warn("Could not snapshot before document save", error); }
  const db = await database();
  if (db) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const request = tx.objectStore(STORE_NAME).put(normalized);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error || new Error("storage-error"));
      tx.onabort = () => reject(tx.error || new Error("storage-error"));
    });
    return normalized;
  }
  const key = "linka.documents.fallback.v1";
  try {
    const list = JSON.parse(localStorage.getItem(key) || "[]").filter(item => item && typeof item.id === "string" && item.id !== normalized.id);
    list.unshift(normalized);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 12)));
    return normalized;
  } catch {
    throw new Error("storage-unavailable");
  }
}
export async function exportLinkaDocuments() {
  const documents = await listDocuments();
  return documents
    .filter(item => item && typeof item.id === "string" && typeof item.text === "string")
    .map(item => normalizeLinkaDocument(item))
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
}

/**
 * Merge portable documents by ID. IndexedDB writes happen in one transaction,
 * so a quota/storage failure aborts the entire document import batch.
 */
export async function importLinkaDocuments(values = []) {
  if (!Array.isArray(values)) throw new TypeError("Documents must be an array.");
  const normalized = values
    .filter(item => item && typeof item === "object" && typeof item.text === "string")
    .map(item => normalizeLinkaDocument(item))
    .filter(item => item.id && item.text.length <= 5_000_000);
  if (!normalized.length) return { imported: 0, skipped: values.length };

  const db = await database();
  if (db) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const item of normalized) store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Could not import local documents."));
      tx.onabort = () => reject(tx.error || new Error("Document import was rolled back."));
    });
    return { imported: normalized.length, skipped: values.length - normalized.length };
  }

  // The legacy localStorage fallback is intentionally bounded. Do not claim
  // full import success if it cannot retain the entire set of documents.
  const key = "linka.documents.fallback.v1";
  let existing = [];
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(value)) existing = value;
  } catch {}
  const map = new Map(existing.filter(item => item && typeof item.id === "string").map(item => [item.id, item]));
  normalized.forEach(item => map.set(item.id, item));
  const all = [...map.values()].sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  const retained = all.slice(0, 12);
  localStorage.setItem(key, JSON.stringify(retained));
  const retainedIds = new Set(retained.map(item => item.id));
  const imported = normalized.filter(item => retainedIds.has(item.id)).length;
  return { imported, skipped: values.length - imported };
}

export async function searchLinkaDocuments(query = "", limit = 20) {
  const needle = String(query || "").trim().replace(/^"|"$/g, "").toLocaleLowerCase();
  if (needle.length < 2 || needle.includes(":")) return [];
  const documents = await listDocuments();
  const matches = [];
  for (let index = 0; index < documents.length; index++) {
    const item = documents[index];
    const title = String(item.title || "");
    const text = String(item.text || "");
    const titleMatch = title.toLocaleLowerCase().includes(needle);
    const textPosition = titleMatch ? -1 : text.toLocaleLowerCase().indexOf(needle);
    if (titleMatch || textPosition >= 0) {
      const excerptStart = textPosition >= 0 ? Math.max(0, textPosition - 72) : 0;
      const excerptEnd = textPosition >= 0 ? Math.min(text.length, textPosition + needle.length + 110) : Math.min(text.length, 160);
      matches.push({
        id: String(item.id),
        title: title || t("untitled"),
        updatedAt: Number(item.updatedAt || item.createdAt || 0),
        excerpt: text.slice(excerptStart, excerptEnd).replace(/\s+/g, " ").trim(),
        matchedTitle: titleMatch
      });
      if (matches.length >= Math.max(1, Math.min(50, Number(limit) || 20))) break;
    }
    // Searching large local documents remains cooperative and does not keep
    // the main thread busy for a long uninterrupted scan.
    if (index % 2 === 1) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return matches;
}

export async function openLinkaDocumentById(id) {
  const documentValue = (await listDocuments()).find(item => String(item.id) === String(id));
  if (!documentValue) return false;
  await openEditor(documentValue);
  return true;
}

async function listDocuments() {
  const db = await database();
  if (db) {
    const records = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    return records.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  }
  try { return JSON.parse(localStorage.getItem("linka.documents.fallback.v1") || "[]"); } catch { return []; }
}
function setStatus(message, isError = false) {
  if (!statusLine) return;
  statusLine.textContent = message;
  statusLine.classList.toggle("linka-doc-error", isError);
}
function savedStatusText(timestamp = Date.now()) {
  let time;
  try {
    time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
  } catch {
    time = new Date(timestamp).toLocaleTimeString();
  }
  return t("savedAt").replace("{time}", time);
}
function createMirrorAnimation(textarea, mirror) {
  const computed = getComputedStyle(textarea);
  ["fontFamily","fontSize","fontWeight","fontStyle","lineHeight","letterSpacing","textAlign","textIndent","paddingTop","paddingRight","paddingBottom","paddingLeft","boxSizing","tabSize"].forEach(key => { mirror.style[key] = computed[key]; });
  const wrapper = textarea.closest(".linka-doc-body-wrap");
  const MAX_ANIMATED_CHARS = 3000;
  // Large paste/delete operations should stay a single text node instead of
  // creating hundreds or thousands of animated spans.
  const MAX_ANIMATED_FRAGMENT = 180;
  let previous = textarea.value;
  let clearGhostTimer = 0;
  const draw = (value, before = value, animate = false) => {
    const plainTextMode = value.length > MAX_ANIMATED_CHARS || before.length > MAX_ANIMATED_CHARS;
    wrapper?.classList.toggle("plain-text-mode", plainTextMode);
    mirror.replaceChildren();
    if (plainTextMode) return;
    if (!value && !before) return;

    // Keep unchanged content in text nodes. Only the inserted/deleted fragment
    // receives spans, instead of creating one element per character per input.
    const prefix = reducedMotion() ? value.length : (() => { let i = 0; while (i < value.length && i < before.length && value[i] === before[i]) i++; return i; })();
    let suffix = 0;
    while (suffix < value.length - prefix && suffix < before.length - prefix && value[value.length - 1 - suffix] === before[before.length - 1 - suffix]) suffix++;
    const removed = before.slice(prefix, before.length - suffix);
    const added = value.slice(prefix, value.length - suffix);
    const makeSpan = (character, className, index) => {
      const span = document.createElement("span");
      span.className = className || "";
      span.textContent = character;
      if (className === "linka-doc-letter") span.style.animationDelay = Math.min(Math.max(index, 0) * 9, 90) + "ms";
      return span;
    };

    if (prefix) mirror.append(document.createTextNode(value.slice(0, prefix)));
    if (animate && removed && removed.length <= MAX_ANIMATED_FRAGMENT && !reducedMotion()) {
      [...removed].forEach((character, index) => mirror.append(makeSpan(character, "linka-doc-gone", index)));
      clearTimeout(clearGhostTimer);
      clearGhostTimer = setTimeout(() => draw(textarea.value), 210);
    }
    if (added) {
      if (animate && added.length <= MAX_ANIMATED_FRAGMENT && !reducedMotion()) {
        [...added].forEach((character, index) => mirror.append(makeSpan(character, "linka-doc-letter", index)));
      } else {
        mirror.append(document.createTextNode(added));
      }
    }
    if (suffix) mirror.append(document.createTextNode(value.slice(value.length - suffix)));
  };
  draw(textarea.value);
  textarea.addEventListener("input", () => {
    const next = textarea.value;
    draw(next, previous, true);
    previous = next;
  });
  textarea.addEventListener("scroll", () => { mirror.scrollTop = textarea.scrollTop; mirror.scrollLeft = textarea.scrollLeft; });
  textarea.addEventListener("focus", () => { mirror.scrollTop = textarea.scrollTop; });
  return () => clearTimeout(clearGhostTimer);
}

function downloadDocument(document) {
  const blob = new Blob([serializeLinkaDocument(document)], { type: "application/vnd.linka.document+json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = linkaFilename(document.title);
  anchor.rel = "noopener";
  anchor.style.display = "none";
  window.document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setStatus(t("fileSaved"));
}
async function closeEditor() {
  // Do not dismiss the editor while a final save fails: the user must be able
  // to retry or copy the text instead of losing the only visible draft.
  if (bodyField && currentDocument) {
    const saved = await persistCurrent(true);
    if (!saved) {
      setStatus(t("failed"), true);
      return;
    }
  }
  clearTimeout(saveTimer);
  overlay?.classList.remove("is-open");
  const old = overlay;
  overlay = null;
  currentDocument = null;
  titleField = null; bodyField = null; statusLine = null; recentList = null; inputPicker = null; recoveryBanner = null; recoveryNotice = null; recoveryDraftCandidate = null;
  setTimeout(() => old?.remove(), reducedMotion() ? 0 : 460);
  document.removeEventListener("keydown", handleKeyDown);
  previousFocus?.focus?.();
}
function handleKeyDown(event) {
  if (event.key === "Escape" && overlay) { event.preventDefault(); closeEditor(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && overlay) { event.preventDefault(); persistCurrent(true); }
}
async function persistCurrent(showSaved = false) {
  if (!currentDocument || !bodyField) return false;
  clearTimeout(saveTimer);
  const saveRevision = editRevision;
  const snapshot = normalizeLinkaDocument({
    ...currentDocument,
    title: titleField?.value || t("untitled"),
    text: bodyField.value,
    updatedAt: Date.now()
  });
  const documentId = snapshot.id;
  currentDocument = snapshot;
  if (statusLine) setStatus(t("saving"));
  try {
    await storeDocument(snapshot);
    if (currentDocument?.id === documentId) {
      lastSavedAt = snapshot.updatedAt;
      if (saveRevision === editRevision) {
        clearEmergencyDocumentDraftIfMatches(localStorage, snapshot);
        if (recoveryDraftCandidate?.id === documentId &&
            recoveryDraftCandidate.title === snapshot.title &&
            recoveryDraftCandidate.text === snapshot.text) {
          recoveryDraftCandidate = null;
          if (recoveryBanner) recoveryBanner.hidden = true;
        }
        setStatus(savedStatusText(lastSavedAt));
      } else {
        setStatus(t("unsaved"));
        if (!saveTimer) saveTimer = setTimeout(() => void persistCurrent(true), 120);
      }
    }
    await refreshRecentList();
    await refreshEmergencyDraftNotice();
    return true;
  } catch {
    if (currentDocument?.id === documentId) setStatus(t("failed"), true);
    return false;
  }
}
function dispatchEditorInputWithoutSaving() {
  suppressSaveOnInput = true;
  try { bodyField?.dispatchEvent(new Event("input", { bubbles: true })); }
  finally { suppressSaveOnInput = false; }
}
function scheduleSave() {
  if (!currentDocument || !bodyField) return;
  editRevision += 1;
  const emergency = writeEmergencyDocumentDraft(localStorage, {
    ...currentDocument,
    title: titleField?.value || t("untitled"),
    text: bodyField.value,
    updatedAt: Date.now()
  });
  if (emergency.saved && recoveryDraftCandidate?.id === emergency.draft.id) {
    recoveryDraftCandidate = emergency.draft;
    if (recoveryNotice) recoveryNotice.textContent = t("recoverFound").replace("{title}", emergency.draft.title || t("untitled"));
  }
  setStatus(t("unsaved"));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void persistCurrent(true), 460);
}
async function refreshEmergencyDraftNotice() {
  if (!recoveryBanner) return;
  const candidate = readEmergencyDocumentDraft(localStorage);
  if (!candidate) {
    recoveryDraftCandidate = null;
    recoveryBanner.hidden = true;
    return;
  }
  let savedDocument = null;
  try {
    savedDocument = (await listDocuments()).find(item => item.id === candidate.id) || null;
  } catch {}
  if (savedDocument && savedDocument.title === candidate.title && savedDocument.text === candidate.text) {
    clearEmergencyDocumentDraft(localStorage, candidate.id);
    recoveryDraftCandidate = null;
    recoveryBanner.hidden = true;
    return;
  }
  recoveryDraftCandidate = candidate;
  recoveryNotice.textContent = t("recoverFound").replace("{title}", candidate.title || t("untitled"));
  recoveryBanner.hidden = false;
}
async function refreshRecentList() {
  if (!recentList || !currentDocument) return;
  recentList.replaceChildren();
  const recent = (await listDocuments()).filter(item => item.id !== currentDocument.id).slice(0, MAX_RECENT);
  for (const item of recent) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "linka-doc-recent-item";
    button.textContent = item.title || t("untitled");
    button.title = item.title || t("untitled");
    button.addEventListener("click", () => void openEditor(item));
    recentList.append(button);
  }
  if (recent.length === 0) {
    const empty = document.createElement("span");
    empty.className = "linka-doc-recent-item";
    empty.textContent = t("local");
    empty.disabled = true;
    recentList.append(empty);
  }
}
function attachImportedFilePicker() {
  inputPicker = document.createElement("input");
  inputPicker.type = "file";
  inputPicker.accept = ".linka,.txt,application/vnd.linka.document+json,application/json,text/plain";
  inputPicker.hidden = true;
  inputPicker.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 32 * 1024 * 1024) throw new Error("Файл больше 32 МиБ. Раздели документ на несколько файлов.");
      const parsed = parseLinkaDocument(await file.text(), file.name.replace(/\.[^.]+$/, "") || t("untitled"));
      currentDocument = await storeDocument(parsed);
      editRevision = 0;
      lastSavedAt = Number(currentDocument.updatedAt || Date.now());
      titleField.value = currentDocument.title;
      bodyField.value = currentDocument.text;
      dispatchEditorInputWithoutSaving();
      setStatus(savedStatusText(lastSavedAt));
      await refreshRecentList();
    await refreshEmergencyDraftNotice();
    } catch (error) {
      setStatus(error?.message || t("openFailed"), true);
    } finally {
      event.target.value = "";
    }
  });
  overlay.append(inputPicker);
}
function buildEditorUI() {
  overlay = document.createElement("div");
  overlay.className = "linka-doc-overlay";
  overlay.setAttribute("role", "presentation");
  overlay.innerHTML = '<section class="linka-doc-window" role="dialog" aria-modal="true" aria-labelledby="linka-doc-heading"><header class="linka-doc-header"><div class="linka-doc-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.8h7l4 4V20H7z"/><path d="M14 3.8V8h4M10 12h5M10 15.5h5M10 18.5h3"/></svg></div><div class="linka-doc-headcopy"><h2 id="linka-doc-heading"></h2><p></p></div><button class="linka-doc-btn" type="button" data-close></button></header><div class="linka-doc-actions"><button class="linka-doc-btn primary" type="button" data-new></button><button class="linka-doc-btn" type="button" data-open></button><button class="linka-doc-btn" type="button" data-save></button><button class="linka-doc-btn" type="button" data-preview aria-pressed="false"></button></div><div class="linka-doc-fields"><label class="linka-doc-label"><span data-title-label></span><input class="linka-doc-title" type="text" maxlength="180" autocomplete="off"></label><label class="linka-doc-label" data-body-field><span data-body-label></span><div class="linka-doc-body-wrap"><div class="linka-doc-type-mirror" aria-hidden="true"></div><textarea class="linka-doc-body" spellcheck="true" maxlength="5000000"></textarea></div></label><div class="linka-doc-markdown-preview" data-markdown-preview hidden role="region"></div></div><div class="linka-doc-footer"><span class="linka-doc-footer-status" role="status" aria-live="polite"></span><span data-help></span></div><div class="linka-doc-recent"><h3></h3><div class="linka-doc-recent-list"></div></div></section>';
  const panel = overlay.querySelector(".linka-doc-window");
  const q = selector => panel.querySelector(selector);
  recoveryBanner = document.createElement("div");
  recoveryBanner.className = "linka-doc-recovery";
  recoveryBanner.hidden = true;
  recoveryNotice = document.createElement("p");
  recoveryNotice.setAttribute("role", "status");
  recoveryNotice.setAttribute("aria-live", "polite");
  const recoveryActions = document.createElement("div");
  recoveryActions.className = "linka-doc-recovery-actions";
  const restoreDraftButton = document.createElement("button");
  restoreDraftButton.type = "button";
  restoreDraftButton.className = "linka-doc-btn primary";
  restoreDraftButton.textContent = t("restoreDraft");
  const discardDraftButton = document.createElement("button");
  discardDraftButton.type = "button";
  discardDraftButton.className = "linka-doc-btn";
  discardDraftButton.textContent = t("discardDraft");
  recoveryActions.append(restoreDraftButton, discardDraftButton);
  recoveryBanner.append(recoveryNotice, recoveryActions);
  q(".linka-doc-actions").after(recoveryBanner);
  restoreDraftButton.addEventListener("click", async () => {
    const candidate = recoveryDraftCandidate;
    if (!candidate) return;
    if (currentDocument?.id !== candidate.id && !(await persistCurrent(true))) return;
    currentDocument = normalizeLinkaDocument(candidate);
    editRevision = 0;
    lastSavedAt = Number(currentDocument.updatedAt || 0);
    titleField.value = currentDocument.title || t("untitled");
    bodyField.value = currentDocument.text;
    dispatchEditorInputWithoutSaving();
    if (!(await persistCurrent(true))) {
      setStatus(t("failed"), true);
      return;
    }
    recoveryDraftCandidate = null;
    recoveryBanner.hidden = true;
    setStatus(t("draftRecovered"));
  });
  discardDraftButton.addEventListener("click", () => {
    const candidate = recoveryDraftCandidate;
    if (!candidate || !window.confirm(t("discardDraftConfirm"))) return;
    if (!clearEmergencyDocumentDraft(localStorage, candidate.id)) {
      setStatus(t("failed"), true);
      return;
    }
    recoveryDraftCandidate = null;
    if (recoveryBanner) recoveryBanner.hidden = true;
    setStatus(t("draftDiscarded"));
  });
  q("#linka-doc-heading").textContent = "Linka · " + t("documents");
  q(".linka-doc-headcopy p").textContent = t("local");
  q("[data-close]").textContent = t("close");
  q("[data-new]").textContent = t("newDoc");
  q("[data-open]").textContent = t("open");
  q("[data-save]").textContent = t("save");
  q("[data-title-label]").textContent = t("title");
  q("[data-body-label]").textContent = t("content");
  q(".linka-doc-title").placeholder = t("untitled");
  q(".linka-doc-body").placeholder = t("placeholder");
  q("[data-help]").textContent = t("help");
  q(".linka-doc-recent h3").textContent = t("recent");
  titleField = q(".linka-doc-title");
  bodyField = q(".linka-doc-body");
  markdownPreviewPane = q("[data-markdown-preview]");
  markdownPreviewButton = q("[data-preview]");
  markdownBodyLabel = q("[data-body-field]");
  markdownPreviewMode = false;
  markdownPreviewButton.textContent = t("previewMarkdown");
  markdownPreviewButton.setAttribute("aria-label", t("previewMarkdown"));
  markdownPreviewButton.addEventListener("click", () => setMarkdownPreviewMode(!markdownPreviewMode));
  statusLine = q(".linka-doc-footer-status");
  recentList = q(".linka-doc-recent-list");
  q("[data-close]").addEventListener("click", closeEditor);
  q("[data-new]").addEventListener("click", async () => {
    // Do not switch away from a dirty document unless its current revision was saved.
    if (!(await persistCurrent(true))) return;
    currentDocument = normalizeLinkaDocument({ id: uid(), title: t("untitled"), text: "" });
    editRevision = 0;
    lastSavedAt = 0;
    titleField.value = currentDocument.title;
    bodyField.value = "";
    dispatchEditorInputWithoutSaving();
    setMarkdownPreviewMode(false);
    try {
      currentDocument = await storeDocument(currentDocument);
      lastSavedAt = currentDocument.updatedAt;
      setStatus(savedStatusText(lastSavedAt));
      await refreshRecentList();
    await refreshEmergencyDraftNotice();
    } catch {
      setStatus(t("failed"), true);
    }
  });
  q("[data-open]").addEventListener("click", () => inputPicker?.click());
  q("[data-save]").addEventListener("click", () => {
    void persistCurrent(false).then(() => downloadDocument(normalizeLinkaDocument({ ...currentDocument, title: titleField.value || t("untitled"), text: bodyField.value, updatedAt: Date.now() })));
  });
  titleField.addEventListener("input", () => { if (!suppressSaveOnInput) scheduleSave(); });
  bodyField.addEventListener("input", () => { if (!suppressSaveOnInput) scheduleSave(); });
  createMirrorAnimation(bodyField, q(".linka-doc-type-mirror"));
  overlay.addEventListener("click", event => { if (event.target === overlay) closeEditor(); });
  document.body.append(overlay);
  document.addEventListener("keydown", handleKeyDown);
  requestAnimationFrame(() => { overlay?.classList.add("is-open"); titleField?.focus(); titleField?.select(); });
  attachImportedFilePicker();
}
async function openEditor(documentValue = null) {
  // Recent documents are opened inside the existing editor. Creating stacked
  // modal overlays used to trap focus and duplicate the Escape/save lifecycle.
  if (overlay && titleField && bodyField) {
    if (!documentValue) { titleField.focus(); return; }
    if (!(await persistCurrent(true))) return;
    setMarkdownPreviewMode(false);
    currentDocument = normalizeLinkaDocument(documentValue);
    editRevision = 0;
    lastSavedAt = Number(currentDocument.updatedAt || 0);
    titleField.value = currentDocument.title;
    bodyField.value = currentDocument.text;
    dispatchEditorInputWithoutSaving();
    try {
      currentDocument = await storeDocument(currentDocument);
      lastSavedAt = currentDocument.updatedAt;
      setStatus(savedStatusText(lastSavedAt));
    } catch {
      setStatus(t("failed"), true);
      return;
    }
    await refreshRecentList();
    await refreshEmergencyDraftNotice();
    bodyField.focus();
    return;
  }
  previousFocus = document.activeElement;
  clearTimeout(saveTimer);
  currentDocument = normalizeLinkaDocument(documentValue || { id: uid(), title: t("untitled"), text: "" });
  editRevision = 0;
  lastSavedAt = Number(currentDocument.updatedAt || 0);
  buildEditorUI();
  titleField.value = currentDocument.title;
  bodyField.value = currentDocument.text;
  dispatchEditorInputWithoutSaving();
  setMarkdownPreviewMode(false);
  try {
    currentDocument = await storeDocument(currentDocument);
    lastSavedAt = currentDocument.updatedAt;
    setStatus(savedStatusText(lastSavedAt));
  } catch {
    setStatus(t("failed"), true);
  }
  await refreshRecentList();
    await refreshEmergencyDraftNotice();
}
async function openRawDocument(raw, fallbackTitle = t("untitled")) {
  const parsed = parseLinkaDocument(raw, fallbackTitle);
  if (overlay) closeEditor();
  await openEditor(parsed);
}
export async function initLinkaDocuments() {
  if (initialized) return;
  initialized = true;
  addStyles();
  const settings = document.querySelector("#settings-button");
  const top = document.querySelector(".top-actions");
  if (top && !document.querySelector("#linka-document-button")) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "linka-document-button";
    button.className = "icon-btn linka-doc-trigger";
    button.setAttribute("aria-label", t("documents"));
    button.title = t("documents");
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3.5h7l4 4V20H7z"/><path d="M14 3.5v4h4M10 12h5M10 15.5h5M10 18.5h3"/></svg>';
    button.addEventListener("click", () => void openEditor());
    top.insertBefore(button, settings || null);
  }
  document.addEventListener("linka:open-documents", () => void openEditor());
  if (window.__TAURI_INTERNALS__) {
    try {
      const events = await import("@tauri-apps/api/event");
      const core = await import("@tauri-apps/api/core");
      await events.listen("linka-open-document", event => {
        void openRawDocument(String(event.payload || "")).catch(error => setStatus(error?.message || t("openFailed"), true));
      });
      const startupDocument = await core.invoke("take_startup_document");
      if (typeof startupDocument === "string" && startupDocument) {
        void openRawDocument(startupDocument).catch(error => console.warn("Unable to open the Linka document", error));
      }
    } catch (error) {
      console.warn("Linka file-open integration could not start", error);
    }
  }
}
