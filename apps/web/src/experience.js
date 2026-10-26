import QRCode from "qrcode";
import {
  approveQrPairing, beginQrPairing, claimQrPairing, disconnectCloud,
  getCloudConfig, getCloudSession, getOtpCooldown, readLinkaProfile,
  requestEmailOtp, saveCloudConfig, saveLinkaProfile, verifyEmailOtp,
  startGoogleOAuth, completeGoogleOAuthCallback
} from "./cloud-sync.js";
import { setLinkaDensity, setLinkaEffects, setLinkaAppearanceControl, getLinkaAppearanceControl, setLinkaCustomColor, getLinkaCustomColor, resetLinkaAppearance } from "./visual-system.js";

const LANG_KEY = "linka.language.v1";
const ONBOARDED_KEY = "linka.experience.onboarded.v1";
const NOTIFY_KEY = "linka.desktop-notifications.v1";
const RELEASES_URL = "https://api.github.com/repos/anarabbasov2010-eng/Linka/releases/latest";
const BUILD_VERSION = String(import.meta.env.VITE_LINKA_DESKTOP_VERSION || "").trim();
const UPDATER_ENABLED = String(import.meta.env.VITE_LINKA_UPDATER_ENABLED || "false") === "true";
const LANGUAGES = [
  { value: "en", label: "EN" }, { value: "ru", label: "RU" },
  { value: "az", label: "AZ" }, { value: "tr", label: "TR" }
];
const COPY = {
  en: {
    ambientSound: "Ambient sound", ambientSoundBody: "A quiet, slowly breathing synth pad. Off by default.", audioUnavailable: "Ambient audio is not available in this environment.", checkUpdates: "Check for updates", updateChanges: "What changed",
    privacy: "Private by default · local-first", eyebrow: "Your personal library",
    hero: ["Keep", "what", "matters."], heroBody: "Links, notes, and useful ideas. Saved once. Easy to find again.",
    quick: "Quick capture", subtitle: "Keep the useful stuff.", placeholder: "Drop a link. Save a thought. Keep it for later…",
    hint: "Saved on this device. Export a backup whenever you need.", tags: "Tags", collection: "Collection", tagsPlaceholder: "design, reading, work", collectionPlaceholder: "Project or topic", later: "Read later", archive: "Archive", trash: "Trash", save: "Save to inbox",
    inbox: "Your inbox", export: "Export", import: "Import", filters: ["All", "Pinned", "Read later", "Archive", "Trash", "Links", "Notes"],
    footer: "your personal library", footerRight: "Simple by design. Back up what matters.",
    account: "Account", settings: "Settings", language: "Language", theme: "Appearance", dark: "Dark", light: "Light", system: "System", reducedMotion: "Reduce motion", reducedMotionBody: "Use shorter, calmer transitions.",
    startTitle: "Welcome to Linka", startBody: "Create your account with your email. Your library will be ready on every signed-in device.",
    googleSignIn: "Continue with Google", emailFallback: "Use email code instead",
    email: "Email address", code: "Six-digit code", sendCreate: "Create account · send code",
    sendLogin: "Sign in · send code", verify: "Verify and continue", continueOffline: "Continue offline",
    profileTitle: "A little about you", profileBody: "Choose the name you want to see in Linka. Real details aren't required.",
    name: "What should we call you?", age: "Age (optional)", finish: "Finish setup",
    config: "Cloud service settings", projectUrl: "Supabase project URL", publishableKey: "Public publishable key",
    saveConfig: "Save service settings", signedIn: "Signed in as", signOut: "Sign out", syncNow: "Sync now",
    editProfile: "Edit profile", qrLogin: "Sign in on another device with QR", qrIntro: "Scan with a phone that already has Linka signed in. Code expires in two minutes.",
    waiting: "Waiting for approval…", pairingReady: "QR code ready", qrUnavailable: "QR pairing service isn't configured yet.",
    notification: "Desktop notifications", enableNotifications: "Enable notifications", notificationsOn: "Notifications enabled",
    updateTitle: "Linka update", updateReady: "A newer release is available.", updateButton: "Install update", updateDownloading: "Downloading update", updateInstalling: "Installing update", updateRestarting: "Restarting Linka…", updateInstalled: "Update installed. Restart Linka to finish.",
    latest: "You're using the latest desktop build.", updaterNotConfigured: "Signed in-app updates are not configured yet. Use the installer from GitHub Releases for manual updates.", close: "Close", cancel: "Cancel",
    codeSent: "Code sent. Check your inbox and spam folder.", codeWait: "You can request another code in",
    profileSaved: "Profile saved.", connected: "Account connected.", offlineSaved: "Setup saved. Linka will work locally.",
    errors: "Something went wrong. Check your connection and try again.", expired: "This code expired. Request a new one.",
    setupNeeded: "Add the shared project URL and public key to enable email accounts and sync.",
    signOutInfo: "You have signed out. Your local library has not been deleted."
  },
  ru: {
    ambientSound: "Атмосферный звук", ambientSoundBody: "Тихий синтезаторный фон с медленным дыханием. По умолчанию выключен.", audioUnavailable: "Атмосферный звук недоступен в этой среде.", checkUpdates: "Проверить обновления", updateChanges: "Что изменилось",
    privacy: "Приватность по умолчанию · сначала локально", eyebrow: "Твоя личная библиотека",
    hero: ["Сохраняй", "то,", "что важно."], heroBody: "Ссылки, заметки и идеи. Сохраняй один раз — находи снова.",
    quick: "Быстрое сохранение", subtitle: "Только то, что нужно.", placeholder: "Вставь ссылку или сохрани мысль…",
    hint: "Сохранено на этом устройстве. Не забывай делать резервную копию.", tags: "Теги", collection: "Коллекция", tagsPlaceholder: "дизайн, чтение, работа", collectionPlaceholder: "Проект или тема", later: "Сохранить на потом", archive: "Архивировать", trash: "Корзина", save: "Сохранить",
    inbox: "Твоя библиотека", export: "Экспорт", import: "Импорт", filters: ["Всё", "Закреплённое", "Сохранить на потом", "Архив", "Корзина", "Ссылки", "Заметки"],
    footer: "твоя личная библиотека", footerRight: "Ничего лишнего. Сохраняй важное в резервную копию.",
    account: "Аккаунт", settings: "Настройки", language: "Язык", theme: "Оформление", dark: "Тёмная", light: "Светлая", system: "Системная", reducedMotion: "Меньше анимации", reducedMotionBody: "Сокращает движение и переходы.",
    startTitle: "Добро пожаловать в Linka", startBody: "Создай аккаунт по электронной почте. Библиотека будет доступна на устройствах, где выполнен вход.",
    googleSignIn: "Продолжить с Google", emailFallback: "Другой способ: код из почты",
    email: "Электронная почта", code: "Код из 6 цифр", sendCreate: "Создать аккаунт · получить код",
    sendLogin: "Войти · получить код", verify: "Подтвердить и продолжить", continueOffline: "Продолжить без аккаунта",
    profileTitle: "Расскажи немного о себе", profileBody: "Выбери имя, которое будет отображаться в Linka. Настоящие данные не обязательны.",
    name: "Как тебя называть?", age: "Возраст (необязательно)", finish: "Завершить настройку",
    config: "Настройки облачного сервиса", projectUrl: "URL проекта Supabase", publishableKey: "Публичный ключ проекта",
    saveConfig: "Сохранить настройки", signedIn: "Вход выполнен: ", signOut: "Выйти", syncNow: "Синхронизировать",
    editProfile: "Изменить профиль", qrLogin: "Войти на другом устройстве по QR", qrIntro: "Отсканируй код телефоном, где уже выполнен вход в Linka. Код действует две минуты.",
    waiting: "Ожидаем подтверждения…", pairingReady: "QR-код готов", qrUnavailable: "Сервис входа по QR ещё не настроен.",
    notification: "Уведомления на компьютере", enableNotifications: "Включить уведомления", notificationsOn: "Уведомления включены",
    updateTitle: "Обновление Linka", updateReady: "Доступна новая версия.", updateButton: "Установить обновление", updateDownloading: "Загрузка обновления", updateInstalling: "Установка обновления", updateRestarting: "Перезапуск Linka…", updateInstalled: "Обновление установлено. Перезапусти Linka.",
    latest: "Установлена последняя версия для компьютера.", updaterNotConfigured: "Автообновление внутри приложения ещё не настроено. Для ручного обновления используй установщик из GitHub Releases.", close: "Закрыть", cancel: "Отмена",
    codeSent: "Код отправлен. Проверь почту и папку «Спам».", codeWait: "Повторный код можно запросить через",
    profileSaved: "Профиль сохранён.", connected: "Аккаунт подключён.", offlineSaved: "Настройки сохранены. Linka продолжит работать локально.",
    errors: "Не удалось выполнить действие. Проверь соединение и повтори попытку.", expired: "Срок действия кода истёк. Запроси новый.",
    setupNeeded: "Укажи URL проекта и публичный ключ, чтобы включить аккаунты и синхронизацию.",
    signOutInfo: "Вы вышли из аккаунта. Локальная библиотека не удалена."
  },
  az: {
    ambientSound: "Atmosfer səsi", ambientSoundBody: "Yavaş nəfəs alan sakit sintezator fonu. Standart olaraq sönülüdür.", audioUnavailable: "Atmosfer səsi bu mühitdə mövcud deyil.", checkUpdates: "Yeniləmələri yoxla", updateChanges: "Nə dəyişdi",
    privacy: "Məxfilik standartdır · əvvəlcə cihazda", eyebrow: "Şəxsi kitabxanan",
    hero: ["Vacib", "olanı", "saxla."], heroBody: "Linklər, qeydlər və ideyalar. Bir dəfə saxla, sonra asan tap.",
    quick: "Tez yadda saxla", subtitle: "Yalnız lazım olanlar.", placeholder: "Link əlavə et və ya fikrini yaz…",
    hint: "Bu cihazda saxlanılır. Ehtiyat nüsxə yaratmağı unutma.", tags: "Teqlər", collection: "Kolleksiya", tagsPlaceholder: "dizayn, oxu, iş", collectionPlaceholder: "Layihə və ya mövzu", later: "Sonra oxu", archive: "Arxivə köçür", trash: "Zibil qutusu", save: "Yadda saxla",
    inbox: "Kitabxanan", export: "İxrac", import: "İdxal", filters: ["Hamısı", "Sabitlənmiş", "Sonra oxu", "Arxiv", "Zibil qutusu", "Linklər", "Qeydlər"],
    footer: "şəxsi kitabxanan", footerRight: "Sadə və səliqəli. Vacib olanları ehtiyatda saxla.",
    account: "Hesab", settings: "Parametrlər", language: "Dil", theme: "Görünüş", dark: "Tünd", light: "Açıq", system: "Sistem", reducedMotion: "Az animasiya", reducedMotionBody: "Hərəkət və keçidlər azaldılır.",
    startTitle: "Linka-ya xoş gəlmisən", startBody: "E-poçtla hesab yarat. Kitabxanan daxil olduğun bütün cihazlarda əlçatan olacaq.",
    googleSignIn: "Google ilə davam et", emailFallback: "E-poçt kodu ilə giriş",
    email: "E-poçt ünvanı", code: "6 rəqəmli kod", sendCreate: "Hesab yarat · kod göndər",
    sendLogin: "Daxil ol · kod göndər", verify: "Təsdiqlə və davam et", continueOffline: "Hesabsız davam et",
    profileTitle: "Özün haqqında bir az", profileBody: "Linka-da görünəcək adı seç. Həqiqi məlumat yazmaq məcburi deyil.",
    name: "Sənə necə müraciət edək?", age: "Yaş (istəyə görə)", finish: "Quraşdırmanı bitir",
    config: "Bulud xidməti parametrləri", projectUrl: "Supabase layihəsinin URL-i", publishableKey: "Açıq layihə açarı",
    saveConfig: "Parametrləri saxla", signedIn: "Daxil olunub: ", signOut: "Çıxış", syncNow: "Sinxronlaşdır",
    editProfile: "Profili dəyiş", qrLogin: "QR ilə başqa cihazda daxil ol", qrIntro: "Artıq Linka-ya daxil olduğun telefonla skan et. Kod iki dəqiqəyə bitir.",
    waiting: "Təsdiq gözlənilir…", pairingReady: "QR kod hazırdır", qrUnavailable: "QR giriş xidməti hələ qurulmayıb.",
    notification: "Kompüter bildirişləri", enableNotifications: "Bildirişləri aktiv et", notificationsOn: "Bildirişlər aktivdir",
    updateTitle: "Linka yeniləməsi", updateReady: "Yeni versiya mövcuddur.", updateButton: "Yeniləməni quraşdır", updateDownloading: "Yeniləmə endirilir", updateInstalling: "Yeniləmə quraşdırılır", updateRestarting: "Linka yenidən başladılır…", updateInstalled: "Yeniləmə quraşdırıldı. Linka-nı yenidən aç.",
    latest: "Ən son masaüstü versiyası quraşdırılıb.", updaterNotConfigured: "Tətbiqdaxili avtomatik yeniləmə hələ qurulmayıb. Əl ilə yeniləmək üçün GitHub Releases quraşdırıcısından istifadə et.", close: "Bağla", cancel: "Ləğv et",
    codeSent: "Kod göndərildi. E-poçtu və spam qovluğunu yoxla.", codeWait: "Yeni kodu bu müddətdən sonra istəyə bilərsən:",
    profileSaved: "Profil yadda saxlanıldı.", connected: "Hesab qoşuldu.", offlineSaved: "Parametrlər saxlanıldı. Linka lokal işləyəcək.",
    errors: "Əməliyyat alınmadı. Bağlantını yoxla və yenidən cəhd et.", expired: "Kodun vaxtı bitib. Yeni kod istə.",
    setupNeeded: "Hesabları və sinxronizasiyanı aktivləşdirmək üçün layihə URL-i və açıq açarı daxil et.",
    signOutInfo: "Hesabdan çıxdın. Lokal kitabxanan silinməyib."
  },
  tr: {
    ambientSound: "Ortam sesi", ambientSoundBody: "Yavaşça nefes alan sakin bir synth tonu. Varsayılan olarak kapalı.", audioUnavailable: "Ortam sesi bu ortamda kullanılamıyor.", checkUpdates: "Güncellemeleri denetle", updateChanges: "Neler değişti",
    privacy: "Varsayılan gizlilik · önce cihazda", eyebrow: "Kişisel kitaplığın",
    hero: ["Önemli", "olanı", "sakla."], heroBody: "Bağlantılar, notlar ve fikirler. Bir kez kaydet, sonra kolayca bul.",
    quick: "Hızlı kayıt", subtitle: "Yalnızca gerekenler.", placeholder: "Bağlantı ekle veya bir düşünce yaz…",
    hint: "Bu cihazda saklanır. Yedek almayı unutma.", tags: "Etiketler", collection: "Koleksiyon", tagsPlaceholder: "tasarım, okuma, iş", collectionPlaceholder: "Proje veya konu", later: "Daha sonra oku", archive: "Arşivle", trash: "Çöp kutusu", save: "Gelen kutusuna kaydet",
    inbox: "Kitaplığın", export: "Dışa aktar", import: "İçe aktar", filters: ["Tümü", "Sabitlenen", "Daha sonra oku", "Arşiv", "Çöp kutusu", "Bağlantılar", "Notlar"],
    footer: "kişisel kitaplığın", footerRight: "Sade tasarım. Önemli olanları yedekle.",
    account: "Hesap", settings: "Ayarlar", language: "Dil", theme: "Görünüm", dark: "Koyu", light: "Açık", system: "Sistem", reducedMotion: "Hareketi azalt", reducedMotionBody: "Hareket ve geçişleri azaltır.",
    startTitle: "Linka'ya hoş geldin", startBody: "E-posta adresinle hesap oluştur. Kitaplığın giriş yaptığın tüm cihazlarda kullanılabilir.",
    googleSignIn: "Google ile devam et", emailFallback: "E-posta koduyla giriş",
    email: "E-posta adresi", code: "Altı haneli kod", sendCreate: "Hesap oluştur · kod gönder",
    sendLogin: "Giriş yap · kod gönder", verify: "Doğrula ve devam et", continueOffline: "Hesapsız devam et",
    profileTitle: "Biraz kendinden bahset", profileBody: "Linka'da görünecek adı seç. Gerçek bilgileri kullanman gerekmez.",
    name: "Sana nasıl hitap edelim?", age: "Yaş (isteğe bağlı)", finish: "Kurulumu bitir",
    config: "Bulut hizmeti ayarları", projectUrl: "Supabase proje URL'si", publishableKey: "Herkese açık proje anahtarı",
    saveConfig: "Ayarları kaydet", signedIn: "Giriş yapıldı: ", signOut: "Çıkış yap", syncNow: "Şimdi senkronize et",
    editProfile: "Profili düzenle", qrLogin: "QR ile başka cihazda giriş yap", qrIntro: "Linka'da zaten oturum açılmış bir telefonla tara. Kod iki dakika içinde sona erer.",
    waiting: "Onay bekleniyor…", pairingReady: "QR kod hazır", qrUnavailable: "QR giriş hizmeti henüz yapılandırılmadı.",
    notification: "Masaüstü bildirimleri", enableNotifications: "Bildirimleri etkinleştir", notificationsOn: "Bildirimler etkin",
    updateTitle: "Linka güncellemesi", updateReady: "Yeni sürüm kullanıma hazır.", updateButton: "Güncellemeyi yükle", updateDownloading: "Güncelleme indiriliyor", updateInstalling: "Güncelleme yükleniyor", updateRestarting: "Linka yeniden başlatılıyor…", updateInstalled: "Güncelleme yüklendi. Uygulamayı yeniden aç.",
    latest: "En güncel masaüstü sürümünü kullanıyorsun.", updaterNotConfigured: "Uygulama içi otomatik güncelleme henüz yapılandırılmadı. Elle güncellemek için GitHub Releases yükleyicisini kullan.", close: "Kapat", cancel: "Vazgeç",
    codeSent: "Kod gönderildi. Gelen kutunu ve spam klasörünü kontrol et.", codeWait: "Yeni kodu şu süre sonra isteyebilirsin:",
    profileSaved: "Profil kaydedildi.", connected: "Hesap bağlandı.", offlineSaved: "Ayarlar kaydedildi. Linka yerel çalışmaya devam edecek.",
    errors: "İşlem başarısız. Bağlantını kontrol edip tekrar dene.", expired: "Kodun süresi doldu. Yeni bir kod iste.",
    setupNeeded: "Hesap ve eşitlemeyi etkinleştirmek için proje URL'sini ve herkese açık anahtarı gir.",
    signOutInfo: "Oturumu kapattın. Yerel kitaplığın silinmedi."
  }
};
let updateRecord = null;
let pendingNativeUpdate = null;
let lastUpdateNotice = "";
let updateTimer = null;
let ambientAudioContext = null;
let ambientAudioNodes = [];
let ambientAudioEnabled = false;

