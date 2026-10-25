import { loadCaptures, saveCaptures, makeCapture, normalizeCapture, normalizePreviewImageUrl, visibleCaptures, sortCaptures, findDuplicateCapture, normalizeDuplicateKey, getCaptureRecovery, startFreshCaptureLibrary } from "./store.js";
import { initLinkaExperience, setLanguage } from "./experience.js";
import { initVisualSystem, setLinkaTheme, setLinkaAccent, setLinkaDensity, setLinkaEffects } from "./visual-system.js";
import { initLinkaAtmosphere, openAtmosphereSettings } from "./atmosphere.js";
import { initLinkaDocuments, searchLinkaDocuments, openLinkaDocumentById, exportLinkaDocuments, importLinkaDocuments, setLinkaDocumentBeforeSave } from "./documents.js";
import { initLinkaSignature } from "./signature-theme.js";
import {
  addDeletedId, addDeletedIds, removeDeletedIds, setDeletedIds, disconnectCloud, getCloudConfig, getCloudSession,
  getOtpCooldown, readDeletedIds, requestEmailOtp, saveCloudConfig, syncCloudCaptures, mergeCloudCaptures,
  verifyEmailOtp, readLinkaProfile, saveLinkaProfile, beginQrPairing, claimQrPairing,
  startGoogleOAuth, completeGoogleOAuthCallback
} from "./cloud-sync.js";
import QRCode from "qrcode";
import { listen as listenTauriEvent } from "@tauri-apps/api/event";
import { invoke as invokeTauri } from "@tauri-apps/api/core";
import {
  createLinkaBackup, parseLinkaBackup
} from "./backup-format.js";
import {
  saveBackupSnapshot, listBackupSnapshots, getBackupSnapshot, deleteBackupSnapshot,
  isBackupHistoryAvailable, MAX_AUTOMATIC_SNAPSHOT_BYTES
} from "./backup-history.js";

const $ = selector => document.querySelector(selector);
const form = $("#capture-form");
const draft = $("#capture-text");
const tagsDraft = $("#capture-tags");
const collectionDraft = $("#capture-collection");
const previewTitleDraft = $("#capture-preview-title");
const previewDescriptionDraft = $("#capture-preview-description");
const previewImageDraft = $("#capture-preview-image");
const saveButton = $("#save-button");
const list = $("#capture-list");
const search = $("#search");
const sortOrder = $("#sort-order");
const SORT_ORDERS = new Set(["updated", "newest", "oldest", "title", "domain"]);
let sortMode = localStorage.getItem("linka.sortOrder.v1") || "updated";
if (!SORT_ORDERS.has(sortMode)) sortMode = "updated";
if (sortOrder) sortOrder.value = sortMode;
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
search.title = "Search operators: type:link, type:note, is:pinned, is:later, tag:design, in:research, site:example.com, before:YYYY-MM-DD, after:YYYY-MM-DD";
function captureUiText(key) {
  const language = (() => { try { return localStorage.getItem("linka.language.v1") || "en"; } catch { return "en"; } })();
  const copy = {
    en: { later: "Read later", removeLater: "Remove later", tagSearch: "Search this tag", collectionSearch: "Show this collection", savedLater: "Saved for later", removedLater: "Removed from read later", readLater: "Read later", archive: "Archive", unarchive: "Unarchive", trash: "Move to trash", restore: "Restore", deletePermanent: "Delete permanently", archived: "Archived", unarchived: "Moved out of archive", movedTrash: "Moved to trash", restored: "Restored from trash", deletedPermanent: "Permanently deleted", confirmPermanent: "Permanently delete the selected items? This cannot be undone.", tags: "Edit tags", collection: "Set collection", markLater: "Mark for later", removeLaterBulk: "Remove from read later", tagPrompt: "Comma-separated tags (leave empty to clear)", collectionPrompt: "Collection name (leave empty to clear)", savedViews: "Saved searches", saveView: "Save view", removeView: "Remove view", nameView: "Name this search", viewSaved: "Search saved", viewRemoved: "Saved search removed", enterSearch: "Type a search before saving it.", exportedJson: "JSON backup downloaded", exportedMarkdown: "Markdown export downloaded", exportedText: "Text export downloaded", exportedHtml: "HTML export downloaded", duplicatePrompt: "A matching item already exists. Save another copy anyway?", duplicateSkipped: "Existing item kept; duplicate was not added.", backupConfirm: "This complete Linka backup merges captures and local documents and restores appearance and search preferences. Existing items will not be deleted. Continue?", backupRestored: "Backup restored", backupPartial: "Captures were restored, but some documents or preferences could not be restored. Check available storage.", backupFailed: "Could not save or restore the complete backup. Check available storage and try again.", recentViews: "Recent searches · this device only", clearRecent: "Clear history", recentCleared: "Recent searches cleared.", invalidBookmarkImport: "No web bookmarks were found in this HTML file.", bookmarkDuplicatesSkipped: "All imported bookmarks already exist in your library.", bookmarkImportLimited: "Only the first 5,000 bookmarks were processed.", previewImageInvalid: "Cover image must be a valid HTTPS URL without credentials." },
    ru: { later: "Сохранить на потом", removeLater: "Убрать из отложенного", tagSearch: "Найти этот тег", collectionSearch: "Открыть коллекцию", savedLater: "Добавлено в «Сохранить на потом»", removedLater: "Убрано из отложенного", readLater: "Отложено", archive: "В архив", unarchive: "Вернуть из архива", trash: "В корзину", restore: "Восстановить", deletePermanent: "Удалить навсегда", archived: "Перемещено в архив", unarchived: "Возвращено из архива", movedTrash: "Перемещено в корзину", restored: "Восстановлено из корзины", deletedPermanent: "Удалено навсегда", confirmPermanent: "Удалить выбранные записи навсегда? Это действие нельзя отменить.", tags: "Изменить теги", collection: "Задать коллекцию", markLater: "Отложить", removeLaterBulk: "Убрать из отложенного", tagPrompt: "Теги через запятую (пустое поле очистит теги)", collectionPrompt: "Название коллекции (пустое поле очистит её)", savedViews: "Сохранённые поиски", saveView: "Сохранить поиск", removeView: "Удалить поиск", nameView: "Название поиска", viewSaved: "Поиск сохранён", viewRemoved: "Поиск удалён", enterSearch: "Сначала введи поисковый запрос.", exportedJson: "JSON-резервная копия скачана", exportedMarkdown: "Экспорт Markdown скачан", exportedText: "Текстовый экспорт скачан", exportedHtml: "HTML-экспорт скачан", duplicatePrompt: "Похожая запись уже существует. Сохранить ещё одну копию?", duplicateSkipped: "Существующая запись сохранена; дубликат не добавлен.", backupConfirm: "Эта полная резервная копия объединит записи и локальные документы и восстановит оформление и поисковые настройки. Существующие данные не будут удалены. Продолжить?", backupRestored: "Резервная копия восстановлена", backupPartial: "Записи восстановлены, но часть документов или настроек не удалось восстановить. Проверь свободное место.", backupFailed: "Не удалось сохранить или полностью восстановить резервную копию. Проверь свободное место.", recentViews: "Недавние поиски · только на устройстве", clearRecent: "Очистить историю", recentCleared: "История поиска очищена.", invalidBookmarkImport: "В этом HTML-файле не найдены закладки со ссылками на сайты.", bookmarkDuplicatesSkipped: "Все импортируемые закладки уже есть в библиотеке.", bookmarkImportLimited: "Обработаны только первые 5 000 закладок.", previewImageInvalid: "Для обложки укажи корректный HTTPS-адрес без логина и пароля." },
    az: { later: "Sonra oxu", removeLater: "Sonra oxumaqdan çıxar", tagSearch: "Bu teqi axtar", collectionSearch: "Kolleksiyanı göstər", savedLater: "Sonra oxumaq üçün saxlanıldı", removedLater: "Sonra oxumaq siyahısından çıxarıldı", readLater: "Sonra oxu", archive: "Arxivə köçür", unarchive: "Arxivdən çıxar", trash: "Zibil qutusuna köçür", restore: "Bərpa et", deletePermanent: "Həmişəlik sil", archived: "Arxivə köçürüldü", unarchived: "Arxivdən çıxarıldı", movedTrash: "Zibil qutusuna köçürüldü", restored: "Zibil qutusundan bərpa edildi", deletedPermanent: "Həmişəlik silindi", confirmPermanent: "Seçilmiş qeydlər həmişəlik silinsin? Bu əməl geri qaytarıla bilməz.", tags: "Teqləri dəyiş", collection: "Kolleksiya təyin et", markLater: "Sonra oxu üçün saxla", removeLaterBulk: "Sonra oxu siyahısından çıxar", tagPrompt: "Vergüllə ayrılmış teqlər (boş buraxmaq təmizləyir)", collectionPrompt: "Kolleksiyanın adı (boş buraxmaq təmizləyir)", savedViews: "Saxlanmış axtarışlar", saveView: "Axtarışı saxla", removeView: "Axtarışı sil", nameView: "Axtarışın adı", viewSaved: "Axtarış saxlanıldı", viewRemoved: "Saxlanmış axtarış silindi", enterSearch: "Əvvəlcə axtarış sorğusu yaz.", exportedJson: "JSON ehtiyat nüsxəsi endirildi", exportedMarkdown: "Markdown ixracı endirildi", exportedText: "Mətn ixracı endirildi", exportedHtml: "HTML ixracı endirildi", duplicatePrompt: "Oxşar qeyd artıq mövcuddur. Daha bir nüsxə saxlanılsın?", duplicateSkipped: "Mövcud qeyd saxlanıldı; dublikat əlavə edilmədi.", backupConfirm: "Bu tam Linka ehtiyat nüsxəsi qeydləri və yerli sənədləri birləşdirəcək, görünüş və axtarış parametrlərini bərpa edəcək. Mövcud məlumatlar silinməyəcək. Davam edilsin?", backupRestored: "Ehtiyat nüsxə bərpa edildi", backupPartial: "Qeydlər bərpa edildi, lakin bəzi sənədlər və ya parametrlər bərpa olunmadı. Yaddaş yerini yoxla.", backupFailed: "Tam ehtiyat nüsxəni saxlamaq və ya bərpa etmək olmadı. Yaddaş yerini yoxla.", recentViews: "Son axtarışlar · yalnız bu cihazda", clearRecent: "Tarixçəni təmizlə", recentCleared: "Axtarış tarixçəsi təmizləndi.", invalidBookmarkImport: "Bu HTML faylında veb keçidli əlfəcinlər tapılmadı.", bookmarkDuplicatesSkipped: "İdxal edilən bütün əlfəcinlər kitabxanada artıq mövcuddur.", bookmarkImportLimited: "Yalnız ilk 5 000 əlfəcin emal edildi.", previewImageInvalid: "Üz qabığı üçün giriş məlumatları olmayan düzgün HTTPS URL-i daxil et." },
    tr: { later: "Daha sonra oku", removeLater: "Sonradan oku listesinden çıkar", tagSearch: "Bu etiketi ara", collectionSearch: "Bu koleksiyonu göster", savedLater: "Daha sonra okumak için kaydedildi", removedLater: "Sonradan oku listesinden kaldırıldı", readLater: "Daha sonra oku", archive: "Arşivle", unarchive: "Arşivden çıkar", trash: "Çöp kutusuna taşı", restore: "Geri yükle", deletePermanent: "Kalıcı olarak sil", archived: "Arşive taşındı", unarchived: "Arşivden çıkarıldı", movedTrash: "Çöp kutusuna taşındı", restored: "Çöp kutusundan geri yüklendi", deletedPermanent: "Kalıcı olarak silindi", confirmPermanent: "Seçili kayıtlar kalıcı olarak silinsin mi? Bu işlem geri alınamaz.", tags: "Etiketleri düzenle", collection: "Koleksiyon ata", markLater: "Daha sonra oku", removeLaterBulk: "Sonradan oku listesinden çıkar", tagPrompt: "Virgülle ayrılmış etiketler (boş bırakmak temizler)", collectionPrompt: "Koleksiyon adı (boş bırakmak temizler)", savedViews: "Kayıtlı aramalar", saveView: "Aramayı kaydet", removeView: "Aramayı kaldır", nameView: "Arama adı", viewSaved: "Arama kaydedildi", viewRemoved: "Kayıtlı arama silindi", enterSearch: "Önce bir arama yaz.", exportedJson: "JSON yedeği indirildi", exportedMarkdown: "Markdown dışa aktarımı indirildi", exportedText: "Metin dışa aktarımı indirildi", exportedHtml: "HTML dışa aktarımı indirildi", duplicatePrompt: "Benzer bir kayıt zaten var. Bir kopya daha kaydedilsin mi?", duplicateSkipped: "Mevcut kayıt korundu; kopya eklenmedi.", backupConfirm: "Bu tam Linka yedeği kayıtları ve yerel belgeleri birleştirir, görünüm ve arama tercihlerini geri yükler. Mevcut veriler silinmez. Devam edilsin mi?", backupRestored: "Yedek geri yüklendi", backupPartial: "Kayıtlar geri yüklendi ancak bazı belgeler veya tercihler yüklenemedi. Depolama alanını kontrol et.", backupFailed: "Tam yedek kaydedilemedi veya geri yüklenemedi. Depolama alanını kontrol et.", recentViews: "Son aramalar · yalnızca bu cihazda", clearRecent: "Geçmişi temizle", recentCleared: "Arama geçmişi temizlendi.", invalidBookmarkImport: "Bu HTML dosyasında web bağlantılı yer imleri bulunamadı.", bookmarkDuplicatesSkipped: "İçe aktarılacak tüm yer imleri kitaplığınızda zaten var.", bookmarkImportLimited: "Yalnızca ilk 5.000 yer imi işlendi.", previewImageInvalid: "Kapak için kullanıcı bilgisi içermeyen geçerli bir HTTPS URL’si gir." }
  };
  return (copy[language] || copy.en)[key] || copy.en[key] || key;
}
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
let persistedCaptures = captures.map(item => ({ ...item }));
const QUICK_DRAFT_KEY = "linka.captureDraft.v1";
const QUICK_DRAFT_TAGS_KEY = "linka.captureDraft.tags.v1";
const QUICK_DRAFT_COLLECTION_KEY = "linka.captureDraft.collection.v1";
const QUICK_DRAFT_PREVIEW_TITLE_KEY = "linka.captureDraft.previewTitle.v1";
const QUICK_DRAFT_PREVIEW_DESCRIPTION_KEY = "linka.captureDraft.previewDescription.v1";
const QUICK_DRAFT_PREVIEW_IMAGE_KEY = "linka.captureDraft.previewImage.v1";
function parseTagInput(value) {
  return String(value || "").split(/[,;\n]+/).map(tag => tag.trim().replace(/^#+/, "").replace(/\s+/g, " ").slice(0, 40)).filter(Boolean).slice(0, 24);
}
function saveCaptureMetadataDraft() {
  try {
    if (tagsDraft.value) localStorage.setItem(QUICK_DRAFT_TAGS_KEY, tagsDraft.value);
    else localStorage.removeItem(QUICK_DRAFT_TAGS_KEY);
    if (collectionDraft.value) localStorage.setItem(QUICK_DRAFT_COLLECTION_KEY, collectionDraft.value);
    else localStorage.removeItem(QUICK_DRAFT_COLLECTION_KEY);
    if (previewTitleDraft.value) localStorage.setItem(QUICK_DRAFT_PREVIEW_TITLE_KEY, previewTitleDraft.value);
    else localStorage.removeItem(QUICK_DRAFT_PREVIEW_TITLE_KEY);
    if (previewDescriptionDraft.value) localStorage.setItem(QUICK_DRAFT_PREVIEW_DESCRIPTION_KEY, previewDescriptionDraft.value);
    else localStorage.removeItem(QUICK_DRAFT_PREVIEW_DESCRIPTION_KEY);
    if (previewImageDraft.value) localStorage.setItem(QUICK_DRAFT_PREVIEW_IMAGE_KEY, previewImageDraft.value);
    else localStorage.removeItem(QUICK_DRAFT_PREVIEW_IMAGE_KEY);
  } catch {}
}
try {
  const savedDraft = localStorage.getItem(QUICK_DRAFT_KEY);
  const savedTags = localStorage.getItem(QUICK_DRAFT_TAGS_KEY);
  const savedCollection = localStorage.getItem(QUICK_DRAFT_COLLECTION_KEY);
  const savedPreviewTitle = localStorage.getItem(QUICK_DRAFT_PREVIEW_TITLE_KEY);
  const savedPreviewDescription = localStorage.getItem(QUICK_DRAFT_PREVIEW_DESCRIPTION_KEY);
  const savedPreviewImage = localStorage.getItem(QUICK_DRAFT_PREVIEW_IMAGE_KEY);
  if (savedDraft && !draft.value) draft.value = savedDraft;
  if (savedTags && !tagsDraft.value) tagsDraft.value = savedTags;
  if (savedCollection && !collectionDraft.value) collectionDraft.value = savedCollection;
  if (savedPreviewTitle && !previewTitleDraft.value) previewTitleDraft.value = savedPreviewTitle;
  if (savedPreviewDescription && !previewDescriptionDraft.value) previewDescriptionDraft.value = savedPreviewDescription;
  if (savedPreviewImage && !previewImageDraft.value) previewImageDraft.value = savedPreviewImage;
  saveButton.disabled = !draft.value.trim();
} catch {}
let activeFilter = "all";
let editingId = null;
let statusTimer = null;
let cloudSyncTimer = null;
let cloudSyncBusy = false;
let cloudSyncQueued = false;
let localDataRevision = 0;
let cloudSyncStatus = "";
let lastCloudRefreshAt = 0;
const expandedCards = new Set();
const desktopBuildVersion = String(import.meta.env.VITE_LINKA_DESKTOP_VERSION || "").trim();
let reduceMotion = localStorage.getItem("linka.reduceMotion") === "true" || (localStorage.getItem("linka.reduceMotion") === null && (() => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } })());

