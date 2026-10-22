# Linka

Linka is a local-first personal inbox for saving useful text, links, notes, and shared content across Web, Windows, and Android.

## Current MVP status

- Web: React + Vite, browser-local storage, search/filter, pinning, editing, sharing/copying, import/export.
- Windows: Tauri 2 desktop wrapper; signed auto-updates require release signing keys and a verified release pipeline.
- Android: Kotlin + Jetpack Compose capture app with Android share-intent support and local storage.
- Sync: cross-device cloud synchronization is **not implemented yet**. Data currently stays local to each platform.

## Development

See the app-specific directories and `docs/` for architecture, release, and setup notes. The project is an early MVP; build and device testing are required before production use.
