# Linka

**Keep what matters.** A clean, local-first inbox for links, thoughts and text.

## Platforms

- **Web:** responsive inbox with dedicated library search (Ctrl/⌘+K or /), tags, collections, `tag:`/`in:` search operators, read-later, archive, trash with restore and explicit permanent deletion, metadata-aware search, link covers, pinning, editing, copy, link opening and JSON import/export.
- **Windows:** Tauri 2 desktop app using the same web inbox UI and NSIS EXE installer. Windows builds run independently of Android; version-tagged releases publish the installer.
- **Android:** Kotlin + Jetpack Compose, share-intent capture, search and filters, pin/edit/delete/copy/open, link previews, configurable cloud sync, update notifications and a guarded APK updater that checks package ID, version code and signing certificate before installation.

## Inbox organization

Captures can carry up to 24 tags and one collection label. Collections support a seven-color palette stored with the capture data, so the color survives import/export and sync. Use `tag:design` to find a tag, `in:research` to filter a collection, `is:later` to find items saved for later, `is:untagged` to find items without tags, and `has:tags`, `has:cover`, or `has:description` to filter by available metadata. Single-word searches of four or more characters tolerate a small typo when no exact match exists. The Today view shows captures made during the local calendar day. Linka warns before saving a duplicate URL or text note; tracking parameters and fragments are ignored for URL comparisons. The Archive view hides completed items from the main inbox without deleting them. The Timeline view groups active captures by their local creation date and keeps the normal item actions available. Delete moves an item to Trash; restore it from there, or choose permanent deletion explicitly. Archive, Trash, tags, collection labels, and read-later state are stored as part of each capture and travel with cloud sync.

Global search includes saved captures and local text documents, supports typo-tolerant single-word search, and can filter metadata with `is:untagged`, `has:tags`, `has:cover` and `has:description`. Search history is stored only in local browser/app storage, is not synced, is limited to 10 recent queries, and can be cleared from the search dialog. Frequently used queries can be saved as named searches. The inbox can be sorted by recent changes, newest or oldest captures, title, or domain; the selected sort order is saved locally and included in the full backup.

The export format selector supports JSON (a complete versioned backup), Markdown, plain text, and self-contained HTML. The full JSON backup includes inbox captures and their tags/statuses, local `.linka` text documents, cloud deletion markers, safe appearance/accessibility preferences, named saved searches, and recent searches. Cloud access tokens, sessions, and account credentials are deliberately excluded. Linka also keeps a local history of up to five snapshots in IndexedDB, attempts an automatic snapshot before a library write or document autosave at most once per day, and lets you download or merge-restore a snapshot from **Backup history**. Automatic history snapshots are capped at 12 MiB each; oversized data must be saved with the full JSON export. Import merges captures and documents with the current library, restores safe preferences, and does not delete unrelated local items. When the browser lacks IndexedDB, its legacy document fallback can retain only 12 documents; Linka reports a partial restore rather than claiming all documents were imported. Text and Markdown files can be imported as a single note without splitting paragraphs or code blocks. Browser-exported bookmark HTML can also be imported; Linka keeps each HTTP(S) URL and page title, respects browser-added timestamps and tags when present, skips unsafe URL schemes, and avoids reimporting duplicate links. Link cards support optional manually supplied page titles, descriptions, and cover images. These fields are available from the expandable Link preview section in the capture form, survive drafts/exports, and can be edited later. Cover URLs are validated as credential-free HTTPS before storage; Linka does not silently fetch arbitrary third-party page HTML in the background. Keyboard shortcuts: `Ctrl/⌘+K` opens global search, `Ctrl/⌘+Shift+P` opens the command palette, `Ctrl/⌘+Enter` saves the quick-capture draft, `Ctrl/⌘+Shift+E` exports the current selection (or visible results), and `Ctrl/⌘+Shift+L` toggles Read Later for selected items. Use `Ctrl/⌘+Shift+F` to toggle a library-wide Focus mode (press Esc to exit when not editing text). Outside a text-editing field, `Ctrl/⌘+Z` undoes the last saved capture change and `Ctrl/⌘+Y` (or `Ctrl/⌘+Shift+Z`) redoes it. History is bounded to 30 local capture states and is cleared when cloud sync changes the library, avoiding stale snapshot replay. You can also type `>` in global search to filter available commands. The Settings panel contains a localized shortcut reference. On Windows, `Ctrl+Alt+Space` is registered as a global quick-capture hotkey. Linka also adds a system-tray menu for opening the app, quick capture, and quitting; close-to-tray behavior can be toggled in Settings. Closing the main window hides Linka in the tray when that option is enabled. The native application menu exposes File, Edit, View, Navigate, and Help actions for quick capture, new documents, search, backup/export, settings and keyboard shortcuts.