function focusQuickCaptureFromNative() {
  const input = $("#capture-text");
  if (!input) return;
  input.focus({ preventScroll: true });
  input.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  const capturePanel = document.querySelector(".capture");
  capturePanel?.classList.add("spotlight");
  setTimeout(() => capturePanel?.classList.remove("spotlight"), 900);
}
async function applyNativeCloseToTrayPreference() {
  if (!(window.__TAURI_INTERNALS__ || window.__TAURI__)) return;
  const enabled = localStorage.getItem("linka.closeToTray") !== "false";
  try { await invokeTauri("set_close_to_tray", { enabled }); }
  catch (error) { console.warn("Could not apply Linka close-to-tray preference", error); }
}
async function registerNativeDesktopEvents() {
  if (!(window.__TAURI_INTERNALS__ || window.__TAURI__)) return;
  try {
    await Promise.all([
      listenTauriEvent("linka-global-capture", () => focusQuickCaptureFromNative()),
      listenTauriEvent("linka-tray-quick-capture", () => focusQuickCaptureFromNative()),
      listenTauriEvent("linka-menu-action", event => {
        const action = String(event.payload || "");
        if (action === "undo" || action === "redo") {
          const active = document.activeElement;
          if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active?.isContentEditable) {
            active.focus();
            document.execCommand(action);
          }
        } else if (action === "quick-capture") {
          focusQuickCaptureFromNative();
        } else if (action === "new-document") {
          document.dispatchEvent(new Event("linka:open-documents"));
        } else if (action === "export-backup") {
          const format = $("#export-format");
          if (format) format.value = "json";
          $("#export-button")?.click();
        } else if (action === "search") {
          $("#search-space-button")?.click();
        } else if (action === "backup-history") {
          $("#backup-history-button")?.click();
        } else if (action === "settings") {
          $("#settings-button")?.click();
        } else if (action === "shortcuts") {
          window.dispatchEvent(new Event("linka:open-keyboard-shortcuts"));
        }
      })
    ]);
  } catch (error) {
    console.warn("Could not register Linka native desktop event listeners", error);
  }
}
function say(message) {
  status.textContent = message;
  status.style.opacity = "1";
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { status.style.opacity = "0"; }, 2800);
}
function showCaptureRecoveryNotice() {
  const recovery = getCaptureRecovery();
  if (!recovery || recovery.acknowledged || document.getElementById("linka-capture-recovery")) return;
  const language = (() => { try { return localStorage.getItem("linka.language.v1") || "ru"; } catch { return "ru"; } })();
  const copy = ({
    ru: {
      title: "Не удалось прочитать библиотеку Linka",
      body: "Исходные данные не заменены. Запись новых изменений заблокирована, чтобы не перезаписать библиотеку. Сначала экспортируй повреждённые данные для восстановления.",
      export: "Экспортировать исходные данные", fresh: "Начать с пустой библиотекой",
      exportDone: "Исходные данные экспортированы. Сохрани файл до продолжения работы.",
      confirmFresh: "Сначала экспортируй исходные данные. Linka сохранит их локально для диагностики, но создаст новую пустую библиотеку. Продолжить?",
      freshFailed: "Не удалось безопасно сохранить исходные данные. Экспортируй их и проверь свободное место в хранилище.",
      freshDone: "Создана новая библиотека. Повреждённые исходные данные сохранены отдельно."
    },
    en: {
      title: "Linka could not read the library",
      body: "The original data has not been replaced. Writes are paused to prevent overwriting the library. Export the damaged data before continuing.",
      export: "Export original data", fresh: "Start with an empty library",
      exportDone: "Original data exported. Keep the file before continuing.",
      confirmFresh: "Export the original data first. Linka will retain it locally for recovery and create a new empty library. Continue?",
      freshFailed: "Could not safely preserve the original data. Export it and check available storage.",
      freshDone: "A new library was created. The original data is preserved separately."
    },
    az: {
      title: "Linka kitabxananı oxuya bilmədi",
      body: "Orijinal məlumatlar dəyişdirilməyib. Kitabxananın üzərinə yazılmaması üçün yeni yazılar dayandırılıb. Davam etməzdən əvvəl zədələnmiş məlumatları ixrac et.",
      export: "Orijinal məlumatları ixrac et", fresh: "Boş kitabxana yarat",
      exportDone: "Orijinal məlumatlar ixrac edildi. Davam etməzdən əvvəl faylı saxla.",
      confirmFresh: "Əvvəlcə orijinal məlumatları ixrac et. Linka onları bərpa üçün cihazda saxlayacaq və yeni boş kitabxana yaradacaq. Davam edilsin?",
      freshFailed: "Orijinal məlumatları təhlükəsiz saxlamaq mümkün olmadı. Onları ixrac et və yaddaş yerini yoxla.",
      freshDone: "Yeni kitabxana yaradıldı. Orijinal məlumatlar ayrıca saxlanılır."
    },
    tr: {
      title: "Linka kitaplığı okuyamadı",
      body: "Özgün veriler değiştirilmedi. Kitaplığın üzerine yazılmasını önlemek için yeni kayıtlar duraklatıldı. Devam etmeden önce bozuk verileri dışa aktar.",
      export: "Özgün verileri dışa aktar", fresh: "Boş kitaplık oluştur",
      exportDone: "Özgün veriler dışa aktarıldı. Devam etmeden önce dosyayı sakla.",
      confirmFresh: "Önce özgün verileri dışa aktar. Linka bunları kurtarma için cihazda saklayıp yeni boş bir kitaplık oluşturacak. Devam edilsin mi?",
      freshFailed: "Özgün veriler güvenli biçimde korunamadı. Verileri dışa aktar ve kullanılabilir alanı kontrol et.",
      freshDone: "Yeni kitaplık oluşturuldu. Özgün veriler ayrı olarak korundu."
    }
  })[language] || {
    title: "Linka could not read the library",
    body: "The original data has not been replaced. Writes are paused to prevent overwriting the library. Export the damaged data before continuing.",
    export: "Export original data", fresh: "Start with an empty library",
    exportDone: "Original data exported. Keep the file before continuing.",
    confirmFresh: "Export the original data first. Linka will retain it locally for recovery and create a new empty library. Continue?",
    freshFailed: "Could not safely preserve the original data. Export it and check available storage.",
    freshDone: "A new library was created. The original data is preserved separately."
  };

  const panel = document.createElement("section");
  panel.id = "linka-capture-recovery";
  panel.setAttribute("role", "alertdialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-labelledby", "linka-capture-recovery-title");
  panel.style.cssText = "position:fixed;z-index:10000;top:14px;left:50%;transform:translateX(-50%);width:min(680px,calc(100vw - 28px));padding:18px;border:1px solid #d5a15d;border-radius:16px;background:#1b1711;color:#fff7e8;box-shadow:0 18px 70px #0009;font:13px/1.55 system-ui,sans-serif";
  const title = document.createElement("h2");
  title.id = "linka-capture-recovery-title";
  title.textContent = copy.title;
  title.style.cssText = "margin:0 0 8px;font-size:17px;line-height:1.3";
  const description = document.createElement("p");
  description.textContent = copy.body;
  description.style.cssText = "margin:0 0 14px;color:#f0dfc3";
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px";
  const button = (label, primary = false) => {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = label;
    item.style.cssText = "border:1px solid " + (primary ? "#d5a15d" : "#76664f") + ";border-radius:10px;padding:9px 12px;background:" + (primary ? "#d5a15d" : "#29231b") + ";color:" + (primary ? "#21180b" : "#fff7e8") + ";font:600 12px system-ui;cursor:pointer";
    actions.append(item);
    return item;
  };
  const exportButton = button(copy.export, true);
  exportButton.addEventListener("click", () => {
    const blob = new Blob([recovery.raw], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "linka-capture-recovery.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    say(copy.exportDone);
  });
  const freshButton = button(copy.fresh);
  freshButton.addEventListener("click", () => {
    if (!window.confirm(copy.confirmFresh)) return;
    if (!startFreshCaptureLibrary()) {
      say(copy.freshFailed);
      return;
    }
    captures = [];
    persistedCaptures = [];
    panel.remove();
    render();
    say(copy.freshDone);
  });
  panel.append(title, description, actions);
  document.body.append(panel);
}

function isLink(text) { return /^https?:\/\//i.test(text.trim()); }
function formatDate(value) {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return "Saved"; }
}
function persist() {
  const recoveryState = getCaptureRecovery();
  if (!recoveryState || recoveryState.acknowledged) {
    const previousState = persistedCaptures.map(item => ({ ...item, tags: [...(item.tags || [])] }));
    void saveAutomaticBackupSnapshot(previousState).catch(error => {
      console.warn("Automatic Linka backup snapshot was not saved", error);
    });
  }
  if (!saveCaptures(captures)) {
    // Roll back the in-memory mutation to the last state known to be on disk.
    // This prevents the UI from presenting an unsaved edit/delete as durable.
    captures = persistedCaptures.map(item => ({ ...item }));
    say("Не удалось сохранить данные. Предыдущее состояние восстановлено; освободи место или экспортируй резервную копию.");
    return false;
  }
  persistedCaptures = captures.map(item => ({ ...item }));
  localDataRevision += 1;
  scheduleCloudSync();
  return true;
}
function scheduleCloudSync() {
  if (!getCloudSession()) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    if (cloudSyncBusy) { cloudSyncQueued = true; return; }
    void syncNow({ silent: true }).catch(() => {});
  }, 1400);
}
async function syncNow({ silent = false } = {}) {
  if (cloudSyncBusy) { cloudSyncQueued = true; return null; }
  cloudSyncBusy = true;
  const startRevision = localDataRevision;
  try {
    const localSnapshot = captures.map(item => ({ ...item }));
    const deletedSnapshot = readDeletedIds();
    const result = await syncCloudCaptures(localSnapshot, deletedSnapshot);

    // The user may have edited, added, or deleted items while the network
    // request was in flight. Merge against the latest in-memory library and
    // the latest tombstones instead of replacing it with a stale snapshot.
    const currentDeleted = readDeletedIds();
    const removedWhileSyncing = new Set([...deletedSnapshot].filter(id => !currentDeleted.has(id)));
    const latestDeleted = new Set([...(result.deletedIds || [])].filter(id => !removedWhileSyncing.has(id)));
    for (const id of currentDeleted) latestDeleted.add(id);
    const latestCaptures = mergeCloudCaptures(captures, result.captures, latestDeleted);
    if (!saveCaptures(latestCaptures)) {
      throw new Error("Облако ответило, но объединённую библиотеку не удалось сохранить на устройстве. Локальные данные не перезаписаны; экспортируй резервную копию и освободи место.");
    }
    captures = latestCaptures;
    persistedCaptures = captures.map(item => ({ ...item }));
    cloudSyncStatus = result.message;
    if (localDataRevision !== startRevision) cloudSyncQueued = true;
    render();
    if (!silent) say(result.message);
    return { ...result, captures: latestCaptures, deletedIds: latestDeleted };
  } catch (error) {
    cloudSyncStatus = error?.message || "Cloud sync failed";
    if (!silent) say("Sync failed: " + cloudSyncStatus);
    throw error;
  } finally {
    cloudSyncBusy = false;
    if (cloudSyncQueued && getCloudSession()) {
      cloudSyncQueued = false;
      clearTimeout(cloudSyncTimer);
      cloudSyncTimer = setTimeout(() => { void syncNow({ silent: true }).catch(() => {}); }, 600);
    }
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
function render() {
  for (const id of selectedIds) if (!captures.some(item => item.id === id)) selectedIds.delete(id);
  const shown = sortCaptures(visibleCaptures(captures, activeFilter, search.value), sortMode);
  const tagOptions = $("#linka-tag-options");
  if (tagOptions) {
    const tags = [...new Map(captures.flatMap(item => item.tags || []).map(tag => [tag.toLocaleLowerCase(), tag])).values()].sort((a, b) => a.localeCompare(b));
    tagOptions.replaceChildren(...tags.map(tag => { const option = document.createElement("option"); option.value = tag; return option; }));
  }
  const collectionOptions = $("#linka-collection-options");
  if (collectionOptions) {
    const collections = [...new Set(captures.map(item => item.collection).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    collectionOptions.replaceChildren(...collections.map(value => { const option = document.createElement("option"); option.value = value; return option; }));
  }
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
    bulkButton(captureUiText("tags"), "tags");
    bulkButton(captureUiText("collection"), "collection");
    bulkButton(captureUiText(selected.every(item => item.readLater) ? "removeLaterBulk" : "markLater"), "later");
    if (activeFilter === "trash") {
      bulkButton(captureUiText("restore") + " selected", "restore-trash");
      bulkButton(captureUiText("deletePermanent"), "delete", true);
    } else {
      bulkButton((activeFilter === "archive" ? captureUiText("unarchive") : captureUiText("archive")) + " selected", "archive");
      bulkButton(captureUiText("trash"), "delete", true);
    }
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
    kind.textContent = item.trashedAt ? captureUiText("trash") : (item.archivedAt ? captureUiText("archive") : (item.pinned ? "Pinned" : (item.readLater ? captureUiText("readLater") : (isLink(item.text) ? "Link" : "Note"))));
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
    let meta = null;
    if ((item.tags && item.tags.length) || item.collection) {
      meta = document.createElement("div");
      meta.className = "item-meta";
      for (const tag of item.tags || []) {
        const tagButton = document.createElement("button");
        tagButton.type = "button"; tagButton.className = "item-tag"; tagButton.textContent = "#" + tag;
        tagButton.title = captureUiText("tagSearch");
        tagButton.addEventListener("click", () => {
          search.value = "tag:" + tag; activeFilter = "all";
          filters.forEach(filter => filter.classList.toggle("active", filter.dataset.filter === activeFilter));
          render(); search.focus();
        });
        meta.append(tagButton);
      }
      if (item.collection) {
        const collectionButton = document.createElement("button");
        collectionButton.type = "button"; collectionButton.className = "item-collection"; collectionButton.textContent = item.collection;
        collectionButton.title = captureUiText("collectionSearch");
        collectionButton.addEventListener("click", () => {
          search.value = "in:" + item.collection; activeFilter = "all";
          filters.forEach(filter => filter.classList.toggle("active", filter.dataset.filter === activeFilter));
          render(); search.focus();
        });
        meta.append(collectionButton);
      }
    }
    const foot = document.createElement("div"); foot.className = "item-foot";
    const date = document.createElement("span"); date.className = "date"; date.textContent = formatDate(item.updatedAt || item.createdAt);
    const actions = document.createElement("div"); actions.className = "actions";
    actions.append(makeAction("Copy", "copy", item.id));
    if (item.trashedAt) {
      actions.append(makeAction(captureUiText("restore"), "restore-trash", item.id), makeAction(captureUiText("deletePermanent"), "delete-permanent", item.id));
    } else {
      actions.append(makeAction(item.readLater ? captureUiText("removeLater") : captureUiText("later"), "later", item.id));
      actions.append(makeAction(item.archivedAt ? captureUiText("unarchive") : captureUiText("archive"), "archive", item.id));
      actions.append(makeAction("Edit", "edit", item.id), makeAction(captureUiText("trash"), "delete", item.id));
    }
    if (item.text.length > 240) {
      const expand = makeAction(expandedCards.has(item.id) ? "Show less" : "Read more", "expand", item.id);
      expand.setAttribute("aria-expanded", String(expandedCards.has(item.id)));
      actions.prepend(expand);
    }
    foot.append(date, actions);
    card.append(head, ...previewBits, body);
    if (meta) card.append(meta);
    card.append(foot);
    list.append(card);
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
  const count = document.createElement("span"); const scope = document.createElement("span"); scope.textContent = "Across links, notes and documents";
  info.append(count, scope);
  const savedSearchToolbar = document.createElement("div"); savedSearchToolbar.className = "saved-search-toolbar";
  const savedSearchSelect = document.createElement("select"); savedSearchSelect.className = "saved-search-select"; savedSearchSelect.setAttribute("aria-label", captureUiText("savedViews"));
  const recentSearchSelect = document.createElement("select"); recentSearchSelect.className = "saved-search-select recent-search-select"; recentSearchSelect.setAttribute("aria-label", captureUiText("recentViews")); recentSearchSelect.title = captureUiText("recentViews");
  const savedSearchSave = document.createElement("button"); savedSearchSave.type = "button"; savedSearchSave.className = "search-save-button"; savedSearchSave.textContent = captureUiText("saveView");
  const savedSearchRemove = document.createElement("button"); savedSearchRemove.type = "button"; savedSearchRemove.className = "search-save-button secondary"; savedSearchRemove.textContent = captureUiText("removeView");
  const recentSearchClear = document.createElement("button"); recentSearchClear.type = "button"; recentSearchClear.className = "search-save-button secondary"; recentSearchClear.textContent = captureUiText("clearRecent");
  savedSearchToolbar.append(savedSearchSelect, savedSearchSave, savedSearchRemove, recentSearchSelect, recentSearchClear);
  const results = document.createElement("div"); results.className = "search-space-results"; results.setAttribute("role", "listbox"); results.setAttribute("aria-label", "Search results");
  results.addEventListener("click", () => rememberRecentSearch(input.value));
  content.append(head, searchWrap, info, savedSearchToolbar, results);
  const SAVED_SEARCHES_KEY = "linka.savedSearches.v1";
  let savedSearches = [];
  const readSavedSearches = () => {
    try {
      const value = JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || "[]");
      return Array.isArray(value) ? value.filter(item => item && typeof item.name === "string" && typeof item.query === "string").slice(0, 15) : [];
    } catch { return []; }
  };
  const renderSavedSearches = selectedQuery => {
    savedSearches = readSavedSearches();
    const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = captureUiText("savedViews");
    savedSearchSelect.replaceChildren(placeholder);
    for (const item of savedSearches) {
      const option = document.createElement("option"); option.value = item.query; option.textContent = item.name;
      savedSearchSelect.append(option);
    }
    savedSearchSelect.value = selectedQuery && savedSearches.some(item => item.query === selectedQuery) ? selectedQuery : "";
    savedSearchRemove.disabled = !savedSearchSelect.value;
  };
  renderSavedSearches(input.value.trim());
  const RECENT_SEARCHES_KEY = "linka.recentSearches.v1";
  const readRecentSearches = () => {
    try {
      const value = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
      return Array.isArray(value) ? [...new Set(value.filter(item => typeof item === "string" && item.trim()))].slice(0, 10) : [];
    } catch { return []; }
  };
  const renderRecentSearches = selectedQuery => {
    const recent = readRecentSearches();
    const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = captureUiText("recentViews");
    recentSearchSelect.replaceChildren(placeholder);
    for (const query of recent) {
      const option = document.createElement("option"); option.value = query; option.textContent = query.slice(0, 64);
      recentSearchSelect.append(option);
    }
    recentSearchSelect.value = selectedQuery && recent.includes(selectedQuery) ? selectedQuery : "";
    recentSearchClear.disabled = recent.length === 0;
  };
  const rememberRecentSearch = value => {
    const query = String(value || "").trim();
    if (query.length < 2) return;
    const next = [query, ...readRecentSearches().filter(item => item !== query)].slice(0, 10);
    try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)); renderRecentSearches(query); } catch {}
  };
  renderRecentSearches();
  recentSearchSelect.addEventListener("change", () => {
    if (!recentSearchSelect.value) return;
    input.value = recentSearchSelect.value;
    void refresh();
    input.focus();
  });
  recentSearchClear.addEventListener("click", () => {
    try { localStorage.removeItem(RECENT_SEARCHES_KEY); renderRecentSearches(); say(captureUiText("recentCleared")); } catch {}
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && input.value.trim().length >= 2) rememberRecentSearch(input.value);
  });
  savedSearchSave.addEventListener("click", () => {
    const query = input.value.trim();
    if (!query) { say(captureUiText("enterSearch")); return; }
    const existing = savedSearches.find(item => item.query === query);
    const name = window.prompt(captureUiText("nameView"), existing?.name || query.slice(0, 48));
    if (!name || !name.trim()) return;
    const next = [{ name: name.trim().slice(0, 48), query, updatedAt: Date.now() }, ...savedSearches.filter(item => item.query !== query)].slice(0, 15);
    try {
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(next));
      renderSavedSearches(query);
      say(captureUiText("viewSaved"));
    } catch { say("Could not save this search. Check available local storage."); }
  });
  savedSearchSelect.addEventListener("change", () => {
    if (!savedSearchSelect.value) return;
    input.value = savedSearchSelect.value;
    savedSearchRemove.disabled = false;
    void refresh();
    input.focus();
  });
  savedSearchRemove.addEventListener("click", () => {
    const query = savedSearchSelect.value;
    if (!query) return;
    const next = savedSearches.filter(item => item.query !== query);
    try {
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(next));
      renderSavedSearches(input.value.trim());
      say(captureUiText("viewRemoved"));
    } catch { say("Could not update saved searches."); }
  });
  const layer = modalShell(content, { dismissable: true }); layer.classList.add("search-space-layer");
  let searchSequence = 0;
  let searchTimer = null;
  async function refresh() {
    const sequence = ++searchSequence;
    const q = input.value.trim().toLocaleLowerCase();
    const found = visibleCaptures(captures, "all", input.value).slice(0, 80);
    const freeTextQuery = q.includes(":") ? "" : input.value.trim().replace(/^"|"$/g, "");
    let documentFound = [];
    if (freeTextQuery.length >= 2) {
      documentFound = await searchLinkaDocuments(freeTextQuery, 20).catch(() => []);
    }
    if (sequence !== searchSequence) return;
    renderSavedSearches(input.value.trim());
    const totalFound = found.length + documentFound.length;
    count.textContent = q ? (totalFound + " matching " + (totalFound === 1 ? "item" : "items")) : ("Recently saved · " + totalFound);
    results.replaceChildren();
    if (!found.length && !documentFound.length) {
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
    if (documentFound.length) {
      const heading = document.createElement("div");
      heading.className = "search-section-heading";
      heading.textContent = "Text documents";
      results.append(heading);
      documentFound.forEach(item => {
        const row = document.createElement("button");
        row.type = "button"; row.className = "search-result"; row.setAttribute("role", "option");
        const thumb = document.createElement("span"); thumb.className = "search-thumb"; thumb.textContent = "Aa";
        const copy = document.createElement("span"); copy.className = "search-result-copy";
        const rowTitle = document.createElement("span"); rowTitle.className = "search-result-title"; rowTitle.textContent = item.title || "Untitled document";
        const detail = document.createElement("span"); detail.className = "search-result-detail"; detail.textContent = item.excerpt || "Open local document";
        const type = document.createElement("span"); type.className = "search-result-type"; type.textContent = "Document";
        copy.append(rowTitle, detail); row.append(thumb, copy, type);
        row.addEventListener("click", async () => {
          modalRoot.replaceChildren();
          const opened = await openLinkaDocumentById(item.id).catch(() => false);
          if (!opened) say("Could not open this document. It may have been deleted.");
        });
        results.append(row);
      });
    }
  }
  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { void refresh(); }, 160);
  });
  void refresh(); input.focus(); input.select();
}
function makeAction(label, action, id) {
  const button = document.createElement("button");
  button.type = "button"; button.className = "action"; button.textContent = label;
  button.dataset.action = action; button.dataset.id = id;
  return button;
}
function resetEditor() {
  editingId = null; draft.value = ""; tagsDraft.value = ""; collectionDraft.value = ""; composeLabel.textContent = "Quick capture";
  try {
    localStorage.removeItem(QUICK_DRAFT_KEY);
    localStorage.removeItem(QUICK_DRAFT_TAGS_KEY);
    localStorage.removeItem(QUICK_DRAFT_COLLECTION_KEY);
    localStorage.removeItem(QUICK_DRAFT_PREVIEW_TITLE_KEY);
    localStorage.removeItem(QUICK_DRAFT_PREVIEW_DESCRIPTION_KEY);
    localStorage.removeItem(QUICK_DRAFT_PREVIEW_IMAGE_KEY);
  } catch {}
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
    ["Optional cloud sync", "Sign in to the same Linka account on supported devices to sync your library. Local storage and manual export/import remain available offline. Sync requires a configured shared Supabase project; never enter a service-role or secret key into the app."],
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
  note.textContent = "Войди через Google. Один аккаунт — твоя библиотека в Windows и веб-версии Linka."
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
  statusLine.textContent = "Checking the latest Linka release…";
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
      statusLine.textContent = "The Windows installer for this release is still being built. Check again shortly.";
      return;
    }
    downloadLink.href = asset.browser_download_url;
    downloadLink.hidden = false;
    downloadLink.textContent = desktopBuildVersion && compareVersions(tag, desktopBuildVersion) > 0
      ? `Download update ${tag}`
      : "Download Windows installer";
    if (desktopBuildVersion && compareVersions(tag, desktopBuildVersion) <= 0) {
      statusLine.textContent = `Linka for Windows ${desktopBuildVersion} is up to date. You can reinstall the latest installer over the existing copy.`;
    } else {
      statusLine.textContent = `Linka Windows ${tag} is available. Run the installer over your existing copy to update it.`;
    }
  } catch (error) {
    statusLine.textContent = error?.message || "Не удалось проверить обновления Windows.";
  }
}

