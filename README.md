# Linka

**Everything, within reach.** Linka is a minimal local-first inbox for links, notes and text.

## Available builds

- **Android:** native Kotlin + Jetpack Compose. Quick capture, Android share-intent capture, search, filters (everything / pinned / links / notes), pinning, editing, deleting, clipboard copy, opening links and JSON-text export through the Android share sheet.
- **Windows:** native Tauri 2 desktop shell with NSIS EXE and MSI installer targets. It hosts the same responsive inbox interface as the web version.
- **Web:** responsive browser inbox with search, filters, pinning, edit/delete, copy, link opening and JSON import/export.

## Build artifacts

Every push to main starts GitHub Actions builds:

- [Android APK workflow](https://github.com/anarabbasov2010-eng/Linka/actions/workflows/android-apk.yml)
- [Windows installer workflow](https://github.com/anarabbasov2010-eng/Linka/actions/workflows/windows-build.yml)

Open a successful run and download the artifact named **Linka-Android-debug-apk** or **Linka-Windows-installers**. Artifacts are temporary CI downloads; create a tagged release for durable public releases.

## Run locally

### Web

From apps/web, run npm install, then npm run dev. Use npm test for storage tests and npm run build for a production bundle.

### Android

Open apps/android in Android Studio or use Gradle with JDK 17. Run gradle assembleDebug from that directory.

### Windows

Prerequisites: Node.js 20+, Rust stable/MSVC build tools, and the Tauri Windows prerequisites. Install npm dependencies in apps/web and apps/desktop, then run npm run build inside apps/desktop.

## Privacy and limitations

- Web captures are stored in browser-local storage. Android captures are stored locally using app preferences.
- JSON export/import is provided for backups and manual transfer.
- **Cross-device automatic synchronization, accounts, and a shared cloud database are not implemented yet.** The Android and Windows clients do not currently merge into one account.
- Android APKs from CI are debug-signed. Use them for testing, not as a production Play Store release.
- Windows artifacts are unsigned CI installers unless a signing setup is added.

See the architecture docs and changelog for project details.