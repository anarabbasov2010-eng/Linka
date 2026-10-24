# Linka

**Keep what matters.** A quiet, local-first workspace for links, thoughts and text.

## Platforms

- **Web:** responsive personal library with fast search (Ctrl/⌘+K or /), a Today view, tags, reading status, Archive, recoverable Trash, pinning, editing, bulk actions, JSON import/export and optional cloud sync.
- **Windows:** native Tauri 2 desktop app using the same Web interface, with a per-user NSIS installer, .linka file association and the WebView2 bootstrapper included in the installer.

Linka is developed for **Windows and Web only**. The native Android app and Android build/release pipelines are no longer part of this project.

## Text documents

Linka includes a separate text editor with local autosave, recoverable drafts, recent documents, portable .linka files, and a typing/erasing effect that automatically disables its character mirror for long text to keep editing responsive. Documents stay separate from inbox captures and are not sent through Cloud Sync.

- Create or open documents with the document icon in the top bar.
- Windows associates .linka files with Linka so documents can be opened from File Explorer.
- Web and Windows support opening plain-text files and exporting portable documents.
- The UTF-8 JSON format, schema version and limits are documented in [Linka document format](docs/LINKA-DOCUMENT-FORMAT.md).

## Atmosphere and music

The workspace supports three themes — Forest Studio, Carbon Glass and Paper & Ink — plus six accent palettes, configurable glass transparency, interface density and atmosphere intensity. Forest remains the signature look, with a static fallback when the background video is unavailable. Choose a personal background image/video or local audio files in Atmosphere settings; personal media stays on the current device. Large text skips per-character DOM animation. Translucency is deliberately restrained where expensive blur would hurt performance.

## Downloads

- [Latest Windows release and installer](https://github.com/anarabbasov2010-eng/Linka/releases/latest)
- [Windows installer workflow](https://github.com/anarabbasov2010-eng/Linka/actions/workflows/windows-build.yml)
- [Web quality checks](https://github.com/anarabbasov2010-eng/Linka/actions/workflows/ci.yml)

CI artifacts are temporary; use the latest GitHub Release for the Windows installer.

## Development

### Web

From apps/web run npm install, npm run dev, npm test, or npm run build.

### Windows

Install Node.js 22, Rust stable and the Windows MSVC prerequisites. Run npm install in apps/web and apps/desktop, followed by npm run build from apps/desktop.

## Sync, updates and privacy

Linka keeps the main library locally and supports manual JSON backups. Deletions go to a local Trash that supports restore and explicit permanent deletion. Corrupt library/Trash data is preserved for recovery instead of being silently overwritten. Cloud Sync now checks the serialized request size before upload and refuses an oversized request without truncating the local library. Optional Cloud Sync works between Web and Windows when both clients use the same Supabase project and Linka account. The database schema and Row Level Security setup are documented in [Cloud Sync](docs/CLOUD-SYNC.md). Cloud Sync is not preconfigured in the repository; it needs a Supabase project URL and a public publishable/anon key. Never put a service_role or other secret key in client code.

Windows signed in-app updates are enabled only when the repository has both LINKA_UPDATER_PUBLIC_KEY and TAURI_SIGNING_PRIVATE_KEY configured. Otherwise, update from the Windows installer in GitHub Releases. See the [user agreement](docs/USER-AGREEMENT.md).