draft.addEventListener("input",()=>{
  saveButton.disabled=!draft.value.trim();
  try {
    if (draft.value) localStorage.setItem(QUICK_DRAFT_KEY, draft.value);
    else localStorage.removeItem(QUICK_DRAFT_KEY);
  } catch {}
});
tagsDraft.addEventListener("input", saveCaptureMetadataDraft);
collectionDraft.addEventListener("input", saveCaptureMetadataDraft);
previewTitleDraft.addEventListener("input", saveCaptureMetadataDraft);
previewDescriptionDraft.addEventListener("input", saveCaptureMetadataDraft);
previewImageDraft.addEventListener("input", saveCaptureMetadataDraft);
draft.addEventListener("keydown",event=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"&&draft.value.trim()){event.preventDefault();form.requestSubmit();}});
form.addEventListener("submit",event=>{
  event.preventDefault();
  const text=draft.value.trim();
  if(!text)return;
  const previewImageUrl = normalizePreviewImageUrl(previewImageDraft.value);
  if (previewImageDraft.value.trim() && !previewImageUrl) {
    say(captureUiText("previewImageInvalid"));
    previewImageDraft.focus();
    return;
  }
  const metadata = {
    tags: parseTagInput(tagsDraft.value),
    collection: collectionDraft.value.trim().slice(0, 80),
    previewTitle: previewTitleDraft.value.trim().slice(0, 180),
    previewDescription: previewDescriptionDraft.value.trim().slice(0, 320),
    previewImageUrl
  };
  const existing=editingId?captures.find(item=>item.id===editingId):null;
  if (!existing) {
    const duplicate = findDuplicateCapture(captures, text);
    if (duplicate && !window.confirm(captureUiText("duplicatePrompt") + "\n\n" + duplicate.text.slice(0, 240))) {
      say(captureUiText("duplicateSkipped"));
      return;
    }
  }
  if(existing){
    captures=captures.map(item=>item.id===editingId?{...item,...metadata,text:text.slice(0,100000),updatedAt:Date.now()}:item);
    say("Запись обновлена");
  } else {
    captures.unshift(makeCapture(text, metadata));
    say("Сохранено на этом устройстве");
    window.dispatchEvent(new CustomEvent("linka:capture-saved",{detail:{title:"Saved to Linka",body:text.slice(0,140)}}));
  }
  if (!persist()) { render(); return; }
  resetEditor();
  render();
});
search.addEventListener("input",render);
sortOrder?.addEventListener("change", () => {
  sortMode = SORT_ORDERS.has(sortOrder.value) ? sortOrder.value : "updated";
  try { localStorage.setItem("linka.sortOrder.v1", sortMode); } catch {}
  render();
});
filters.forEach(button=>button.addEventListener("click",()=>{
  activeFilter=button.dataset.filter;filters.forEach(item=>item.classList.toggle("active",item===button));render();
}));
selectionButton.addEventListener("click", () => {
  selectionMode = !selectionMode;
  selectedIds.clear();
  render();
  if (selectionMode) say("Select the items you want to manage together");
});
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
function captureExportTitle(item) {
  return String(item.previewTitle || item.text.split(/\r?\n/)[0] || "Capture").slice(0, 180);
}
const BACKUP_PREFERENCE_KEYS = [
  "linka.theme", "linka.accent", "linka.density", "linka.effects",
  "linka.language.v1", "linka.reduceMotion", "linka.sortOrder.v1", "linka.closeToTray"
];
function readLocalJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value == null ? fallback : value;
  } catch { return fallback; }
}
function readBackupPreferences() {
  const result = {};
  for (const key of BACKUP_PREFERENCE_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) result[key] = value;
    } catch {}
  }
  return result;
}
async function downloadLinkaBackup() {
  try {
    const documents = await exportLinkaDocuments();
    const backup = createLinkaBackup({
      exportedAt: new Date().toISOString(),
      captures: captures.map(item => ({ ...item })),
      documents,
      deletedIds: [...readDeletedIds()],
      preferences: readBackupPreferences(),
      savedSearches: readLocalJson("linka.savedSearches.v1", []),
      recentSearches: readLocalJson("linka.recentSearches.v1", [])
    });
    const blob = new Blob([JSON.stringify(backup, null, 2) + "\n"], { type: "application/json;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const day = new Date().toISOString().slice(0, 10);
    anchor.href = objectUrl;
    anchor.download = "linka-backup-" + day + ".json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    say(captureUiText("exportedJson"));
  } catch (error) {
    console.error("Linka backup export failed", error);
    say(captureUiText("backupFailed"));
  }
}
function applyBackupPreferences(backup) {
  const preferences = backup?.preferences || {};
  try {
    for (const [key, value] of Object.entries(preferences)) localStorage.setItem(key, value);
    localStorage.setItem("linka.savedSearches.v1", JSON.stringify(backup.savedSearches || []));
    localStorage.setItem("linka.recentSearches.v1", JSON.stringify(backup.recentSearches || []));
  } catch {
    // A quota failure should not undo imported user data; the caller reports a partial restore.
    return false;
  }
  if (preferences["linka.theme"]) setLinkaTheme(preferences["linka.theme"]);
  if (preferences["linka.accent"]) setLinkaAccent(preferences["linka.accent"]);
  if (preferences["linka.density"]) setLinkaDensity(preferences["linka.density"]);
  if (preferences["linka.effects"]) setLinkaEffects(preferences["linka.effects"]);
  if (preferences["linka.closeToTray"] === "true" || preferences["linka.closeToTray"] === "false") {
    void applyNativeCloseToTrayPreference();
  }
  if (preferences["linka.sortOrder.v1"] && SORT_ORDERS.has(preferences["linka.sortOrder.v1"])) {
    sortMode = preferences["linka.sortOrder.v1"];
    if (sortOrder) sortOrder.value = sortMode;
  }
  if (preferences["linka.reduceMotion"]) {
    const reduced = preferences["linka.reduceMotion"] === "true";
    document.documentElement.classList.toggle("reduced-motion", reduced);
    document.documentElement.dataset.reduceMotion = String(reduced);
  }
  if (preferences["linka.language.v1"]) setLanguage(preferences["linka.language.v1"]);
  return true;
}
const BACKUP_HISTORY_LAST_ATTEMPT_KEY = "linka.backupHistory.lastAttemptAt.v1";
const BACKUP_HISTORY_INTERVAL_MS = 24 * 60 * 60 * 1000;
let backupHistoryBusy = false;

function backupHistoryText(key) {
  const language = (() => { try { return localStorage.getItem("linka.language.v1") || "en"; } catch { return "en"; } })();
  const copy = {
    en: {
      title: "Local backup history", subtitle: "Snapshots stay on this device. Keep an exported JSON backup for extra safety.",
      create: "Create snapshot now", close: "Close", empty: "No snapshots yet. Linka will attempt a snapshot before a library change, at most once a day.",
      auto: "Automatic before-change snapshot", manual: "Manual snapshot", beforeRestore: "Before restore",
      download: "Download", restore: "Restore", remove: "Delete snapshot", confirmRestore: "Merge this snapshot into the current library? Matching records will return to the saved version; unrelated records will remain.",
      confirmDelete: "Delete this local snapshot? This does not delete your captures or documents.",
      created: "Local backup snapshot created.", restored: "Snapshot restored", partial: "Snapshot restored with some items skipped; check available storage.",
      deleted: "Snapshot deleted.", failed: "Could not save or read backup history. Use Export to create a full JSON backup.",
      tooLarge: "This library is too large for the local snapshot history. Export a full JSON backup instead.",
      unavailable: "Local backup history requires IndexedDB in this browser or app.", storageTitle: "Storage & library health", storageSubtitle: "Local usage estimates and non-destructive integrity checks.", refreshStorage: "Refresh report", analyzeStorage: "Check library", storageBackup: "Export full backup", openHistory: "Backup history", closeStorage: "Close", captureCount: "Captures", documentCountLabel: "Text documents", archivedCount: "Archived", trashCount: "In Trash", duplicateCount: "Potential duplicates", uniqueTags: "Unique tags", localBytes: "Local storage estimate", originUsage: "Browser/app storage usage", noQuota: "Not reported by this browser", checksOk: "No duplicate IDs or blank capture texts found.", checksWarn: "Review potential duplicate links/text before removing anything.", storageReportFailed: "Could not inspect all storage areas. Export a full backup before cleanup." ,
      busy: "A backup snapshot is already being written.", safetySnapshotFailed: "Restore cancelled: Linka could not save the current state first. Export a full JSON backup or free storage, then retry."
    },
    ru: {
      title: "История локальных копий", subtitle: "Снимки хранятся на этом устройстве. Для дополнительной защиты сохраняй полную JSON-копию.",
      create: "Создать снимок сейчас", close: "Закрыть", empty: "Снимков пока нет. Linka попытается создать снимок перед изменением библиотеки, не чаще раза в сутки.",
      auto: "Автоматически перед изменением", manual: "Создан вручную", beforeRestore: "Перед восстановлением",
      download: "Скачать", restore: "Восстановить", remove: "Удалить снимок", confirmRestore: "Объединить этот снимок с текущей библиотекой? Записи с совпадающими ID вернутся к сохранённой версии, остальные записи останутся.",
      confirmDelete: "Удалить этот локальный снимок? Записи и документы приложения не удалятся.",
      created: "Локальный снимок создан.", restored: "Снимок восстановлен", partial: "Снимок восстановлен частично. Проверь свободное место.",
      deleted: "Снимок удалён.", failed: "Не удалось сохранить или прочитать историю копий. Используй «Экспорт» для полной JSON-копии.",
      tooLarge: "Библиотека слишком велика для истории локальных снимков. Экспортируй полную JSON-копию.",
      unavailable: "История локальных копий требует IndexedDB в браузере или приложении.", storageTitle: "Хранилище и состояние библиотеки", storageSubtitle: "Приблизительный объём данных и безопасная проверка целостности.", refreshStorage: "Обновить отчёт", analyzeStorage: "Проверить библиотеку", storageBackup: "Экспорт полной копии", openHistory: "История копий", closeStorage: "Закрыть", captureCount: "Записи", documentCountLabel: "Текстовые документы", archivedCount: "В архиве", trashCount: "В корзине", duplicateCount: "Возможные дубликаты", uniqueTags: "Уникальные теги", localBytes: "Оценка локального хранилища", originUsage: "Использование хранилища браузера/приложения", noQuota: "Браузер не сообщает объём", checksOk: "Дубликаты ID и пустые записи не найдены.", checksWarn: "Проверь возможные дубликаты ссылок/текста перед удалением.", storageReportFailed: "Не удалось проверить все области хранения. Перед очисткой экспортируй полную резервную копию.",
      busy: "Сейчас уже сохраняется резервный снимок.", safetySnapshotFailed: "Восстановление отменено: сначала не удалось сохранить текущее состояние. Экспортируй полную JSON-копию или освободи место и повтори попытку."
    },
    az: {
      title: "Yerli ehtiyat nüsxə tarixçəsi", subtitle: "Sənədlər bu cihazda saxlanılır. Əlavə təhlükəsizlik üçün tam JSON ehtiyat nüsxəsi yarat.",
      create: "İndi snapshot yarat", close: "Bağla", empty: "Hələ snapshot yoxdur. Linka kitabxana dəyişməzdən əvvəl gündə ən çox bir dəfə snapshot yaratmağa çalışacaq.",
      auto: "Dəyişiklikdən əvvəl avtomatik", manual: "Əl ilə yaradılıb", beforeRestore: "Bərpadan əvvəl",
      download: "Endir", restore: "Bərpa et", remove: "Snapshot-u sil", confirmRestore: "Bu snapshot cari kitabxanaya birləşdirilsin? Eyni ID-li qeydlər saxlanmış versiyaya qayıdacaq, digər qeydlər qalacaq.",
      confirmDelete: "Bu yerli snapshot silinsin? Qeydlərin və sənədlərin özü silinməyəcək.",
      created: "Yerli snapshot yaradıldı.", restored: "Snapshot bərpa edildi", partial: "Snapshot qismən bərpa edildi. Yaddaş yerini yoxla.",
      deleted: "Snapshot silindi.", failed: "Ehtiyat nüsxə tarixçəsini saxlamaq və ya oxumaq olmadı. Tam JSON nüsxəsi üçün ixracdan istifadə et.",
      tooLarge: "Kitabxana yerli snapshot tarixçəsi üçün çox böyükdür. Tam JSON nüsxəsini ixrac et.",
      unavailable: "Yerli ehtiyat nüsxə tarixçəsi IndexedDB tələb edir.", storageTitle: "Yaddaş və kitabxana vəziyyəti", storageSubtitle: "Yerli yaddaşın təxmini ölçüsü və təhlükəsiz bütövlük yoxlaması.", refreshStorage: "Hesabatı yenilə", analyzeStorage: "Kitabxananı yoxla", storageBackup: "Tam ehtiyat nüsxəni ixrac et", openHistory: "Ehtiyat nüsxə tarixçəsi", closeStorage: "Bağla", captureCount: "Qeydlər", documentCountLabel: "Mətn sənədləri", archivedCount: "Arxivdə", trashCount: "Zibil qutusunda", duplicateCount: "Mümkün dublikatlar", uniqueTags: "Unikal teqlər", localBytes: "Yerli yaddaşın təxmini ölçüsü", originUsage: "Brauzer/tətbiq yaddaş istifadəsi", noQuota: "Brauzer məlumat vermir", checksOk: "Təkrarlanan ID və boş qeydlər tapılmadı.", checksWarn: "Silməzdən əvvəl mümkün təkrar keçidləri/mətni yoxla.", storageReportFailed: "Bütün yaddaş sahələrini yoxlamaq olmadı. Təmizləməzdən əvvəl tam ehtiyat nüsxə yarat.",
      busy: "Hazırda başqa ehtiyat snapshot yazılır.", safetySnapshotFailed: "Bərpa ləğv edildi: əvvəlcə cari vəziyyəti saxlamaq mümkün olmadı. Tam JSON nüsxəsini ixrac et və ya yaddaşda yer boşalt."
    },
    tr: {
      title: "Yerel yedek geçmişi", subtitle: "Anlık görüntüler bu cihazda kalır. Ek güvenlik için tam JSON yedeği indir.",
      create: "Şimdi anlık görüntü oluştur", close: "Kapat", empty: "Henüz anlık görüntü yok. Linka, kitaplık değişmeden önce günde en fazla bir kez görüntü oluşturmaya çalışır.",
      auto: "Değişiklik öncesi otomatik", manual: "Manuel anlık görüntü", beforeRestore: "Geri yükleme öncesi",
      download: "İndir", restore: "Geri yükle", remove: "Anlık görüntüyü sil", confirmRestore: "Bu görüntü geçerli kitaplıkla birleştirilsin mi? Eşleşen kayıtlar kaydedilmiş sürüme döner, diğer kayıtlar kalır.",
      confirmDelete: "Bu yerel görüntü silinsin mi? Kayıtların ve belgelerin kendisi silinmez.",
      created: "Yerel yedek görüntüsü oluşturuldu.", restored: "Görüntü geri yüklendi", partial: "Görüntü kısmen geri yüklendi. Depolama alanını kontrol et.",
      deleted: "Görüntü silindi.", failed: "Yedek geçmişi okunamadı veya kaydedilemedi. Tam JSON yedeği için Dışa Aktar'ı kullan.",
      tooLarge: "Kitaplık yerel yedek geçmişi için çok büyük. Tam JSON yedeğini dışa aktar.",
      unavailable: "Yerel yedek geçmişi IndexedDB gerektirir.", storageTitle: "Depolama ve kitaplık durumu", storageSubtitle: "Yerel kullanım tahminleri ve veri silmeyen bütünlük kontrolleri.", refreshStorage: "Raporu yenile", analyzeStorage: "Kitaplığı denetle", storageBackup: "Tam yedeği dışa aktar", openHistory: "Yedek geçmişi", closeStorage: "Kapat", captureCount: "Kayıtlar", documentCountLabel: "Metin belgeleri", archivedCount: "Arşivde", trashCount: "Çöp kutusunda", duplicateCount: "Olası kopyalar", uniqueTags: "Benzersiz etiketler", localBytes: "Yerel depolama tahmini", originUsage: "Tarayıcı/uygulama depolama kullanımı", noQuota: "Tarayıcı bilgi vermiyor", checksOk: "Yinelenen kimlik veya boş kayıt bulunmadı.", checksWarn: "Silmeden önce olası yinelenen bağlantıları/metni gözden geçir.", storageReportFailed: "Tüm depolama alanları incelenemedi. Temizlemeden önce tam yedek dışa aktar.",
      busy: "Başka bir yedek görüntüsü şu anda kaydediliyor.", safetySnapshotFailed: "Geri yükleme iptal edildi: önce mevcut durum kaydedilemedi. Tam JSON yedeğini dışa aktar veya depolama alanı açıp yeniden dene."
    }
  };
  return (copy[language] || copy.en)[key] || copy.en[key] || key;
}

async function buildLinkaBackup(captureSnapshot = captures) {
  const documents = await exportLinkaDocuments();
  return createLinkaBackup({
    exportedAt: new Date().toISOString(),
    captures: captureSnapshot.map(item => ({ ...item, tags: [...(item.tags || [])] })),
    documents,
    deletedIds: [...readDeletedIds()],
    preferences: readBackupPreferences(),
    savedSearches: readLocalJson("linka.savedSearches.v1", []),
    recentSearches: readLocalJson("linka.recentSearches.v1", [])
  });
}

async function storeBackupHistorySnapshot(captureSnapshot = captures, reason = "manual", automatic = false) {
  if (backupHistoryBusy) return { saved: false, reason: "busy" };
  const now = Date.now();
  if (automatic) {
    let lastAttempt = 0;
    try { lastAttempt = Number(localStorage.getItem(BACKUP_HISTORY_LAST_ATTEMPT_KEY) || 0); } catch {}
    if (lastAttempt && now - lastAttempt < BACKUP_HISTORY_INTERVAL_MS) return { saved: false, reason: "not-due" };
  }

  backupHistoryBusy = true;
  try {
    const backup = await buildLinkaBackup(captureSnapshot);
    if (!backup.captures.length && !backup.documents.length) return { saved: false, reason: "empty" };
    if (automatic) {
      try { localStorage.setItem(BACKUP_HISTORY_LAST_ATTEMPT_KEY, String(now)); } catch {}
    }
    const bytes = new Blob([JSON.stringify(backup)]).size;
    if (bytes > MAX_AUTOMATIC_SNAPSHOT_BYTES) return { saved: false, reason: "too-large", bytes };
    const snapshot = {
      id: "snapshot-" + now.toString(36) + "-" + Math.random().toString(36).slice(2, 8),
      createdAt: now,
      reason,
      captureCount: backup.captures.length,
      documentCount: backup.documents.length,
      bytes,
      backup
    };
    const result = await saveBackupSnapshot(snapshot);
    if (result.saved && automatic) {
      try { localStorage.setItem(BACKUP_HISTORY_LAST_ATTEMPT_KEY, String(now)); } catch {}
    }
    return { ...result, snapshot, bytes };
  } finally {
    backupHistoryBusy = false;
  }
}

async function saveAutomaticBackupSnapshot(previousCaptures) {
  return storeBackupHistorySnapshot(previousCaptures, "automatic-before-change", true);
}
setLinkaDocumentBeforeSave(() => {
  const recoveryState = getCaptureRecovery();
  if (recoveryState && !recoveryState.acknowledged) return;
  const previousState = persistedCaptures.map(item => ({ ...item, tags: [...(item.tags || [])] }));
  return saveAutomaticBackupSnapshot(previousState);
});

function downloadBackupPayload(backup, filename = "linka-backup.json") {
  const blob = new Blob([JSON.stringify(backup, null, 2) + "\n"], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

async function restoreBackupHistorySnapshot(backup) {
  const safetySnapshot = await storeBackupHistorySnapshot(captures, "before-restore", false);
  if (!safetySnapshot.saved && safetySnapshot.reason !== "empty") {
    throw new Error(backupHistoryText("safetySnapshotFailed"));
  }
  const validated = parseLinkaBackup(backup);
  if (!validated) throw new Error("Invalid Linka backup snapshot.");
  const normalized = validated.captures
    .filter(item => item && typeof item === "object" && typeof item.text === "string")
    .map(item => normalizeCapture(item))
    .filter(Boolean);
  const importedIds = new Set(normalized.map(item => item.id));
  const previous = captures.map(item => ({ ...item, tags: [...(item.tags || [])] }));
  const map = new Map(captures.map(item => [item.id, item]));
  normalized.forEach(item => map.set(item.id, item));
  const next = [...map.values()].sort((a, b) =>
    Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
    Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0)
  );
  if (!saveCaptures(next)) throw new Error("Could not save restored captures; the current library was kept.");

  const deleted = new Set(readDeletedIds());
  validated.deletedIds.forEach(id => deleted.add(id));
  importedIds.forEach(id => deleted.delete(id));
  if (!setDeletedIds([...deleted])) {
    const rolledBack = saveCaptures(previous);
    if (!rolledBack) throw new Error("Restore rollback failed. Export the current library immediately.");
    throw new Error("Restore cancelled because cloud deletion markers could not be saved.");
  }

  captures = next;
  persistedCaptures = captures.map(item => ({ ...item, tags: [...(item.tags || [])] }));
  localDataRevision += 1;
  let documentResult = { imported: 0, skipped: 0 };
  let documentFailed = false;
  if (validated.documents.length) {
    try { documentResult = await importLinkaDocuments(validated.documents); }
    catch (error) { console.error("Backup history document restore failed", error); documentFailed = true; }
  }
  const preferencesApplied = applyBackupPreferences(validated);
  scheduleCloudSync();
  render();
  return {
    captures: normalized.length,
    documents: documentResult.imported,
    partial: documentFailed || !preferencesApplied || documentResult.skipped > 0
  };
}

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
  if (value < 1024 * 1024 * 1024) return (value / (1024 * 1024)).toFixed(2) + " MB";
  return (value / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}
async function inspectLinkaStorage() {
  const docs = await exportLinkaDocuments();
  const captureJson = JSON.stringify(captures);
  const documentJson = JSON.stringify(docs);
  let localStorageBytes = 0;
  let localStorageKeys = 0;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      localStorageKeys += 1;
      localStorageBytes += new Blob([key, localStorage.getItem(key) || ""]).size;
    }
  } catch {}
  let usage = null, quota = null;
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (Number.isFinite(estimate?.usage)) usage = estimate.usage;
    if (Number.isFinite(estimate?.quota)) quota = estimate.quota;
  } catch {}
  const ids = new Set();
  let duplicateIds = 0, blankTexts = 0;
  const duplicateKeys = new Map();
  let duplicateCaptures = 0;
  for (const item of captures) {
    if (!item) { blankTexts += 1; continue; }
    const id = item.id == null ? "" : String(item.id).trim();
    if (id) {
      if (ids.has(id)) duplicateIds += 1;
      ids.add(id);
    }
    if (!String(item.text || "").trim()) { blankTexts += 1; continue; }
    if (item.trashedAt) continue;
    const key = normalizeDuplicateKey(item.text);
    if (!key) continue;
    if (duplicateKeys.has(key)) {
      duplicateCaptures += 1;
      duplicateKeys.set(key, duplicateKeys.get(key) + 1);
    } else duplicateKeys.set(key, 1);
  }
  return {
    captures: captures.length,
    documents: docs.length,
    archived: captures.filter(item => item.archivedAt && !item.trashedAt).length,
    trashed: captures.filter(item => item.trashedAt).length,
    uniqueTags: new Set(captures.flatMap(item => item.tags || [])).size,
    duplicateUrlsOrTexts: duplicateCaptures,
    duplicateIds,
    blankTexts,
    localStorageKeys,
    localStorageBytes,
    captureBytes: new Blob([captureJson]).size,
    documentBytes: new Blob([documentJson]).size,
    usage,
    quota
  };
}
async function showStorageHealth() {
  const content = document.createElement("div");
  content.className = "storage-health-panel";
  const heading = document.createElement("h2"); heading.textContent = backupHistoryText("storageTitle");
  const subtitle = document.createElement("p"); subtitle.className = "storage-health-subtitle"; subtitle.textContent = backupHistoryText("storageSubtitle");
  const controls = document.createElement("div"); controls.className = "storage-health-controls";
  const refresh = document.createElement("button"); refresh.type = "button"; refresh.className = "ghost"; refresh.textContent = backupHistoryText("refreshStorage");
  const analyze = document.createElement("button"); analyze.type = "button"; analyze.className = "ghost"; analyze.textContent = backupHistoryText("analyzeStorage");
  const backup = document.createElement("button"); backup.type = "button"; backup.className = "ghost"; backup.textContent = backupHistoryText("storageBackup");
  const history = document.createElement("button"); history.type = "button"; history.className = "ghost"; history.textContent = backupHistoryText("openHistory");
  const close = document.createElement("button"); close.type = "button"; close.className = "ghost"; close.textContent = backupHistoryText("closeStorage");
  controls.append(refresh, analyze, backup, history, close);
  const statusLine = document.createElement("p"); statusLine.className = "storage-health-status"; statusLine.setAttribute("role", "status");
  const metrics = document.createElement("div"); metrics.className = "storage-health-metrics";
  const diagnostics = document.createElement("div"); diagnostics.className = "storage-health-diagnostics";
  content.append(heading, subtitle, controls, statusLine, metrics, diagnostics);
  const layer = modalShell(content, { dismissable: true });
  close.addEventListener("click", () => layer.remove());
  backup.addEventListener("click", async () => {
    $("#export-format").value = "json";
    await downloadLinkaBackup();
  });
  history.addEventListener("click", async () => {
    layer.remove();
    await showBackupHistory();
  });
  const refreshReport = async (runIntegrityCheck = false) => {
    refresh.disabled = true; analyze.disabled = true;
    statusLine.textContent = "";
    try {
      const report = await inspectLinkaStorage();
      const items = [
        [backupHistoryText("captureCount"), report.captures],
        [backupHistoryText("documentCountLabel"), report.documents],
        [backupHistoryText("archivedCount"), report.archived],
        [backupHistoryText("trashCount"), report.trashed],
        [backupHistoryText("uniqueTags"), report.uniqueTags],
        [backupHistoryText("localBytes"), formatBytes(report.localStorageBytes) + " · " + report.localStorageKeys + " keys"],
        ["Captures JSON", formatBytes(report.captureBytes)],
        ["Documents JSON", formatBytes(report.documentBytes)],
        [backupHistoryText("originUsage"), report.usage == null ? backupHistoryText("noQuota") : formatBytes(report.usage) + (report.quota == null ? "" : " / " + formatBytes(report.quota))]
      ];
      metrics.replaceChildren(...items.map(([label, value]) => {
        const card = document.createElement("div"); card.className = "storage-health-metric";
        const name = document.createElement("span"); name.textContent = label;
        const amount = document.createElement("strong"); amount.textContent = String(value);
        card.append(name, amount); return card;
      }));
      diagnostics.replaceChildren();
      if (runIntegrityCheck) {
        const found = report.duplicateIds + report.blankTexts + report.duplicateUrlsOrTexts;
        const result = document.createElement("p"); result.className = found ? "storage-health-warning" : "storage-health-ok";
        result.textContent = found
          ? backupHistoryText("checksWarn") + " IDs: " + report.duplicateIds + ", blank: " + report.blankTexts + ", URL/text duplicates: " + report.duplicateUrlsOrTexts + "."
          : backupHistoryText("checksOk");
        diagnostics.append(result);
      }
    } catch (error) {
      console.error("Linka storage inspection failed", error);
      statusLine.textContent = backupHistoryText("storageReportFailed");
    } finally { refresh.disabled = false; analyze.disabled = false; }
  };
  refresh.addEventListener("click", () => { void refreshReport(false); });
  analyze.addEventListener("click", () => { void refreshReport(true); });
  await refreshReport(false);
}

