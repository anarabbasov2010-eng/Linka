# Linka

**Keep what matters.** A clean, local-first inbox for links, thoughts and text.

## Platforms

- **Web:** responsive inbox with search, link/note filters, pinning, editing, deletion, copy, link opening and JSON import/export.
- **Windows:** Tauri 2 desktop app using the same web inbox UI, with NSIS EXE and MSI installer targets.
- **Android:** Kotlin + Jetpack Compose, share-intent capture, search and filters, pin/edit/delete/copy/open, export via Android share sheet, theme settings and one-time user-agreement acknowledgement.

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

## Privacy and scope

Captures stay in local app or browser storage. Manual export/import is available. **Cross-device automatic sync, accounts and a shared cloud database are not implemented.** Android CI APKs are debug-signed; Windows CI installers are not code-signed. See [the in-app user agreement](docs/USER-AGREEMENT.md).