function stopAmbientSound() {
  ambientAudioNodes.forEach(node => { try { node.stop?.(); } catch {} try { node.disconnect?.(); } catch {} });
  ambientAudioNodes = [];
  if (ambientAudioContext) { const ctx = ambientAudioContext; ambientAudioContext = null; try { ctx.close(); } catch {} }
  ambientAudioEnabled = false;
}
async function startAmbientSound() {
  stopAmbientSound();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("audio-unavailable");
  const ctx = new AudioContextClass(); ambientAudioContext = ctx;
  const master = ctx.createGain(); master.gain.value = 0.055; master.connect(ctx.destination);
  [110, 164.81, 220, 329.63].forEach((frequency, index) => {
    const oscillator = ctx.createOscillator(), voice = ctx.createGain();
    oscillator.type = "sine"; oscillator.frequency.value = frequency; voice.gain.value = [0.22, 0.15, 0.10, 0.045][index];
    oscillator.connect(voice); voice.connect(master); oscillator.start(); ambientAudioNodes.push(oscillator, voice);
  });
  const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 0.075; depth.gain.value = 0.012;
  lfo.connect(depth); depth.connect(master.gain); lfo.start(); ambientAudioNodes.push(lfo, depth);
  await ctx.resume(); ambientAudioEnabled = true;
}
function langCode() {
  const saved = localStorage.getItem(LANG_KEY);
  if (COPY[saved]) return saved;
  const browser = String(navigator.language || "en").slice(0, 2).toLowerCase();
  return COPY[browser] ? browser : "en";
}
function localizeReleaseNotes(body) {
  const language = langCode();
  const rows = String(body || "").split(/\r?\n/).map(line => line.trim().replace(/^[-*•]\s*/, "")).filter(Boolean);
  const dict = {
    en: [
      ["ambient sphere", "Added a slow, softly pulsing signature sphere behind the workspace."],
      ["transparent navigation", "Made navigation translucent with a smoother spring-like active state."],
      ["ambient sound", "Added optional low-volume ambient synth sound; off by default."],
      ["notification", "Improved update notifications and in-app status feedback."],
      ["release notes", "Release notes now follow the selected application language."],
      ["preserved local", "Preserved local-first storage and existing saved items."]
    ],
    ru: [
      ["ambient sphere", "Добавлена медленно пульсирующая фирменная сфера на фоне."],
      ["transparent navigation", "Навигация стала прозрачнее, активный раздел переключается плавно и с упругим откликом."],
      ["ambient sound", "Добавлен тихий атмосферный синтезаторный фон; по умолчанию он выключен."],
      ["notification", "Улучшены уведомления об обновлениях и статусы внутри приложения."],
      ["release notes", "Список изменений отображается на выбранном языке приложения."],
      ["preserved local", "Сохранено локальное хранение и существующие записи."]
    ],
    az: [
      ["ambient sphere", "Arxa fona yavaş nəbz vuran firmanın kürəsi əlavə edildi."],
      ["transparent navigation", "Naviqasiya şəffaflaşdırıldı, aktiv bölmə yumşaq animasiya ilə dəyişir."],
      ["ambient sound", "Sakit atmosfer sintezator səsi əlavə edildi; standart olaraq sönülüdür."],
      ["notification", "Yeniləmə bildirişləri və tətbiqdaxili statuslar yaxşılaşdırıldı."],
      ["release notes", "Dəyişiklik qeydləri seçilmiş tətbiq dilində göstərilir."],
      ["preserved local", "Yerli yaddaş və mövcud qeydlər qorunub saxlanıldı."]
    ],
    tr: [
      ["ambient sphere", "Arka plana yavaşça nabız atan imza küresi eklendi."],
      ["transparent navigation", "Gezinme şeffaflaştırıldı; etkin bölüm yumuşak ve yaylı bir geçişle değişiyor."],
      ["ambient sound", "Düşük sesli ortam synth sesi eklendi; varsayılan olarak kapalı."],
      ["notification", "Güncelleme bildirimleri ve uygulama içi durum geri bildirimi iyileştirildi."],
      ["release notes", "Sürüm notları seçilen uygulama dilinde gösteriliyor."],
      ["preserved local", "Yerel depolama ve mevcut kayıtlar korundu."]
    ]
  };
  const translations = dict[language] || dict.en;
  const output = [];
  for (const row of rows) {
    const lower = row.toLowerCase();
    if (lower.startsWith("important") || lower.startsWith("migration from linka 0.4.72")) {
      output.push(language === "ru" ? "Важно: эта версия устанавливается рядом со старой Linka. Экспортируйте резервную копию из старого приложения и импортируйте её здесь перед удалением старой версии."
        : language === "az" ? "Vacib: bu versiya köhnə Linka ilə yanaşı quraşdırılır. Köhnə tətbiqdən ehtiyat nüsxəni ixrac edin və köhnə versiyanı silməzdən əvvəl burada idxal edin."
        : language === "tr" ? "Önemli: bu sürüm eski Linka'nın yanına kurulur. Eski uygulamadan yedek dışa aktarın ve eski sürümü kaldırmadan önce burada içe aktarın."
        : "Important: this version installs alongside old Linka. Export a backup from the old app and import it here before removing the old version.");
      continue;
    }
    const match = translations.find(([needle]) => lower.includes(needle));
    if (match && !output.includes(match[1])) output.push(match[1]);
    else if (!match && !/^(what's new|install the apk|automated android build)/i.test(row)) output.push(row);
  }
  return output.slice(0, 8);
}
function tr(key) { return (COPY[langCode()] || COPY.en)[key] ?? COPY.en[key] ?? key; }
function make(tag, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== "") el.textContent = text;
  return el;
}
function field(label, type, value = "", placeholder = "") {
  const wrap = make("label", "linka-field");
  wrap.append(make("span", "", label));
  const input = make("input", "linka-input");
  input.type = type;
  input.value = value || "";
  input.placeholder = placeholder;
  input.autocomplete = type === "email" ? "email" : type === "password" ? "current-password" : "off";
  if (type === "number") { input.min = "1"; input.max = "120"; input.inputMode = "numeric"; }
  wrap.append(input);
  return { wrap, input };
}
function button(label, className = "linka-button") {
  const b = make("button", className, label);
  b.type = "button";
  return b;
}
function setStatus(target, message, error = false) {
  target.textContent = message;
  target.dataset.state = error ? "error" : "normal";
}
function modal(titleText, subtitleText, options = {}) {
  const layer = make("div", options.onboarding ? "modal-layer linka-onboarding-layer" : "modal-layer linka-modal-layer");
  const panel = make("section", options.onboarding ? "modal linka-experience-panel" : "modal linka-experience-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  const head = make("div", "modal-head");
  const logo = make("img", "modal-logo");
  logo.src = "/linka-mark.svg";
  logo.alt = "";
  const copy = make("div", "linka-modal-copy");
  copy.append(make("h2", "", titleText), make("p", "", subtitleText));
  head.append(logo, copy);
  panel.append(head);
  layer.append(panel);
  const modalRoot = document.querySelector("#modal-root");
  if (modalRoot) {
    for (const previous of Array.from(modalRoot.children)) {
      if (previous.classList.contains("closing")) continue;
      previous.classList.add("closing");
      previous.setAttribute("aria-hidden", "true");
      previous.inert = true;
      const reduced = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)
        || document.documentElement.classList.contains("reduced-motion");
      if (reduced) previous.remove();
      else window.setTimeout(() => previous.remove(), 230);
    }
    modalRoot.append(layer);
  }
  const close = () => {
    if (!layer.isConnected || layer.classList.contains("closing")) return;
    layer.classList.add("closing");
    layer.setAttribute("aria-hidden", "true");
    layer.inert = true;
    const reduced = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)
      || document.documentElement.classList.contains("reduced-motion");
    if (reduced) layer.remove();
    else window.setTimeout(() => layer.remove(), 230);
  };
  return { layer, panel, close };
}
function configForm(panel, config = getCloudConfig(), collapsed = true) {
  const details = make("details", "linka-config");
  details.open = !collapsed || !config.url || !config.key;
  const summary = make("summary", "", tr("config"));
  details.append(summary);
  const form = make("div", "linka-form-stack");
  const url = field(tr("projectUrl"), "url", config.url, "https://your-project.supabase.co");
  const key = field(tr("publishableKey"), "text", config.key, "sb_publishable_…");
  form.append(url.wrap, key.wrap);
  const save = button(tr("saveConfig"), "linka-button linka-button-secondary");
  const status = make("p", "linka-status");
  save.addEventListener("click", () => {
    try { saveCloudConfig(url.input.value, key.input.value); setStatus(status, tr("setupNeeded")); }
    catch (error) { setStatus(status, error.message || tr("errors"), true); }
  });
  form.append(save, status);
  details.append(form);
  panel.append(details);
  return { url: url.input, key: key.input, details };
}
function translateInterface() {
  const language = langCode();
  document.documentElement.lang = language;
  const picker = document.querySelector("#linka-language");
  if (picker && picker.value !== language) picker.value = language;
  const privacy = document.querySelector(".privacy");
  if (privacy?.lastChild) privacy.lastChild.textContent = tr("privacy");
  const eyebrow = document.querySelector(".eyebrow");
  if (eyebrow) eyebrow.textContent = tr("eyebrow");
  const words = document.querySelectorAll(".hero h1 .word");
  tr("hero").forEach((label, i) => { if (words[i]) words[i].textContent = label; });
  const heroBody = document.querySelector(".hero > p:not(.hero-sub)");
  if (heroBody) heroBody.textContent = tr("heroBody");
  const heroSub = document.querySelector(".hero-sub");
  if (heroSub) {
    const dot = heroSub.querySelector(".dot");
    heroSub.replaceChildren();
    if (dot) heroSub.append(dot);
    heroSub.append(document.createTextNode(language === "ru" ? "Сначала на устройстве  /  Облако по желанию" :
      language === "az" ? "Əvvəlcə cihazda  /  Bulud istəyə bağlıdır" :
      language === "tr" ? "Önce cihazda  /  Bulut isteğe bağlı" : "On-device first  /  Cloud sync is optional"));
  }
  const quick = document.querySelector("#compose-label");
  if (quick) quick.textContent = tr("quick");
  const subtitle = document.querySelector(".capture-subtitle");
  if (subtitle) subtitle.textContent = tr("subtitle");
  const draft = document.querySelector("#capture-text");
  if (draft) { draft.placeholder = tr("placeholder"); draft.setAttribute("aria-label", tr("placeholder")); }
  const hint = document.querySelector(".hint");
  if (hint) hint.textContent = tr("hint");
  const tagsLabel = document.querySelector("#capture-tags-label");
  const collectionLabel = document.querySelector("#capture-collection-label");
  if (tagsLabel) tagsLabel.textContent = tr("tags");
  if (collectionLabel) collectionLabel.textContent = tr("collection");
  const tagsInput = document.querySelector("#capture-tags");
  const collectionInput = document.querySelector("#capture-collection");
  if (tagsInput) { tagsInput.placeholder = tr("tagsPlaceholder"); tagsInput.setAttribute("aria-label", tr("tags")); }
  if (collectionInput) { collectionInput.placeholder = tr("collectionPlaceholder"); collectionInput.setAttribute("aria-label", tr("collection")); }
  const save = document.querySelector("#save-button");
  if (save) {
    const svg = save.querySelector("svg");
    save.textContent = tr("save");
    if (svg) save.append(svg);
  }
  const title = document.querySelector(".section-title");
  if (title?.firstChild) title.firstChild.textContent = tr("inbox") + " ";
  const exportButton = document.querySelector("#export-button");
  const importButton = document.querySelector("#import-button");
  if (exportButton) exportButton.textContent = tr("export");
  if (importButton) importButton.textContent = tr("import");
  document.querySelectorAll("[data-filter]").forEach((el, i) => { el.textContent = tr("filters")[i] || el.textContent; });
  const footer = document.querySelector(".footer");
  if (footer?.children[0]) footer.children[0].innerHTML = "<strong>linka</strong> · " + tr("footer");
  if (footer?.children[1]) footer.children[1].textContent = tr("footerRight");
  const accountButton = document.querySelector("#linka-account-button");
  if (accountButton) { accountButton.title = tr("account"); accountButton.setAttribute("aria-label", tr("account")); }
  const settingsButton = document.querySelector("#settings-button");
  if (settingsButton) { settingsButton.title = tr("settings"); settingsButton.setAttribute("aria-label", tr("settings")); }
  updateWebNavLabels();
}
function addRevealAnimations() {
  document.documentElement.classList.add("linka-enhanced");
  const apply = () => {
    document.querySelectorAll("#capture-list > article, #capture-list > .empty, .workspace, .toolbar, .filters").forEach((el, index) => {
      if (el.dataset.linkaMotionApplied) return;
      el.dataset.linkaMotionApplied = "true";
      el.style.setProperty("--linka-stagger", String(Math.min(index % 7, 5)));
      el.classList.add("linka-reveal");
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduced-motion")) {
        el.classList.add("linka-reveal-visible");
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("linka-reveal-visible")));
      }
    });
  };
  apply();
  const list = document.querySelector("#capture-list");
  if (list && "MutationObserver" in window) new MutationObserver(apply).observe(list, { childList: true });
}
function setLanguage(value) {
  if (!COPY[value]) return;
  localStorage.setItem(LANG_KEY, value);
  translateInterface();
  // Refresh the current experience modal so all labels match the chosen language.
  document.querySelector("#linka-language")?.setAttribute("data-language-changed", String(Date.now()));
}
function isDesktopShell() {
  return Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
}
async function requestLinkaNotificationPermission() {
  if (isDesktopShell()) {
    const api = await import("@tauri-apps/plugin-notification");
    let allowed = await api.isPermissionGranted();
    if (!allowed) allowed = (await api.requestPermission()) === "granted";
    return allowed;
  }
  if (!("Notification" in window)) return false;
  return (Notification.permission === "granted" || await Notification.requestPermission() === "granted");
}
async function sendLinkaNotification(title, body, tag = "linka-notification") {
  if (isDesktopShell()) {
    try {
      const api = await import("@tauri-apps/plugin-notification");
      let allowed = await api.isPermissionGranted();
      if (!allowed) allowed = (await api.requestPermission()) === "granted";
      if (allowed) api.sendNotification({ title: String(title).slice(0, 100), body: String(body).slice(0, 240) });
    } catch {
      // Notifications should never interrupt saving or syncing library items.
    }
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification(title, { body, tag }); } catch {}
  }
}
function compareVersions(left, right) {
  const a = String(left || "").match(/\d+/g)?.map(Number) || [];
  const b = String(right || "").match(/\d+/g)?.map(Number) || [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
async function installNativeUpdate(targetButton, statusElement) {
  if (!isDesktopShell()) return false;
  let update = pendingNativeUpdate;
  if (!update) {
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      update = await check();
      pendingNativeUpdate = update;
    } catch { return false; }
  }
  if (!update) return false;
  if (targetButton) targetButton.disabled = true;
  try {
    if (statusElement) statusElement.textContent = tr("updateDownloading");
    await update.downloadAndInstall(event => {
      if (!statusElement) return;
      if (event.event === "Started") statusElement.textContent = tr("updateDownloading");
      else if (event.event === "Progress") statusElement.textContent = tr("updateDownloading") + "…";
      else if (event.event === "Finished") statusElement.textContent = tr("updateInstalling");
    });
    pendingNativeUpdate = null;
    if (statusElement) statusElement.textContent = tr("updateRestarting");
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      if (statusElement) statusElement.textContent = tr("updateInstalled");
    }
    return true;
  } catch (error) {
    if (statusElement) statusElement.textContent = error?.message || tr("errors");
    return false;
  } finally {
    if (targetButton) targetButton.disabled = false;
  }
}
function releaseButton(target, label, url, statusElement = null) {
  const item = button(label, "linka-button");
  item.addEventListener("click", async () => {
    if (isDesktopShell() && pendingNativeUpdate) {
      const installed = await installNativeUpdate(item, statusElement);
      if (installed) return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  });
  target.append(item);
}
async function checkForRelease({ notify = false } = {}) {
  let nativeUpdate = null;
  if (isDesktopShell()) {
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      nativeUpdate = await check();
      pendingNativeUpdate = nativeUpdate;
    } catch {
      // Signed updater is optional until the release key is configured.
      pendingNativeUpdate = null;
    }
  }
  try {
    const response = await fetch(RELEASES_URL, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
    if (!response.ok) throw new Error("Release metadata unavailable");
    const release = await response.json();
    if (!release?.tag_name || release.draft || release.prerelease) return;
    updateRecord = release;
    const latest = String(nativeUpdate?.version || release.tag_name).replace(/^v/i, "");
    const releaseUrl = release.html_url || "https://github.com/anarabbasov2010-eng/Linka/releases/latest";
    const versionIsOlder = Boolean(nativeUpdate) || Boolean(BUILD_VERSION && compareVersions(BUILD_VERSION, String(release.tag_name).replace(/^v/i, "")) < 0);
    let banner = document.querySelector("#linka-update-banner");
    if (!banner && versionIsOlder) {
      banner = make("aside", "linka-update-banner");
      banner.id = "linka-update-banner";
      const copy = make("div", "linka-update-copy");
      copy.append(make("strong", "", tr("updateTitle")), make("span", "", tr("updateReady") + " · " + latest));
      const status = make("p", "linka-status");
      banner.append(copy, status);
      releaseButton(banner, tr("updateButton"), releaseUrl, status);
      document.querySelector("#app")?.prepend(banner);
    } else if (banner) {
      const span = banner.querySelector("span");
      if (span) span.textContent = tr("updateReady") + " · " + latest;
      const action = banner.querySelector("button");
      if (action) action.textContent = tr("updateButton");
    }
    if (notify && versionIsOlder && lastUpdateNotice !== latest &&
      localStorage.getItem(NOTIFY_KEY) === "true" && "Notification" in window && Notification.permission === "granted") {
      void sendLinkaNotification("Linka update", "Version " + latest + " is available.", "linka-update-" + latest);
      lastUpdateNotice = latest;
    }
  } catch {
    // A release feed problem never prevents access to the local inbox.
  }
}
function showUpdateSettings(panel) {
  const section = make("section", "linka-settings-block");
  section.append(make("h3", "", tr("updateTitle")));
  const detail = make("p", "linka-muted", isDesktopShell() && !UPDATER_ENABLED ? tr("updaterNotConfigured") : tr("latest"));
  const notes = make("div", "linka-release-notes");
  notes.hidden = true;
  const check = button(tr("checkUpdates"), "linka-button linka-button-secondary");
  check.addEventListener("click", async () => {
    check.disabled = true;
    detail.textContent = "Checking…";
    await checkForRelease();
    const latest = updateRecord?.tag_name?.replace(/^v/i, "");
    detail.textContent = pendingNativeUpdate
      ? tr("updateReady") + " " + (pendingNativeUpdate.version || latest || "")
      : latest && BUILD_VERSION && compareVersions(BUILD_VERSION, latest) < 0
        ? tr("updateReady") + " " + latest : isDesktopShell() && !UPDATER_ENABLED ? tr("updaterNotConfigured") : tr("latest");
    if (updateRecord) {
      releaseButton(section, tr("updateButton"), updateRecord.html_url || RELEASES_URL, detail);
      notes.replaceChildren(make("strong", "", tr("updateChanges")));
      const list = make("ul", "");
      localizeReleaseNotes(updateRecord.body || "").forEach(line => list.append(make("li", "", line)));
      if (list.children.length) { notes.append(list); notes.hidden = false; }
    }
    check.disabled = false;
  });
  section.append(detail, notes, check);
  panel.append(section);
}
function showNotificationSettings(panel) {
  const section = make("section", "linka-settings-block");
  section.append(make("h3", "", tr("notification")));
  const detail = make("p", "linka-muted",
    localStorage.getItem(NOTIFY_KEY) === "true" ? tr("notificationsOn") : "Linka can show update notices while the app is open.");
  const toggle = button(localStorage.getItem(NOTIFY_KEY) === "true" ? tr("notificationsOn") : tr("enableNotifications"), "linka-button linka-button-secondary");
  toggle.addEventListener("click", async () => {
    toggle.disabled = true;
    try {
      const allowed = await requestLinkaNotificationPermission();
      if (allowed) {
        localStorage.setItem(NOTIFY_KEY, "true");
        detail.textContent = tr("notificationsOn");
        toggle.textContent = tr("notificationsOn");
        await sendLinkaNotification("Linka", "Notifications are enabled.", "linka-notifications-test");
      } else {
        localStorage.setItem(NOTIFY_KEY, "false");
        setStatus(detail, "Notifications are blocked by the operating system.", true);
      }
    } catch {
      setStatus(detail, "Notifications are not available in this app environment.", true);
    } finally { toggle.disabled = false; }
  });
  section.append(detail, toggle);
  panel.append(section);
}
function openProfileEditor({ firstRun = false, close = () => {} } = {}) {
  const dialog = modal(tr("profileTitle"), tr("profileBody"), { onboarding: firstRun });
  const panel = dialog.panel;
  const old = readLinkaProfile();
  const name = field(tr("name"), "text", old?.displayName || "", "Anar");
  name.input.maxLength = 48;
  name.input.autocomplete = "nickname";
  const age = field(tr("age"), "number", old?.age ?? "", "16");
  age.input.min = "13"; age.input.max = "120";
  const status = make("p", "linka-status");
  const actions = make("div", "linka-actions");
  const cancel = button(tr("cancel"), "linka-button linka-button-secondary");
  cancel.addEventListener("click", () => {
    if (firstRun) {
      localStorage.setItem(ONBOARDED_KEY, "true");
      dialog.close();
    } else close();
  });
  const finish = button(tr("finish"));
  finish.addEventListener("click", () => {
    try {
      const profile = saveLinkaProfile({ displayName: name.input.value, age: age.input.value });
      localStorage.setItem(ONBOARDED_KEY, "true");
      setStatus(status, tr("profileSaved"));
      dialog.close();
      if (getCloudSession()) window.dispatchEvent(new CustomEvent("linka:profile-saved", { detail: profile }));
    } catch (error) { setStatus(status, error.message || tr("errors"), true); }
  });
  actions.append(cancel, finish);
  const form = make("form", "linka-form-stack");
  form.addEventListener("submit", event => { event.preventDefault(); finish.click(); });
  form.append(name.wrap, age.wrap, status, actions);
  panel.append(form);
  name.input.focus();
}
function showQrPairing(panel, config, onSuccess) {
  const section = make("section", "linka-settings-block");
  section.append(make("h3", "", tr("qrLogin")), make("p", "linka-muted", tr("qrIntro")));
  const content = make("div", "linka-qr-area");
  const status = make("p", "linka-status", tr("waiting"));
  const start = button(tr("qrLogin"), "linka-button linka-button-secondary");
  start.addEventListener("click", async () => {
    start.disabled = true;
    content.replaceChildren();
    setStatus(status, tr("waiting"));
    try {
      const challenge = await beginQrPairing(config);
      const deepLink = `linka://pair?id=${encodeURIComponent(challenge.id)}&secret=${encodeURIComponent(challenge.secret)}`;
      const image = make("img", "linka-qr-image");
      image.alt = "Linka QR sign-in code";
      image.src = await QRCode.toDataURL(deepLink, { width: 260, margin: 2, errorCorrectionLevel: "M", color: { dark: "#141418", light: "#ffffff" } });
      content.append(image, make("p", "linka-muted", new Date(challenge.expiresAt).toLocaleTimeString()));
      setStatus(status, tr("pairingReady"));
      const expires = new Date(challenge.expiresAt).getTime();
      while (Date.now() < expires && document.body.contains(image)) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const result = await claimQrPairing({ id: challenge.id, secret: challenge.secret, url: config.url, key: config.key });
          if (result.session) {
            setStatus(status, tr("connected"));
            window.dispatchEvent(new CustomEvent("linka:authenticated"));
            onSuccess?.();
            return;
          }
        } catch (error) {
          if (/not approved yet|waiting|202/i.test(String(error?.message || ""))) continue;
          throw error;
        }
      }
      setStatus(status, tr("expired"), true);
    } catch (error) {
      setStatus(status, error?.message || tr("qrUnavailable"), true);
    } finally { start.disabled = false; }
  });
  section.append(start, content, status);
  panel.append(section);
}
function showAccount({ firstRun = false } = {}) {
  const session = getCloudSession();
  if (session) {
    const dialog = modal(tr("account"), (tr("signedIn") + (session.email || "Linka account")), { onboarding: firstRun });
    const config = configForm(dialog.panel, getCloudConfig(), true);
    const profile = readLinkaProfile();
    const summary = make("p", "linka-muted", profile?.displayName ? `${profile.displayName}${profile.age ? " · " + profile.age : ""}` : tr("profileBody"));
    const actions = make("div", "linka-actions");
    const edit = button(tr("editProfile"), "linka-button linka-button-secondary");
    edit.addEventListener("click", () => openProfileEditor({ firstRun: false, close: dialog.close }));
    const sync = button(tr("syncNow"));
    sync.addEventListener("click", () => { window.dispatchEvent(new CustomEvent("linka:authenticated")); setStatus(status, tr("waiting")); });
    const signOut = button(tr("signOut"), "linka-button linka-button-danger");
    signOut.addEventListener("click", () => {
      disconnectCloud();
      dialog.close();
      setTimeout(() => showAccount(), 200);
      document.dispatchEvent(new CustomEvent("linka:status", { detail: tr("signOutInfo") }));
    });
    actions.append(edit, sync, signOut);
    const status = make("p", "linka-status");
    dialog.panel.append(summary, actions);
    showQrPairing(dialog.panel, { url: config.url.value, key: config.key.value }, () => { dialog.close(); setTimeout(() => showAccount(), 180); });
    dialog.panel.append(status);
    const close = button(tr("close"), "linka-button linka-button-secondary");
    close.addEventListener("click", dialog.close);
    dialog.panel.append(close);
    return;
  }

  const dialog = modal(tr("startTitle"), tr("startBody"), { onboarding: firstRun });
  const panel = dialog.panel;
  dialog.layer.classList.add("linka-auth-layer");
  panel.classList.add("linka-auth-panel");
  const authCopy = ({
    en: ["A QUIET PLACE FOR WHAT MATTERS", "Your personal library, at your pace.", "Your library stays on this device unless you choose to sync."],
    ru: ["ТИХОЕ МЕСТО ДЛЯ ВАЖНОГО", "Твоя личная библиотека — в своём ритме.", "Данные остаются на устройстве, пока ты сам не включишь синхронизацию."],
    az: ["VACİB OLANLAR ÜÇÜN SAKİN MƏKAN", "Şəxsi kitabxanan, öz ritmində.", "Sinxronizasiyanı seçməyincə kitabxanan bu cihazda qalır."],
    tr: ["ÖNEMLİ ŞEYLER İÇİN SAKİN BİR YER", "Kişisel kitaplığın, kendi ritminde.", "Eşitlemeyi seçmediğin sürece kitaplığın bu cihazda kalır."]
  })[langCode()] || ["A QUIET PLACE FOR WHAT MATTERS", "Your personal library, at your pace.", "Your library stays on this device unless you choose to sync."];
  const authIntro = make("div", "linka-auth-intro");
  authIntro.append(
    make("span", "linka-auth-eyebrow", authCopy[0]),
    make("h3", "linka-auth-headline", authCopy[1]),
    make("p", "linka-auth-description", authCopy[2])
  );
  panel.querySelector(".modal-head")?.insertAdjacentElement("afterend", authIntro);
  const service = configForm(panel, getCloudConfig(), true);
  const email = field(tr("email"), "email", "", "you@example.com");
  const code = field(tr("code"), "text", "", "000000");
  code.input.inputMode = "numeric";
  code.input.autocomplete = "one-time-code";
  code.input.maxLength = 6;
  code.input.pattern = "[0-9]{6}";
  code.wrap.hidden = true;
  const status = make("p", "linka-status");
  const sendCreate = button(tr("sendCreate"));
  const sendLogin = button(tr("sendLogin"), "linka-button linka-button-secondary");
  const verify = button(tr("verify"));
  verify.hidden = true;
  const offline = button(tr("continueOffline"), "linka-button linka-button-secondary linka-auth-offline");
  const actions = make("div", "linka-actions");
  actions.append(sendCreate, sendLogin, verify);
  const form = make("form", "linka-form-stack");
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (verify.hidden) sendLogin.click(); else verify.click();
  });
  form.append(email.wrap, code.wrap, status, actions);
  const emailFallback = make("details", "linka-config linka-email-fallback linka-auth-email-fallback");
  const emailFallbackSummary = make("summary", "", tr("emailFallback"));
  emailFallback.append(emailFallbackSummary, form);
  const googleStatus = make("p", "linka-status");
  const googleButton = button(tr("googleSignIn"), "linka-button linka-google-button");
  googleButton.setAttribute("data-auth-action", "google");
  const googleLabel = googleButton.textContent;
  googleButton.replaceChildren(make("span", "linka-google-mark", "G"), make("span", "linka-google-label", googleLabel));
  googleButton.addEventListener("click", async () => {
    googleButton.disabled = true;
    try {
      const config = saveCloudConfig(service.url.value, service.key.value);
      if (window.__TAURI_INTERNALS__) {
        // Keep the local Tauri webview alive while the system browser handles OAuth.
        const authorizeUrl = new URL(`${config.url}/auth/v1/authorize`);
        authorizeUrl.searchParams.set("provider", "google");
        authorizeUrl.searchParams.set("redirect_to", "linka://auth/callback");
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(authorizeUrl.toString());
      } else {
        // Vercel preview URLs rotate per deployment and may not be on Supabase's
        // redirect allow-list. Route preview sign-ins to the stable production
        // origin; production/custom domains continue using their own origin.
        const isVercelPreview = window.location.hostname.endsWith(".vercel.app") &&
          window.location.hostname !== "linka-web-tau.vercel.app";
        const origin = isVercelPreview ? "https://linka-web-tau.vercel.app" : window.location.origin;
        const redirectTo = new URL(window.location.pathname, origin).toString();
        startGoogleOAuth({ url: config.url, key: config.key, redirectTo });
      }
    } catch (error) {
      setStatus(googleStatus, error?.message || tr("errors"), true);
    } finally {
      googleButton.disabled = false;
    }
  });
  panel.append(googleButton, googleStatus, emailFallback, offline);
  showQrPairing(panel, { url: service.url.value, key: service.key.value }, () => {
    dialog.close();
    setTimeout(() => showAccount(), 180);
  });
  let sentAt = 0;
  let expiryAt = 0;
  let createUser = false;
  let cooldownInterval = null;
  const setBusy = busy => [googleButton, sendCreate, sendLogin, verify, offline].forEach(b => b.disabled = busy);
  const updateCountdown = () => {
    const remaining = Math.max(0, expiryAt - Date.now());
    if (remaining <= 0 && expiryAt) {
      verify.disabled = true;
      setStatus(status, tr("expired"), true);
    } else if (sentAt) {
      const wait = Math.max(0, getOtpCooldown(email.input.value));
      sendCreate.disabled = sendLogin.disabled = wait > 0;
      if (wait > 0) {
        const count = Math.ceil(wait / 1000);
        sendCreate.textContent = `${tr("sendCreate")} · ${count}s`;
        sendLogin.textContent = `${tr("sendLogin")} · ${count}s`;
      } else {
        sendCreate.textContent = tr("sendCreate");
        sendLogin.textContent = tr("sendLogin");
      }
    }
  };
  const send = async isCreate => {
    createUser = isCreate;
    setBusy(true);
    try {
      const config = saveCloudConfig(service.url.value, service.key.value);
      const result = await requestEmailOtp({ url: config.url, key: config.key, email: email.input.value, createUser });
      sentAt = Date.now();
      expiryAt = sentAt + 120000;
      code.wrap.hidden = false;
      verify.hidden = false;
      sendCreate.hidden = true;
      sendLogin.hidden = true;
      offline.hidden = true;
      setStatus(status, tr("codeSent"));
      code.input.focus();
      clearInterval(cooldownInterval);
      cooldownInterval = setInterval(updateCountdown, 1000);
      updateCountdown();
    } catch (error) { setStatus(status, error?.message || tr("errors"), true); }
    finally { setBusy(false); updateCountdown(); }
  };
  sendCreate.addEventListener("click", () => send(true));
  sendLogin.addEventListener("click", () => send(false));
  verify.addEventListener("click", async () => {
    if (Date.now() > expiryAt) { setStatus(status, tr("expired"), true); return; }
    setBusy(true);
    try {
      const config = saveCloudConfig(service.url.value, service.key.value);
      await verifyEmailOtp({ url: config.url, key: config.key, email: email.input.value, token: code.input.value });
      clearInterval(cooldownInterval);
      localStorage.removeItem(ONBOARDED_KEY);
      dialog.close();
      window.dispatchEvent(new CustomEvent("linka:authenticated"));
      if (firstRun || !readLinkaProfile()) setTimeout(() => openProfileEditor({ firstRun: true }), 180);
      else document.dispatchEvent(new CustomEvent("linka:status", { detail: tr("connected") }));
    } catch (error) { setStatus(status, error?.message || tr("errors"), true); }
    finally { setBusy(false); }
  });
  offline.addEventListener("click", () => {
    clearInterval(cooldownInterval);
    dialog.close();
    openProfileEditor({ firstRun: true });
  });
  if (!service.url.value || !service.key.value) setStatus(status, tr("setupNeeded"));
}
function showSettings() {
  const dialog = modal(tr("settings"), "Linka");
  const pickerLabel = make("label", "linka-field");
  pickerLabel.append(make("span", "", tr("language")));
  const picker = make("select", "linka-select");
  LANGUAGES.forEach(item => { const option=make("option","",item.label); option.value=item.value; picker.append(option); });
  picker.value = langCode();
  picker.addEventListener("change", () => { setLanguage(picker.value); dialog.close(); setTimeout(showSettings, 240); });
  pickerLabel.append(picker);
  dialog.panel.append(pickerLabel);

  const preferenceLabels = ({
    en: { accent: "Accent color", density: "Interface density", compact: "Compact", standard: "Standard", spacious: "Spacious", effects: "Visual effects", quiet: "Quiet", balanced: "Balanced", atmosphere: "Atmosphere", forest: "Forest", oled: "OLED black", cloud: "Cloud sync", backdrop: "Atmosphere & music", agreement: "User agreement", glassOpacity: "Glass transparency", glassBlur: "Glass blur", glassSaturation: "Glass saturation", backgroundDim: "Background dimming", appearanceReset: "Reset appearance", glassOpacityHelp: "Lower values make panels more transparent.", glassBlurHelp: "Higher blur softens what sits behind panels.", glassSaturationHelp: "Adjust the richness of colors seen through glass.", accentColorCustom: "Accent color", blockColorCustom: "Panel tint", accentColorHelp: "Sets the highlight color across the interface.", blockColorHelp: "Adds a personal tint to glass panels while preserving contrast.", backgroundDimHelp: "Controls how dark the background scene appears." },
    ru: { accent: "Акцентный цвет", density: "Плотность интерфейса", compact: "Компактная", standard: "Стандартная", spacious: "Просторная", effects: "Визуальные эффекты", quiet: "Минимальные", balanced: "Сбалансированные", atmosphere: "Атмосфера", forest: "Лес", oled: "OLED-чёрная", cloud: "Облачная синхронизация", backdrop: "Атмосфера и музыка", agreement: "Пользовательское соглашение", glassOpacity: "Прозрачность стекла", glassBlur: "Размытие стекла", glassSaturation: "Насыщенность стекла", backgroundDim: "Затемнение фона", appearanceReset: "Сбросить оформление", glassOpacityHelp: "Чем ниже значение, тем прозрачнее панели.", glassBlurHelp: "Сильное размытие смягчает изображение за панелями.", glassSaturationHelp: "Настраивает насыщенность цветов, видимых сквозь стекло.", accentColorCustom: "Цвет акцента", blockColorCustom: "Оттенок блоков", accentColorHelp: "Меняет цвет акцентов по всему интерфейсу.", blockColorHelp: "Добавляет панелям собственный оттенок, сохраняя читаемость.", backgroundDimHelp: "Управляет затемнением фоновой сцены." },
    az: { accent: "Vurğu rəngi", density: "İnterfeys sıxlığı", compact: "Yığcam", standard: "Standart", spacious: "Geniş", effects: "Vizual effektlər", quiet: "Sakit", balanced: "Balanslı", atmosphere: "Atmosfer", forest: "Meşə", oled: "OLED qara", cloud: "Bulud sinxronizasiyası", backdrop: "Atmosfer və musiqi", agreement: "İstifadəçi razılaşması", glassOpacity: "Şüşə şəffaflığı", glassBlur: "Şüşə bulanıqlığı", glassSaturation: "Şüşə rəng doyumu", backgroundDim: "Fonun qaraldılması", appearanceReset: "Görünüşü sıfırla", glassOpacityHelp: "Dəyər azaldıqca panellər daha şəffaf olur.", glassBlurHelp: "Bulanıqlıq panellərin arxasındakı təsviri yumşaldır.", glassSaturationHelp: "Şüşədən görünən rənglərin doyumunu tənzimləyir.", accentColorCustom: "Vurğu rəngi", blockColorCustom: "Blokların tonu", accentColorHelp: "İnterfeys boyunca vurğu rəngini dəyişir.", blockColorHelp: "Oxunaqlılığı qoruyaraq şüşə panellərə rəng tonu verir.", backgroundDimHelp: "Fon səhnəsinin nə qədər qaralacağını idarə edir." },
    tr: { accent: "Vurgu rengi", density: "Arayüz yoğunluğu", compact: "Kompakt", standard: "Standart", spacious: "Geniş", effects: "Görsel efektler", quiet: "Sakin", balanced: "Dengeli", atmosphere: "Atmosfer", forest: "Orman", oled: "OLED siyahı", cloud: "Bulut eşitleme", backdrop: "Atmosfer ve müzik", agreement: "Kullanıcı sözleşmesi", glassOpacity: "Cam şeffaflığı", glassBlur: "Cam bulanıklığı", glassSaturation: "Cam doygunluğu", backgroundDim: "Arka plan karartma", appearanceReset: "Görünümü sıfırla", glassOpacityHelp: "Değer azaldıkça paneller daha şeffaf olur.", glassBlurHelp: "Bulanıklık, panellerin arkasındaki görüntüyü yumuşatır.", glassSaturationHelp: "Camın arkasından görünen renklerin yoğunluğunu ayarlar.", accentColorCustom: "Vurgu rengi", blockColorCustom: "Panel tonu", accentColorHelp: "Arayüzdeki vurgu rengini değiştirir.", blockColorHelp: "Okunabilirliği koruyarak cam panellere kişisel bir ton verir.", backgroundDimHelp: "Arka plan sahnesinin ne kadar karartılacağını ayarlar." }
  })[langCode()] || {};
  const addPreference = (label, options, selected, apply) => {
    const field = make("label", "linka-field");
    field.append(make("span", "", label));
    const select = make("select", "linka-select");
    options.forEach(option => {
      const item = make("option", "", option.label);
      item.value = option.value;
      select.append(item);
    });
    select.value = selected;
    select.addEventListener("change", () => apply(select.value));
    field.append(select);
    dialog.panel.append(field);
    return select;
  };
  const appearanceCopy = ({
    en: ["THE LINKA SIGNATURE", "Forest Atelier", "One signature look: a twilight forest, bookish typography and restrained brass accents."],
    ru: ["ФИРМЕННЫЙ СТИЛЬ LINKA", "Forest Atelier", "Единое оформление: сумеречный лес, книжная типографика и мягкие латунные акценты."],
    az: ["LINKA-NIN İMZA ÜSLUBU", "Forest Atelier", "Vahid görünüş: alaqaranlıq meşə, kitab tipografiyası və zərif latun vurğuları."],
    tr: ["LINKA'NIN İMZA STİLİ", "Forest Atelier", "Tek bir görünüm: alacakaranlık ormanı, kitap karakterli tipografi ve ölçülü pirinç vurgular."]
  })[langCode()] || ["THE LINKA SIGNATURE", "Forest Atelier", "A twilight forest, bookish typography and restrained brass accents."];
  const appearanceCard = make("section", "linka-appearance-card");
  appearanceCard.append(
    make("span", "linka-appearance-kicker", appearanceCopy[0]),
    make("h3", "linka-appearance-title", appearanceCopy[1]),
    make("p", "linka-appearance-description", appearanceCopy[2])
  );
  dialog.panel.append(appearanceCard);

  addPreference(preferenceLabels.density || "Interface density", [
    { value: "compact", label: preferenceLabels.compact || "Compact" },
    { value: "standard", label: preferenceLabels.standard || "Standard" },
    { value: "spacious", label: preferenceLabels.spacious || "Spacious" }
  ], localStorage.getItem("linka.density") || "standard", setLinkaDensity);
  addPreference(preferenceLabels.effects || "Visual effects", [
    { value: "quiet", label: preferenceLabels.quiet || "Quiet" },
    { value: "balanced", label: preferenceLabels.balanced || "Balanced" },
    { value: "atmosphere", label: preferenceLabels.atmosphere || "Atmosphere" }
  ], localStorage.getItem("linka.effects") || "atmosphere", setLinkaEffects);

  const materialsSection = make("section", "linka-settings-block");
  materialsSection.append(make("h3", "", langCode() === "ru" ? "Настройка материалов" : langCode() === "az" ? "Materialların tənzimlənməsi" : langCode() === "tr" ? "Malzeme ayarları" : "Material tuning"));
  const addAppearanceSlider = (name, labelKey, min, max, step, unit, helpKey) => {
    const wrap = make("div", "linka-appearance-control");
    const head = make("div", "linka-appearance-control-head");
    const id = "linka-appearance-" + name;
    const label = make("label", "", preferenceLabels[labelKey] || labelKey);
    label.htmlFor = id;
    const output = make("output", "");
    const input = make("input", "");
    input.id = id;
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(getLinkaAppearanceControl(name));
    input.setAttribute("aria-describedby", id + "-help");
    const renderValue = () => { output.value = input.value + unit; output.textContent = output.value; };
    input.addEventListener("input", () => { setLinkaAppearanceControl(name, input.value); renderValue(); });
    head.append(label, output);
    const help = make("small", "", preferenceLabels[helpKey] || "");
    help.id = id + "-help";
    wrap.append(head, input, help);
    materialsSection.append(wrap);
    renderValue();
  };
  addAppearanceSlider("glassOpacity", "glassOpacity", 25, 95, 1, "%", "glassOpacityHelp");
  addAppearanceSlider("glassBlur", "glassBlur", 0, 32, 1, " px", "glassBlurHelp");
  addAppearanceSlider("glassSaturation", "glassSaturation", 80, 150, 1, "%", "glassSaturationHelp");
  addAppearanceSlider("backgroundDim", "backgroundDim", 25, 100, 1, "%", "backgroundDimHelp");
  const addAppearanceColor = (name, labelKey, helpKey) => {
    const wrap = make("div", "linka-appearance-control linka-appearance-color");
    const head = make("div", "linka-appearance-control-head");
    const id = "linka-color-" + name;
    const label = make("label", "", preferenceLabels[labelKey] || labelKey);
    label.htmlFor = id;
    const output = make("output", "");
    const input = make("input", "");
    input.type = "color";
    input.id = id;
    input.value = getLinkaCustomColor(name);
    input.setAttribute("aria-describedby", id + "-help");
    const renderValue = () => { output.value = input.value.toUpperCase(); output.textContent = output.value; };
    input.addEventListener("input", () => { setLinkaCustomColor(name, input.value); renderValue(); });
    head.append(label, output);
    const help = make("small", "", preferenceLabels[helpKey] || "");
    help.id = id + "-help";
    wrap.append(head, input, help);
    materialsSection.append(wrap);
    renderValue();
  };
  addAppearanceColor("accentColor", "accentColorCustom", "accentColorHelp");
  addAppearanceColor("blockColor", "blockColorCustom", "blockColorHelp");
  const resetAppearance = button(preferenceLabels.appearanceReset || "Reset appearance", "linka-button linka-button-secondary linka-appearance-reset");
  resetAppearance.addEventListener("click", () => {
    resetLinkaAppearance();
    materialsSection.querySelectorAll('input[type="range"]').forEach(input => {
      const name = input.id.replace("linka-appearance-", "");
      input.value = String(getLinkaAppearanceControl(name));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    materialsSection.querySelectorAll('input[type="color"]').forEach(input => {
      const name = input.id.replace("linka-color-", "");
      input.value = getLinkaCustomColor(name);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const density = dialog.panel.querySelectorAll("select.linka-select");
    if (density[1]) density[1].value = "standard";
    if (density[2]) density[2].value = "balanced";
  });
  materialsSection.append(resetAppearance);
  dialog.panel.append(materialsSection);


  const plansCopy = ({
    en: {
      title: "The future of Linka",
      intro: "All features and appearance controls are free today. These tiers are a roadmap only — nothing is locked and no payment is being requested.",
      badges: ["Included now", "Planned", "Planned"], names: ["Free", "Pro", "Ultimate"],
      descriptions: ["The complete Linka experience, available now.", "More ways to shape colors, materials and saved looks.", "A deeply personal workspace with custom image and video atmospheres."],
      features: [["All current tools are unlocked", "Glass, block-color and accent controls", "Custom photo/video backgrounds; optional cloud sync"], ["More accent and surface palettes", "Saved themes and material presets", "Expanded layout personalization"], ["Advanced atmosphere presets", "Additional animated background treatments", "Portable visual profiles"]]
    },
    ru: {
      title: "Будущее Linka",
      intro: "Сейчас все функции и настройки оформления бесплатны. Тарифы ниже — только план развития: ничего не заблокировано, оплата не требуется.",
      badges: ["Доступно сейчас", "В планах", "В планах"], names: ["Free", "Pro", "Ultimate"],
      descriptions: ["Полноценная Linka, доступная уже сейчас.", "Больше способов настраивать цвета, материалы и сохранённые стили.", "Персональное рабочее пространство с собственными фото- и видеофонами."],
      features: [["Все текущие функции открыты", "Настройка акцента, цвета блоков и стекла", "Свои фото/видео-фоны и облако по желанию"], ["Расширенные палитры акцентов и поверхностей", "Сохраняемые темы и пресеты материалов", "Более тонкая настройка интерфейса"], ["Расширенные наборы атмосферы", "Дополнительные эффекты фоновой сцены", "Переносимые профили оформления"]]
    },
    az: {
      title: "Linka-nın gələcəyi",
      intro: "Hazırda bütün funksiyalar və görünüş parametrləri pulsuzdur. Bu planlar yalnız gələcək yol xəritəsidir — heç nə kilidlənməyib və ödəniş tələb olunmur.",
      badges: ["İndi daxildir", "Planlaşdırılır", "Planlaşdırılır"], names: ["Free", "Pro", "Ultimate"],
      descriptions: ["Bütün imkanları ilə Linka artıq əlçatandır.", "Rəngləri, materialları və saxlanılan görünüşləri daha geniş fərdiləşdirmə.", "Şəxsi şəkil və video atmosferləri olan fərdi iş məkanı."],
      features: [["Bütün hazırkı funksiyalar açıqdır", "Vurğu, blok rəngi və şüşə parametrləri", "Şəxsi foto/video fonları və istəyə bağlı bulud"], ["Geniş rəng və səth palitraları", "Saxlanılan mövzular və material presetləri", "Daha detallı interfeys fərdiləşdirməsi"], ["Qabaqcıl atmosfer paketləri", "Əlavə animasiyalı fon effektləri", "Daşına bilən görünüş profilləri"]]
    },
    tr: {
      title: "Linka'nın geleceği",
      intro: "Şu anda tüm özellikler ve görünüm ayarları ücretsiz. Bu planlar yalnızca yol haritasıdır — hiçbir özellik kilitli değil ve ödeme gerekmiyor.",
      badges: ["Şimdi dahil", "Planlanıyor", "Planlanıyor"], names: ["Free", "Pro", "Ultimate"],
      descriptions: ["Tüm özellikleriyle Linka, şimdi kullanılabilir.", "Renkleri, malzemeleri ve kayıtlı görünümleri daha kapsamlı kişiselleştirme.", "Özel görsel ve video atmosferlerine sahip kişisel çalışma alanı."],
      features: [["Mevcut tüm araçlar açık", "Vurgu, panel rengi ve cam kontrolleri", "Özel foto/video arka planları ve isteğe bağlı bulut"], ["Daha geniş vurgu ve yüzey paletleri", "Kaydedilebilir temalar ve malzeme hazır ayarları", "Daha ayrıntılı arayüz kişiselleştirme"], ["Gelişmiş atmosfer paketleri", "Ek animasyonlu arka plan efektleri", "Taşınabilir görünüm profilleri"]]
    }
  })[langCode()] || null;
  const planText = plansCopy || {
    title: "The future of Linka",
    intro: "All features and appearance controls are free today. These tiers are a roadmap only — nothing is locked and no payment is being requested.",
    badges: ["Included now", "Planned", "Planned"], names: ["Free", "Pro", "Ultimate"],
    descriptions: ["The complete Linka experience, available now.", "More ways to shape colors, materials and saved looks.", "A deeply personal workspace with custom image and video atmospheres."],
    features: [["All current tools are unlocked", "Glass, block-color and accent controls", "Custom photo/video backgrounds; optional cloud sync"], ["More accent and surface palettes", "Saved themes and material presets", "Expanded layout personalization"], ["Advanced atmosphere presets", "Additional animated background treatments", "Portable visual profiles"]]
  };
  const plansSection = make("section", "linka-settings-block linka-plans-section");
  plansSection.append(make("h3", "", planText.title), make("p", "linka-muted linka-plans-intro", planText.intro));
  const plansGrid = make("div", "linka-plans-grid");
  planText.names.forEach((name, index) => {
    const card = make("article", "linka-plan-card" + (index === 0 ? " is-current" : " is-future"));
    card.dataset.plan = name.toLowerCase();
    const head = make("div", "linka-plan-head");
    head.append(make("h4", "", name), make("span", "linka-plan-badge" + (index === 0 ? " is-current" : ""), planText.badges[index]));
    card.append(head, make("p", "linka-plan-description", planText.descriptions[index]));
    const list = make("ul", "linka-plan-features");
    planText.features[index].forEach(feature => list.append(make("li", "", feature)));
    card.append(list);
    plansGrid.append(card);
  });
  plansSection.append(plansGrid);
  dialog.panel.append(plansSection);

  const soundSection = make("div", "linka-settings-block");
  soundSection.append(make("h3", "", tr("ambientSound")), make("p", "linka-muted", tr("ambientSoundBody")));
  const soundToggle = button("", "linka-button linka-button-secondary");
  const refreshSoundLabel = () => { soundToggle.textContent = (ambientAudioEnabled ? "✓ " : "") + tr("ambientSound"); soundToggle.setAttribute("aria-pressed", String(ambientAudioEnabled)); };
  refreshSoundLabel();
  soundToggle.addEventListener("click", async () => {
    soundToggle.disabled = true;
    try { if (ambientAudioEnabled) stopAmbientSound(); else await startAmbientSound(); refreshSoundLabel(); }
    catch { stopAmbientSound(); soundSection.append(make("p", "linka-muted", tr("audioUnavailable"))); }
    finally { soundToggle.disabled = false; }
  });
  soundSection.append(soundToggle); dialog.panel.append(soundSection);

  const motionSection = make("div", "linka-settings-block");
  motionSection.append(make("h3", "", tr("reducedMotion")), make("p", "linka-muted", tr("reducedMotionBody")));
  const motionToggle = button("", "linka-button linka-button-secondary");
  const currentReducedMotion = () => localStorage.getItem("linka.reduceMotion") === "true";
  const refreshMotionLabel = () => {
    motionToggle.textContent = currentReducedMotion() ? "✓ " + tr("reducedMotion") : tr("reducedMotion");
    motionToggle.setAttribute("aria-pressed", String(currentReducedMotion()));
  };
  refreshMotionLabel();
  motionToggle.addEventListener("click", () => {
    const next = !currentReducedMotion();
    localStorage.setItem("linka.reduceMotion", String(next));
    document.documentElement.classList.toggle("reduced-motion", next);
    refreshMotionLabel();
  });
  motionSection.append(motionToggle);
  dialog.panel.append(motionSection);

  const account = button(tr("account"));
  account.addEventListener("click", () => { dialog.close(); showAccount(); });
  const profile = button(tr("editProfile"), "linka-button linka-button-secondary");
  profile.addEventListener("click", () => { dialog.close(); openProfileEditor(); });
  const actions = make("div", "linka-actions"); actions.append(account, profile);
  dialog.panel.append(actions);

  const utilityActions = make("div", "linka-actions");
  const cloudSettings = button(preferenceLabels.cloud || "Cloud sync", "linka-button linka-button-secondary");
  cloudSettings.addEventListener("click", () => { dialog.close(); window.dispatchEvent(new Event("linka:open-cloud-settings")); });
  const atmosphereSettings = button(preferenceLabels.backdrop || "Atmosphere & music", "linka-button linka-button-secondary");
  atmosphereSettings.addEventListener("click", () => { dialog.close(); window.dispatchEvent(new Event("linka:open-atmosphere-settings")); });
  const agreementSettings = button(preferenceLabels.agreement || "User agreement", "linka-button linka-button-secondary");
  agreementSettings.addEventListener("click", () => { dialog.close(); window.dispatchEvent(new Event("linka:open-agreement")); });
  utilityActions.append(cloudSettings, atmosphereSettings, agreementSettings);
  dialog.panel.append(utilityActions);

  showNotificationSettings(dialog.panel);
  showUpdateSettings(dialog.panel);
  const close = button(tr("close"), "linka-button linka-button-secondary");
  close.addEventListener("click", dialog.close);
  dialog.panel.append(close);
}
function addAccountButton() {
  const top = document.querySelector(".top-actions");
  if (!top || document.querySelector("#linka-account-button")) return;
  const account = button("", "icon-btn");
  account.id = "linka-account-button";
  account.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.3"/><path d="M5.5 20c.4-3.5 2.9-5.5 6.5-5.5s6.1 2 6.5 5.5"/></svg>';
  account.addEventListener("click", () => showAccount());
  const settings = document.querySelector("#settings-button");
  top.insertBefore(account, settings || null);
}

function mountWebNavigation() {
  const shell = document.querySelector("#app");
  if (!shell || shell.querySelector(".web-sidebar")) return;
  const sidebar = make("aside", "web-sidebar");
  sidebar.setAttribute("aria-label", "Linka navigation");
  const brand = make("a", "web-side-brand");
  brand.href = "/";
  brand.innerHTML = '<img src="/linka-mark.svg" alt=""><span>linka</span>';
  const caption = make("div", "web-side-caption", "YOUR SPACE");
  const nav = make("nav", "web-side-nav");
  nav.setAttribute("aria-label", "Library sections");
  const entries = [
    ["all", tr("inbox")], ["pinned", tr("pinned")], ["read-later", tr("later")], ["archive", tr("archive")], ["trash", tr("trash")],
    ["links", tr("links")], ["notes", tr("notes")],
    ["search", tr("search")], ["capture", tr("quick")],
    ["account", tr("account")], ["settings", tr("settings")]
  ];
  const navIcons = {
    all: '<rect x="4" y="4" width="6" height="6" rx="1.4"/><rect x="14" y="4" width="6" height="6" rx="1.4"/><rect x="4" y="14" width="6" height="6" rx="1.4"/><rect x="14" y="14" width="6" height="6" rx="1.4"/>',
    pinned: '<path d="M8 4h8l-1 5 3 3v2H6v-2l3-3-1-5Z"/><path d="M12 14v6"/>',
    "read-later": '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    archive: '<path d="M4 5h16v4H4z"/><path d="M6 9v10h12V9M10 13h4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
    links: '<path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7"/>',
    notes: '<path d="M6 4h9l3 3v13H6z"/><path d="M14 4v4h4M9 12h6M9 16h6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4"/>',
    capture: '<path d="M12 5v14M5 12h14"/>',
    account: '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.4-3.5 2.9-5.5 6.5-5.5s6.1 2 6.5 5.5"/>',
    settings: '<path d="M12 3.7v2M12 18.3v2M20.3 12h-2M5.7 12h-2M17.85 6.15l-1.42 1.42M7.57 16.43l-1.42 1.42M17.85 17.85l-1.42-1.42M7.57 7.57 6.15 6.15"/><circle cx="12" cy="12" r="4"/>'
  };
  const itemButtons = new Map();
  const activePill = make("span", "web-nav-active-pill");
  activePill.setAttribute("aria-hidden", "true");
  nav.append(activePill);
  let activeKey = "all";
  const activate = key => {
    activeKey = key;
    for (const [value, node] of itemButtons) {
      const active = value === key;
      node.classList.toggle("active", active);
      node.setAttribute("aria-current", active ? "page" : "false");
    }
    const target = itemButtons.get(key);
    if (target) { activePill.style.height = target.offsetHeight + "px"; activePill.style.transform = "translate3d(0," + target.offsetTop + "px,0)"; activePill.style.opacity = "1"; }
  };
  for (const [key, label] of entries) {
    const node = make("button", "web-nav-item");
    node.type = "button";
    node.dataset.nav = key;
    node.setAttribute("aria-label", label);
    node.title = label;
    node.innerHTML = '<span class="web-nav-glyph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></svg></span><span class="web-nav-label"></span>';
    node.querySelector(".web-nav-glyph svg").innerHTML = navIcons[key];
    node.querySelector(".web-nav-label").textContent = label;
    node.addEventListener("click", () => {
      if (["all", "pinned", "read-later", "archive", "trash", "links", "notes"].includes(key)) {
        document.querySelector('[data-filter="' + key + '"]')?.click();
        activate(key);
        document.querySelector(".workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (key === "search") {
        document.querySelector("#search-space-button")?.click();
        activate("search");
      } else if (key === "capture") {
        activate("capture");
        document.querySelector("#capture-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.querySelector("#capture-text")?.focus({ preventScroll: true });
      } else if (key === "account") {
        document.querySelector("#linka-account-button")?.click();
        activate("account");
      } else if (key === "settings") {
        document.querySelector("#settings-button")?.click();
        activate("settings");
      }
    });
    itemButtons.set(key, node);
    nav.append(node);
  }
  window.addEventListener("resize", () => {
    const target = itemButtons.get(activeKey);
    if (!target || !activePill.isConnected) return;
    activePill.style.height = target.offsetHeight + "px";
    activePill.style.transform = "translate3d(0," + target.offsetTop + "px,0)";
  }, { passive: true });
  const foot = make("div", "web-side-foot");
  foot.innerHTML = '<span class="web-side-status-dot" aria-hidden="true"></span><span><strong></strong><small></small></span>';
  sidebar.append(brand, caption, nav, foot);
  shell.prepend(sidebar);
  document.querySelectorAll("[data-filter]").forEach(node => node.addEventListener("click", () => activate(node.dataset.filter || "all")));
  activate("all");
}

function updateWebNavLabels() {
  const lang = langCode();
  const labels = {
    en: { all: "Inbox", pinned: "Pinned", "read-later": "Read later", archive: "Archive", trash: "Trash", links: "Links", notes: "Notes", search: "Search", capture: "New capture", account: "Account", settings: "Settings" },
    ru: { all: "Входящие", pinned: "Закреплённое", "read-later": "Сохранить на потом", archive: "Архив", trash: "Корзина", links: "Ссылки", notes: "Заметки", search: "Поиск", capture: "Сохранить", account: "Аккаунт", settings: "Настройки" },
    az: { all: "Gələnlər", pinned: "Sabitlənmiş", "read-later": "Sonra oxu", archive: "Arxiv", trash: "Zibil qutusu", links: "Linklər", notes: "Qeydlər", search: "Axtar", capture: "Yadda saxla", account: "Hesab", settings: "Parametrlər" },
    tr: { all: "Gelen kutusu", pinned: "Sabitlenen", "read-later": "Daha sonra oku", archive: "Arşiv", trash: "Çöp kutusu", links: "Bağlantılar", notes: "Notlar", search: "Ara", capture: "Kaydet", account: "Hesap", settings: "Ayarlar" }
  };
  const selected = labels[lang] || labels.en;
  document.querySelectorAll(".web-nav-item[data-nav]").forEach(node => {
    const label = selected[node.dataset.nav] || labels.en[node.dataset.nav] || "";
    const labelNode = node.querySelector(".web-nav-label");
    if (labelNode) labelNode.textContent = label;
    node.setAttribute("aria-label", label);
    node.title = label;
  });
  const sidebar = document.querySelector(".web-sidebar");
  if (sidebar) {
    sidebar.setAttribute("aria-label", lang === "ru" ? "Навигация Linka" : lang === "az" ? "Linka naviqasiyası" : lang === "tr" ? "Linka gezinme" : "Linka navigation");
    const sideCopy = {
      en: { caption: "YOUR SPACE", privacy: "Private by default", sync: "Stored here. Sync when you sign in." },
      ru: { caption: "ТВОЁ ПРОСТРАНСТВО", privacy: "Конфиденциальность по умолчанию", sync: "Хранится здесь. Синхронизация после входа." },
      az: { caption: "SƏNİN MƏKANIN", privacy: "Məxfilik standart olaraq qorunur", sync: "Burada saxlanılır. Daxil olduqda sinxronlaşır." },
      tr: { caption: "SENİN ALANIN", privacy: "Gizlilik varsayılan olarak açık", sync: "Burada saklanır. Giriş yaptığında eşitlenir." }
    }[lang] || { caption: "YOUR SPACE", privacy: "Private by default", sync: "Stored here. Sync when you sign in." };
    const caption = sidebar.querySelector(".web-side-caption");
    const privacy = sidebar.querySelector(".web-side-foot strong");
    const sync = sidebar.querySelector(".web-side-foot small");
    if (caption) caption.textContent = sideCopy.caption;
    if (privacy) privacy.textContent = sideCopy.privacy;
    if (sync) sync.textContent = sideCopy.sync;
  }
}
async function handleDesktopOAuthUrl(rawUrl) {
  try {
    const incoming = new URL(String(rawUrl));
    if (incoming.protocol !== "linka:" || incoming.hostname !== "auth" || incoming.pathname !== "/callback") return;
    const config = getCloudConfig();
    const session = await completeGoogleOAuthCallback({
      url: config.url,
      key: config.key,
      location: { hash: incoming.hash, pathname: "", search: "" },
      history: null
    });
    if (session) window.dispatchEvent(new CustomEvent("linka:oauth-complete", { detail: session }));
  } catch (error) {
    document.dispatchEvent(new CustomEvent("linka:status", { detail: error?.message || tr("errors") }));
  }
}
async function initDesktopDeepLinks() {
  if (!window.__TAURI_INTERNALS__) return;
  try {
    const { getCurrent, onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
    const initial = await getCurrent();
    if (initial) for (const value of initial) await handleDesktopOAuthUrl(value);
    await onOpenUrl(values => {
      for (const value of values) void handleDesktopOAuthUrl(value);
    });
  } catch (error) {
    document.dispatchEvent(new CustomEvent("linka:status", { detail: error?.message || "Desktop sign-in callback unavailable." }));
  }
}
function notificationForSavedCapture(event) {
  const enabled = localStorage.getItem(NOTIFY_KEY) === "true";
  if (!enabled || !("Notification" in window) || Notification.permission !== "granted") return;
  const title = String(event?.detail?.title || "Saved to Linka").slice(0, 100);
  const body = String(event?.detail?.body || "Your item is in your library.").slice(0, 180);
  void sendLinkaNotification(title, body, "linka-capture");
}
function handleIncomingPairing() {
  const params = new URLSearchParams(location.search);
  const value = params.get("pair");
  if (!value) return;
  const [id, secret] = value.split(".");
  if (!id || !secret) return;
  try { history.replaceState({}, "", location.pathname + location.hash); } catch {}
  const session = getCloudSession();
  if (session) {
    const config = getCloudConfig();
    approveQrPairing({ id, secret, url: config.url, key: config.key, accessToken: session.accessToken, refreshToken: session.refreshToken })
      .then(() => document.dispatchEvent(new CustomEvent("linka:status", { detail: "QR sign-in approved. Return to your other device." })))
      .catch(error => document.dispatchEvent(new CustomEvent("linka:status", { detail: error?.message || tr("errors") })));
  } else {
    localStorage.setItem("linka.pending-pairing.v1", JSON.stringify({ id, secret }));
    setTimeout(() => showAccount(), 350);
  }
}
export function initLinkaExperience() {
  document.documentElement.dataset.platform = window.__TAURI_INTERNALS__ ? "desktop" : "web";
  const picker = document.querySelector("#linka-language");
  if (picker) {
    picker.value = langCode();
    picker.addEventListener("change", () => setLanguage(picker.value));
  }
  addAccountButton();
  mountWebNavigation();
  translateInterface();
  document.documentElement.dataset.theme = localStorage.getItem("linka.theme") || "dark";
  document.documentElement.classList.toggle("reduced-motion", localStorage.getItem("linka.reduceMotion") === "true");
  addRevealAnimations();
  document.querySelector("#settings-button")?.addEventListener("click", event => {
    // Keep the user's existing settings entry point while adding account, language and notification controls.
    event.stopImmediatePropagation();
    showSettings();
  }, true);
  document.addEventListener("linka:status", event => {
    const status = document.querySelector("#status");
    if (status) { status.textContent = String(event.detail || ""); status.style.opacity = "1"; }
  });
  document.addEventListener("linka:request-profile", () => openProfileEditor());
  window.addEventListener("linka:capture-saved", notificationForSavedCapture);
  window.addEventListener("linka:profile-saved", () => window.dispatchEvent(new CustomEvent("linka:authenticated")));
  window.addEventListener("linka:oauth-complete", () => {
    window.dispatchEvent(new CustomEvent("linka:authenticated"));
    const profile = readLinkaProfile();
    if (!profile?.displayName) {
      localStorage.removeItem(ONBOARDED_KEY);
      setTimeout(() => openProfileEditor({ firstRun: true }), 180);
    } else {
      localStorage.setItem(ONBOARDED_KEY, "true");
      setTimeout(() => showAccount(), 180);
    }
  });
  void initDesktopDeepLinks();
  window.addEventListener("linka:authenticated", () => {
    const pending = localStorage.getItem("linka.pending-pairing.v1");
    if (pending) {
      try {
        const pair = JSON.parse(pending), session = getCloudSession(), config = getCloudConfig();
        approveQrPairing({ id: pair.id, secret: pair.secret, url: config.url, key: config.key, accessToken: session?.accessToken, refreshToken: session?.refreshToken })
          .then(() => localStorage.removeItem("linka.pending-pairing.v1"))
          .catch(error => document.dispatchEvent(new CustomEvent("linka:status", { detail: error?.message || tr("errors") })));
      } catch {}
    }
  });
  checkForRelease();
  clearInterval(updateTimer);
  updateTimer = setInterval(() => checkForRelease({ notify: true }), 15 * 60 * 1000);
  handleIncomingPairing();
  const oauthCallbackPending = /(?:access_token|error)=/.test(location.hash || "");
  if (!oauthCallbackPending && localStorage.getItem("linka.termsAccepted") === "2026-10-23-v2") {
    if (!localStorage.getItem(ONBOARDED_KEY)) {
      const session = getCloudSession();
      if (session && readLinkaProfile()) localStorage.setItem(ONBOARDED_KEY, "true");
      else setTimeout(() => showAccount({ firstRun: true }), 240);
    }
  } else if (!oauthCallbackPending) {
    window.addEventListener("linka:agreement-accepted", () => {
      if (!localStorage.getItem(ONBOARDED_KEY)) setTimeout(() => showAccount({ firstRun: true }), 240);
    }, { once: true });
  }
}