async function showBackupHistory() {
  const content = document.createElement("div");
  content.className = "backup-history-panel";
  const heading = document.createElement("h2"); heading.textContent = backupHistoryText("title");
  const subtitle = document.createElement("p"); subtitle.className = "backup-history-subtitle"; subtitle.textContent = backupHistoryText("subtitle");
  const controls = document.createElement("div"); controls.className = "backup-history-controls";
  const createButton = document.createElement("button"); createButton.type = "button"; createButton.className = "ghost"; createButton.textContent = backupHistoryText("create");
  const healthButton = document.createElement("button"); healthButton.type = "button"; healthButton.className = "ghost"; healthButton.textContent = backupHistoryText("storageTitle");
  const closeButton = document.createElement("button"); closeButton.type = "button"; closeButton.className = "ghost"; closeButton.textContent = backupHistoryText("close");
  controls.append(createButton, healthButton, closeButton);
  const statusLine = document.createElement("p"); statusLine.className = "backup-history-status"; statusLine.setAttribute("role", "status");
  const rows = document.createElement("div"); rows.className = "backup-history-rows";
  content.append(heading, subtitle, controls, statusLine, rows);
  const layer = modalShell(content, { dismissable: true });
  closeButton.addEventListener("click", () => layer.remove());
  healthButton.addEventListener("click", async () => {
    layer.remove();
    await showStorageHealth();
  });

  const refreshRows = async () => {
    rows.replaceChildren();
    let available = false;
    try { available = await isBackupHistoryAvailable(); }
    catch { available = false; }
    if (!available) {
      statusLine.textContent = backupHistoryText("unavailable");
      const note = document.createElement("p");
      note.className = "backup-history-empty";
      note.textContent = backupHistoryText("unavailable");
      rows.append(note);
      return;
    }
    let snapshots;
    try { snapshots = await listBackupSnapshots(); }
    catch (error) { console.error("Could not list backup history", error); statusLine.textContent = backupHistoryText("failed"); return; }
    if (!snapshots.length) {
      const empty = document.createElement("p"); empty.className = "backup-history-empty"; empty.textContent = backupHistoryText("empty"); rows.append(empty); return;
    }
    snapshots.forEach(snapshot => {
      const row = document.createElement("article"); row.className = "backup-history-row";
      const copy = document.createElement("div"); copy.className = "backup-history-copy";
      const title = document.createElement("strong");
      title.textContent = snapshot.reason === "manual" ? backupHistoryText("manual") :
        snapshot.reason === "before-restore" ? backupHistoryText("beforeRestore") : backupHistoryText("auto");
      const date = document.createElement("span"); date.textContent = formatDate(snapshot.createdAt);
      const details = document.createElement("small");
      details.textContent = snapshot.captureCount + " captures · " + snapshot.documentCount + " documents · " +
        Math.max(1, Math.round(Number(snapshot.bytes || 0) / 1024)) + " KB";
      copy.append(title, date, details);
      const actions = document.createElement("div"); actions.className = "backup-history-row-actions";
      const download = document.createElement("button"); download.type = "button"; download.className = "action"; download.textContent = backupHistoryText("download");
      const restore = document.createElement("button"); restore.type = "button"; restore.className = "action"; restore.textContent = backupHistoryText("restore");
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "action danger"; remove.textContent = backupHistoryText("remove");
      download.addEventListener("click", async () => {
        try {
          const stored = await getBackupSnapshot(snapshot.id);
          if (!stored?.backup) throw new Error("Snapshot payload is missing.");
          const datePart = new Date(stored.createdAt).toISOString().slice(0, 10);
          downloadBackupPayload(stored.backup, "linka-snapshot-" + datePart + ".json");
        } catch (error) { console.error(error); statusLine.textContent = backupHistoryText("failed"); }
      });
      restore.addEventListener("click", async () => {
        if (!window.confirm(backupHistoryText("confirmRestore"))) return;
        restore.disabled = true;
        try {
          const stored = await getBackupSnapshot(snapshot.id);
          if (!stored?.backup) throw new Error("Snapshot payload is missing.");
          const result = await restoreBackupHistorySnapshot(stored.backup);
          layer.remove();
          say((result.partial ? backupHistoryText("partial") : backupHistoryText("restored")) +
            " · " + result.captures + " captures, " + result.documents + " documents");
        } catch (error) {
          console.error("Could not restore backup history snapshot", error);
          statusLine.textContent = error?.message || backupHistoryText("failed");
        } finally { restore.disabled = false; }
      });
      remove.addEventListener("click", async () => {
        if (!window.confirm(backupHistoryText("confirmDelete"))) return;
        remove.disabled = true;
        try {
          await deleteBackupSnapshot(snapshot.id);
          statusLine.textContent = backupHistoryText("deleted");
          await refreshRows();
        } catch (error) {
          console.error(error);
          statusLine.textContent = backupHistoryText("failed");
        } finally { remove.disabled = false; }
      });
      actions.append(download, restore, remove);
      row.append(copy, actions);
      rows.append(row);
    });
  };

  createButton.addEventListener("click", async () => {
    createButton.disabled = true;
    statusLine.textContent = "";
    try {
      const result = await storeBackupHistorySnapshot(captures, "manual", false);
      if (!result.saved) {
        statusLine.textContent = result.reason === "too-large" ? backupHistoryText("tooLarge") :
          result.reason === "busy" ? backupHistoryText("busy") : backupHistoryText("unavailable");
      } else {
        statusLine.textContent = backupHistoryText("created");
        await refreshRows();
      }
    } catch (error) {
      console.error("Could not create manual backup snapshot", error);
      statusLine.textContent = backupHistoryText("failed");
    } finally { createButton.disabled = false; }
  });
  await refreshRows();
}