## Text documents

Linka includes a separate local text editor with autosave, emergency-draft recovery, Markdown preview, clickable document outline, word/character/reading-time statistics and a distraction-reduced focus mode. Text animation falls back to plain rendering for large changes. Documents can be exported as portable `.linka` files. A standalone document does not become an inbox capture and is not uploaded by Cloud Sync.

- **Web / Windows:** create or open documents from the document icon in the top bar. The Windows NSIS installer registers `.linka` files so opening one from Explorer can launch the editor.
- **Android:** open the editor from Settings, or open a `.linka` file from a compatible file manager. Use **Save .linka** to export a portable file through Android's document picker.
- **Portable format:** UTF-8 JSON, schema version 1. The fields and limits are documented in [Linka document format](docs/LINKA-DOCUMENT-FORMAT.md).

Background media and music are configured independently on each device. Pick a personal photo/video or audio file in Atmosphere settings; the bundled forest scene remains the default visual backdrop, but Linka does not autoplay a preselected music track.

## Build downloads

- [Android APK workflow](https://github.com/anarabbasov2010-eng/Linka/actions/workflows/android-apk.yml)
- [Windows installer workflow](https://github.com/anarabbasov2010-eng/Linka/actions/workflows/windows-build.yml)
- [Web CI](https://github.com/anarabbasov2010-eng/Linka/actions/workflows/ci.yml)

Download artifacts from a successful workflow run. CI artifacts are temporary downloads; make a GitHub Release for durable public releases.

## Development

See [the tracked Linka implementation roadmap](docs/ROADMAP.md) for the persistent checklist and current status of planned improvements.

### Web
From `apps/web`: `npm install`, `npm run dev`, `npm test`, or `npm run build`.

### Android
Open `apps/android` in Android Studio with JDK 17, or run `gradle assembleDebug` in that directory.

### Windows
Install Node.js, Rust stable/MSVC prerequisites, then run `npm install` in `apps/web` and `apps/desktop`, followed by `npm run build` from `apps/desktop`.

## Sync, updates and privacy

Linka remains local-first and supports manual JSON export/import. Optional cross-device Cloud Sync is implemented for Android and the web/Windows client when each installation is configured with the same Supabase project and Linka account. The shared table uses Row Level Security; setup and SQL are documented in [Cloud Sync](docs/CLOUD-SYNC.md). Cloud Sync is not preconfigured in this repository; it needs a project URL and a public publishable/anon key. Never use a `service_role` or secret key in a client.

Android update checks are immediate on app launch and also scheduled by WorkManager. If Android blocks notifications, the app reports this in Settings; downloaded APKs are validated against the installed package and signing certificate before the installer opens. Releases are debug-signed for this hobby project, not Play Store production signing. Windows builds run independently of Android. Pushes to `main` produce a testable Actions artifact; version tags (`vX.Y.Z`) build and publish the Windows installer to a GitHub Release. The web package version is the source of truth and is synchronized into the desktop and Rust manifests before building. See [the in-app user agreement](docs/USER-AGREEMENT.md).