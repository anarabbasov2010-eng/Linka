# Linka

**Keep what matters.** A clean, local-first inbox for links, thoughts and text.

## Platforms

- **Web:** responsive inbox with dedicated library search (Ctrl/⌘+K or /), metadata-aware search, fixed-ratio link covers, expandable capture cards, link/note filters, pinning, editing, deletion, copy, link opening and JSON import/export.
- **Windows:** Tauri 2 desktop app using the same web inbox UI, with NSIS EXE and MSI installer targets.
- **Android:** Kotlin + Jetpack Compose, share-intent capture, search and filters, pin/edit/delete/copy/open, link previews, configurable cloud sync, update notifications and a guarded APK updater that checks package ID, version code and signing certificate before installation.

## Text documents

Linka includes a separate text editor for personal documents with local autosave, a bounded text-fragment animation that falls back to plain text for large documents, recent documents, and portable `.linka` files. A standalone document does not become an inbox capture and is not uploaded by Cloud Sync.

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

### Web
From `apps/web`: `npm install`, `npm run dev`, `npm test`, or `npm run build`.

### Android
Open `apps/android` in Android Studio with JDK 17, or run `gradle assembleDebug` in that directory.

### Windows
Install Node.js, Rust stable/MSVC prerequisites, then run `npm install` in `apps/web` and `apps/desktop`, followed by `npm run build` from `apps/desktop`.

## Sync, updates and privacy

Linka remains local-first and supports manual JSON export/import. Optional cross-device Cloud Sync is implemented for Android and the web/Windows client when each installation is configured with the same Supabase project and Linka account. The shared table uses Row Level Security; setup and SQL are documented in [Cloud Sync](docs/CLOUD-SYNC.md). Cloud Sync is not preconfigured in this repository; it needs a project URL and a public publishable/anon key. Never use a `service_role` or secret key in a client.

Android update checks are immediate on app launch and also scheduled by WorkManager. If Android blocks notifications, the app reports this in Settings; downloaded APKs are validated against the installed package and signing certificate before the installer opens. Releases are debug-signed for this hobby project, not Play Store production signing. Windows builds run independently of Android. Pushes to `main` produce a testable Actions artifact; version tags (`vX.Y.Z`) build and publish the Windows installer to a GitHub Release. The web package version is the source of truth and is synchronized into the desktop and Rust manifests before building. See [the in-app user agreement](docs/USER-AGREEMENT.md).