function exportCaptureItems(items, baseName = "linka-inbox") {
  const format = $("#export-format")?.value || "json";
  let content = "", mime = "application/json;charset=utf-8", extension = format, statusKey = "exportedJson";
  if (format === "md") {
    mime = "text/markdown;charset=utf-8"; statusKey = "exportedMarkdown";
    content = "# Linka export\n\n" + items.map((item, index) => {
      const state = item.trashedAt ? "Trash" : item.archivedAt ? "Archive" : item.readLater ? "Read later" : item.pinned ? "Pinned" : "Inbox";
      const saved = new Date(Number(item.createdAt || item.updatedAt || Date.now())).toISOString();
      return "## " + (index + 1) + ". " + captureExportTitle(item).replace(/\r?\n/g, " ") +
        "\n\n- Saved: " + saved +
        "\n- Tags: " + ((item.tags || []).join(", ") || "—") +
        "\n- Collection: " + (item.collection || "—") +
        "\n- State: " + state + "\n\n" + item.text + "\n";
    }).join("\n\n---\n\n");
  } else if (format === "txt") {
    mime = "text/plain;charset=utf-8"; statusKey = "exportedText";
    content = items.map((item, index) => {
      const saved = new Date(Number(item.createdAt || item.updatedAt || Date.now())).toLocaleString();
      return "[" + (index + 1) + "] " + captureExportTitle(item) +
        "\nSaved: " + saved +
        "\nTags: " + ((item.tags || []).join(", ") || "—") +
        "\nCollection: " + (item.collection || "—") + "\n\n" + item.text;
    }).join("\n\n--------------------------------------------------\n\n");
  } else if (format === "html") {
    mime = "text/html;charset=utf-8"; statusKey = "exportedHtml";
    const cards = items.map(item => {
      const body = escapeHtml(item.text);
      const title = escapeHtml(captureExportTitle(item));
      const tags = escapeHtml((item.tags || []).join(", "));
      const collection = escapeHtml(item.collection || "—");
      const date = escapeHtml(new Date(Number(item.createdAt || item.updatedAt || Date.now())).toLocaleString());
      const source = isLink(item.text) && /^https?:\/\//i.test(item.text.trim())
        ? '<p><a rel="noopener noreferrer" href="' + escapeHtml(item.text.trim()) + '">Open original link</a></p>' : "";
      const cover = /^https:\/\//i.test(item.previewImageUrl || "")
        ? '<img loading="lazy" alt="" src="' + escapeHtml(item.previewImageUrl) + '">' : "";
      return '<article><h2>' + title + '</h2><p class="meta">' + date + ' · ' + tags + ' · ' + collection +
        '</p>' + cover + '<pre>' + body + '</pre>' + source + '</article>';
    }).join("\n");
    content = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Linka export</title><style>body{max-width:900px;margin:40px auto;padding:0 20px;font:16px/1.6 system-ui,sans-serif;color:#202124;background:#f7f7f5}' +
      'article{padding:22px;margin:18px 0;border:1px solid #ddd;border-radius:14px;background:white}h2{font-size:20px;margin-top:0}.meta{color:#666;font-size:12px}' +
      'pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}img{max-width:100%;max-height:360px;object-fit:contain;border-radius:8px}</style>' +
      '<body><h1>Linka export</h1>' + cards + '</body></html>';
  } else {
    content = JSON.stringify(items, null, 2);
    extension = "json"; statusKey = "exportedJson";
  }
  const blob = new Blob([content], { type: mime });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl; anchor.download = baseName + "." + extension; anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  say(captureUiText(statusKey));
}

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
    if (!persist()) { render(); return; }
    render(); say(pinned ? "Selected items pinned" : "Selected items unpinned"); return;
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
    exportCaptureItems(selected, "linka-selection");
    return;
  }
  if (action === "tags") {
    const current = [...new Set(selected.flatMap(item => item.tags || []))].join(", ");
    const value = window.prompt(captureUiText("tagPrompt"), current);
    if (value === null) return;
    const tags = parseTagInput(value);
    const now = Date.now();
    captures = captures.map(item => selectedIds.has(item.id) ? { ...item, tags, updatedAt: now } : item);
    if (!persist()) { render(); return; }
    selectedIds.clear(); selectionMode = false;
    render(); say(captureUiText("tags") + ": " + tags.length); return;
  }
  if (action === "collection") {
    const collections = [...new Set(selected.map(item => item.collection || ""))];
    const current = collections.length === 1 ? collections[0] : "";
    const value = window.prompt(captureUiText("collectionPrompt"), current);
    if (value === null) return;
    const collection = value.trim().slice(0, 80);
    const now = Date.now();
    captures = captures.map(item => selectedIds.has(item.id) ? { ...item, collection, updatedAt: now } : item);
    if (!persist()) { render(); return; }
    selectedIds.clear(); selectionMode = false;
    render(); say(captureUiText("collection") + ": " + (collection || "—")); return;
  }
  if (action === "later") {
    const mark = !selected.every(item => item.readLater);
    const now = Date.now();
    captures = captures.map(item => selectedIds.has(item.id) ? { ...item, readLater: mark, updatedAt: now } : item);
    if (!persist()) { render(); return; }
    selectedIds.clear(); selectionMode = false;
    render(); say(mark ? captureUiText("savedLater") : captureUiText("removedLater")); return;
  }
  if (action === "archive") {
    const archive = activeFilter !== "archive";
    const now = Date.now();
    captures = captures.map(item => selectedIds.has(item.id) ? { ...item, archivedAt: archive ? now : 0, trashedAt: 0, updatedAt: now } : item);
    if (!persist()) { render(); return; }
    selectedIds.clear(); selectionMode = false;
    render(); say(archive ? captureUiText("archived") : captureUiText("unarchived")); return;
  }
  if (action === "restore-trash") {
    const now = Date.now();
    captures = captures.map(item => selectedIds.has(item.id) ? { ...item, archivedAt: 0, trashedAt: 0, updatedAt: now } : item);
    if (!persist()) { render(); return; }
    selectedIds.clear(); selectionMode = false;
    render(); say(captureUiText("restored")); return;
  }
  if (action === "delete") {
    if (activeFilter !== "trash") {
      if (!window.confirm("Move " + selected.length + " selected item(s) to Trash? You can restore them later.")) return;
      const now = Date.now();
      captures = captures.map(item => selectedIds.has(item.id) ? { ...item, archivedAt: 0, trashedAt: now, updatedAt: now } : item);
      if (!persist()) { render(); return; }
      selectedIds.clear(); selectionMode = false;
      render(); say(captureUiText("movedTrash")); return;
    }
    if (!window.confirm(captureUiText("confirmPermanent"))) return;
    const removed = selected;
    captures = captures.filter(item => !selectedIds.has(item.id));
    if (!persist()) { render(); return; }
    if (!addDeletedIds(removed.map(item => item.id))) {
      captures = [...captures, ...removed].sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
      if (!persist()) say("Could not safely record cloud deletion markers. Export a backup and pause cloud sync before continuing.");
      else say("Permanent deletion cancelled because the cloud deletion markers could not be saved.");
      render();
      return;
    }
    scheduleCloudSync();
    selectedIds.clear(); selectionMode = false;
    if (editingId && !captures.some(item => item.id === editingId)) resetEditor();
    render(); say(captureUiText("deletedPermanent"));
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
  else if(action==="pin"){captures=captures.map(entry=>entry.id===id?{...entry,pinned:!entry.pinned,updatedAt:Date.now()}:entry);if(!persist()){render();return;}render();say(item.pinned?"Откреплено":"Закреплено");}
  else if(action==="later"){captures=captures.map(entry=>entry.id===id?{...entry,readLater:!entry.readLater,updatedAt:Date.now()}:entry);if(!persist()){render();return;}render();say(item.readLater?captureUiText("removedLater"):captureUiText("savedLater"));}
  else if(action==="archive"){
    const archive = !item.archivedAt;
    captures = captures.map(entry => entry.id === id ? { ...entry, archivedAt: archive ? Date.now() : 0, trashedAt: 0, updatedAt: Date.now() } : entry);
    if (!persist()) { render(); return; }
    render(); say(archive ? captureUiText("archived") : captureUiText("unarchived"));
  }
  else if(action==="restore-trash"){
    captures = captures.map(entry => entry.id === id ? { ...entry, archivedAt: 0, trashedAt: 0, updatedAt: Date.now() } : entry);
    if (!persist()) { render(); return; }
    render(); say(captureUiText("restored"));
  }
  else if(action==="delete-permanent"){
    if (!window.confirm(captureUiText("confirmPermanent"))) return;
    const removed = item;
    captures = captures.filter(entry => entry.id !== id);
    if (!persist()) { render(); return; }
    if (!addDeletedId(id)) {
      captures = [...captures, removed].sort((a,b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
      if (!persist()) say("Could not safely record the cloud deletion marker. Export a backup and pause cloud sync before continuing.");
      else say("Permanent deletion cancelled because the cloud deletion marker could not be saved.");
      render(); return;
    }
    scheduleCloudSync();
    if (editingId === id) resetEditor();
    render(); say(captureUiText("deletedPermanent"));
  }
  else if(action==="delete"){
    const now = Date.now();
    captures = captures.map(entry => entry.id === id ? { ...entry, archivedAt: 0, trashedAt: now, updatedAt: now } : entry);
    if (!persist()) { render(); return; }
    if(editingId===id)resetEditor();
    render();say(captureUiText("movedTrash"));
    window.dispatchEvent(new CustomEvent("linka:toast", { detail: {
      message: captureUiText("movedTrash"),
      actionLabel: "Undo",
      onAction: () => {
        captures = captures.map(entry => entry.id === id ? { ...entry, trashedAt: 0, archivedAt: 0, updatedAt: Date.now() } : entry);
        if (!persist()) { render(); return; }
        render(); say(captureUiText("restored"));
      }
    }}));
  }
  else if(action==="edit"){editingId=id;draft.value=item.text;tagsDraft.value=(item.tags||[]).join(", ");collectionDraft.value=item.collection||"";previewTitleDraft.value=item.previewTitle||"";previewDescriptionDraft.value=item.previewDescription||"";previewImageDraft.value=item.previewImageUrl||"";const previewDetails=document.querySelector(".capture-preview-details");if(previewDetails)previewDetails.open=Boolean(item.previewTitle||item.previewDescription||item.previewImageUrl);composeLabel.textContent="Edit capture";saveButton.textContent="Save changes ↗";saveButton.disabled=false;saveCaptureMetadataDraft();draft.focus();window.scrollTo({top:0,behavior:"smooth"});}
  else if(action==="copy"){try{await navigator.clipboard.writeText(item.text);say("Скопировано");}catch{draft.value=item.text;draft.focus();draft.select();say("Текст выделен для копирования вручную");}}
});
$("#backup-history-button").addEventListener("click", () => { void showBackupHistory(); });
$("#export-button").addEventListener("click", async () => {
  if (($("#export-format")?.value || "json") === "json") {
    await downloadLinkaBackup();
  } else {
    exportCaptureItems(captures, "linka-inbox");
  }
});
$("#import-button").addEventListener("click",()=>$("#import-file").click());
$("#import-file").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const raw = await file.text();
    let backup = null;
    let imported = null;
    let bookmarkImport = false;
    let bookmarkLimitHit = false;

    if (/\.html?$/i.test(file.name) || file.type === "text/html") {
      bookmarkImport = true;
      const parsedHtml = new DOMParser().parseFromString(raw, "text/html");
      const anchors = [...parsedHtml.querySelectorAll("a[href]")];
      bookmarkLimitHit = anchors.length > 5000;
      imported = anchors.slice(0, 5000).flatMap(anchor => {
        const href = anchor.getAttribute("href") || "";
        let url;
        try { url = new URL(href); } catch { return []; }
        if (url.protocol !== "http:" && url.protocol !== "https:") return [];
        const title = String(anchor.textContent || "").replace(/\s+/g, " ").trim().slice(0, 180) || url.hostname;
        const createdSeconds = Number(anchor.getAttribute("ADD_DATE") || 0);
        const updatedSeconds = Number(anchor.getAttribute("LAST_MODIFIED") || 0);
        const createdAt = Number.isFinite(createdSeconds) && createdSeconds > 0 ? createdSeconds * 1000 : Date.now();
        const updatedAt = Number.isFinite(updatedSeconds) && updatedSeconds > 0 ? updatedSeconds * 1000 : createdAt;
        const tags = String(anchor.getAttribute("TAGS") || "").split(/[,;]+/).map(tag => tag.trim()).filter(Boolean).slice(0, 24);
        return [{ text: url.href, previewTitle: title, createdAt, updatedAt, tags }];
      });
      if (!imported.length) {
        say(captureUiText("invalidBookmarkImport"));
        return;
      }
    } else if (/\.json$/i.test(file.name) || file.type === "application/json") {
      const parsed = JSON.parse(raw);
      backup = parseLinkaBackup(parsed);
      imported = backup
        ? backup.captures
        : (Array.isArray(parsed) ? parsed : parsed?.captures);
      if (!Array.isArray(imported)) throw new Error("Invalid Linka JSON backup");
    } else {
      // TXT/Markdown is kept as a single note. When the contents are valid
      // JSON, recognize only known backup shapes instead of guessing that any
      // arbitrary object with a "captures" property is trusted.
      try {
        const parsed = JSON.parse(raw);
        backup = parseLinkaBackup(parsed);
        if (backup) {
          imported = backup.captures;
        } else {
          const candidate = Array.isArray(parsed) ? parsed : parsed?.captures;
          imported = Array.isArray(candidate) && candidate.every(item => item && typeof item.text === "string")
            ? candidate
            : [{ text: raw }];
        }
      } catch (error) {
        if (String(error?.message || "").includes("unsupported version") || String(error?.message || "").includes("incomplete or damaged")) throw error;
        imported = [{ text: raw }];
      }
    }

    if (backup && !window.confirm(captureUiText("backupConfirm"))) return;
    if (!Array.isArray(imported)) throw new Error("Import must contain an array of captures.");
    let normalized = imported
      .filter(item => item && typeof item === "object" && typeof item.text === "string")
      .map(item => normalizeCapture(item))
      .filter(Boolean);
    let bookmarkDuplicatesSkipped = 0;
    if (bookmarkImport) {
      const accepted = [];
      for (const item of normalized) {
        if (findDuplicateCapture([...captures, ...accepted], item.text)) {
          bookmarkDuplicatesSkipped += 1;
          continue;
        }
        accepted.push(item);
      }
      normalized = accepted;
      if (!normalized.length) {
        say(captureUiText("bookmarkDuplicatesSkipped"));
        return;
      }
    }
    if (!backup && !normalized.length) throw new Error("No text captures found");

    const importedIds = new Set(normalized.map(item => item.id));
    const beforeImport = captures.map(item => ({ ...item }));
    const map = new Map(captures.map(item => [item.id, item]));
    normalized.forEach(item => map.set(item.id, item));
    const nextCaptures = [...map.values()].sort((a, b) =>
      Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
      Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0)
    );

    // Save captures first; do not change in-memory state or start cloud sync
    // until local capture data and deletion markers have both been committed.
    if (!saveCaptures(nextCaptures)) {
      say("Could not save imported captures. The current library remains unchanged.");
      return;
    }
    const nextDeleted = new Set(readDeletedIds());
    if (backup) for (const id of backup.deletedIds) nextDeleted.add(id);
    for (const id of importedIds) nextDeleted.delete(id);
    if (!setDeletedIds([...nextDeleted])) {
      const rolledBack = saveCaptures(beforeImport);
      say(rolledBack
        ? "Import cancelled because cloud deletion markers could not be saved."
        : "Import rollback failed. Stop editing and export whatever data remains immediately.");
      return;
    }

    captures = nextCaptures;
    persistedCaptures = captures.map(item => ({ ...item }));
    localDataRevision += 1;

    let documentResult = { imported: 0, skipped: 0 };
    let documentFailed = false;
    if (backup?.documents?.length) {
      try {
        documentResult = await importLinkaDocuments(backup.documents);
      } catch (error) {
        console.error("Linka document restore failed", error);
        documentFailed = true;
      }
    }

    let preferencesApplied = true;
    if (backup) preferencesApplied = applyBackupPreferences(backup);
    scheduleCloudSync();
    render();

    if (backup) {
      const partial = documentFailed || !preferencesApplied || documentResult.skipped > 0;
      const detail = " · " + normalized.length + " captures, " + documentResult.imported + " documents";
      say((partial ? captureUiText("backupPartial") : captureUiText("backupRestored")) + detail);
    } else if (bookmarkImport) {
      const detail = " · " + normalized.length + " bookmarks";
      say(captureUiText("importSuccess") + detail + (bookmarkLimitHit ? " · " + captureUiText("bookmarkImportLimited") : "") +
        (bookmarkDuplicatesSkipped ? " · " + bookmarkDuplicatesSkipped + " duplicates skipped" : ""));
    } else {
      say(captureUiText("importSuccess") + " " + normalized.length);
    }
  } catch (error) {
    console.error("Linka import failed", error);
    say(captureUiText("invalidImport"));
  } finally {
    event.target.value = "";
  }
});
$("#search-space-button").addEventListener("click",()=>showSearchSpace(search.value));
document.addEventListener("keydown",event=>{
  const command = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  const typingTarget = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || event.target?.isContentEditable;
  if(command && key === "k"){
    event.preventDefault();showSearchSpace(search.value);return;
  }
  if(command && event.shiftKey && key === "e"){
    event.preventDefault();
    const selected = selectionMode && selectedIds.size
      ? captures.filter(item => selectedIds.has(item.id))
      : visibleCaptures(captures, activeFilter, search.value);
    exportCaptureItems(selected, selectionMode && selectedIds.size ? "linka-selection" : "linka-inbox");
    return;
  }
  if(command && event.shiftKey && key === "l" && selectionMode && selectedIds.size){
    event.preventDefault();
    const selected = captures.filter(item => selectedIds.has(item.id));
    const readLater = !selected.every(item => item.readLater);
    const now = Date.now();
    captures = captures.map(item => selectedIds.has(item.id) ? { ...item, readLater, updatedAt: now } : item);
    if (persist()) { render(); say(readLater ? captureUiText("savedLater") : captureUiText("removedLater")); }
    else render();
    return;
  }
  if(event.key === "Delete" && selectionMode && selectedIds.size && activeFilter !== "trash" && !typingTarget){
    event.preventDefault();
    bulkToolbar.querySelector('button[data-bulk-action="delete"]')?.click();
    return;
  }
  if(event.key==="/"&&!command&&!event.altKey&&!typingTarget){
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
window.addEventListener("linka:open-cloud-settings", () => showCloudSyncНастройки());
window.addEventListener("linka:open-atmosphere-settings", () => openAtmosphereSettings());
window.addEventListener("linka:open-agreement", () => showAgreement({ mustAccept: false }));
void applyNativeCloseToTrayPreference();
void registerNativeDesktopEvents();
initLinkaExperience();
initLinkaSignature();
initVisualSystem();
setTimeout(showCaptureRecoveryNotice, 700);
void initLinkaAtmosphere().catch(error => console.warn("Linka atmosphere could not start", error));
void initLinkaDocuments().catch(error => console.warn("Linka documents could not start", error));
