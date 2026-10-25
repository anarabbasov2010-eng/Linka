# Linka — implementation roadmap

This file is the persistent project checklist for the Linka improvements audit. It is organized into implementable work items so progress can be tracked across branches and chats instead of relying on conversation memory. It consolidates the audit notes currently available in the project context; it is not presented as a verbatim copy of the original prompt. Reconcile it against the original source if that source is restored.

## Status legend

- [x] Implemented in the working branch or its recorded commit history; still subject to regression testing.
- [~] Partially implemented, or implementation exists but needs end-to-end verification.
- [ ] Not yet implemented or not yet verified.

## P0 — data safety and sync

- [x] Remove silent 500-item truncation from cloud merge; default merge is unlimited.
- [x] Add regression coverage for 500, 1,000, 5,000 and 10,000 records.
- [x] Prevent cloud merge from resurrecting items represented by deletion tombstones.
- [x] Verified the current sync schema stores captures and deletion tombstones in one JSONB row per user; REST row pagination does not paginate individual captures.
- [x] Give actionable errors for HTTP 413 and recognized oversized-payload failures; integration test covers remote read followed by a rejected upsert.
- [~] Prevent legacy Android sync from truncating Web/Windows libraries over Android's 500-capture limit; reject oversized writes and preserve all deletion tombstones (Android PR CI pending).
- [ ] Design incremental/chunked sync as a schema migration if very large libraries must exceed the current one-row JSONB payload.
- [~] Use optimistic compare-and-set on `updated_at` and bounded retry/re-merge in updated Web/Windows and Android clients; older unconditional-upsert clients can still bypass this protection.
- [ ] Add post-sync integrity checks for record count, IDs and changed content.
- [x] Add a regression test proving malformed remote capture payloads are rejected before any cloud write.
- [ ] Add a server-side atomic merge/RPC or migration path to protect against legacy clients that still issue unconditional upserts.
- [~] Re-read and re-merge when updated clients detect a concurrent cloud write; a dedicated user-facing conflict review and cross-version protection remain open.
- [ ] Surface sync state: last success, pending changes, retrying, and actionable errors.
- [x] Retry transient cloud sync network/HTTP failures with bounded exponential backoff and respect a capped Retry-After header.
- [ ] Keep deletes as tombstones until every relevant device has observed them or a retention policy expires.
- [ ] Add sync diagnostics that redact session tokens and private capture content.
- [~] Keep local-only mode usable when cloud credentials are not configured.
- [~] Audit all storage reads/writes for silent parse, quota and permission failures.
- [x] On malformed local JSON, preserve the raw source instead of replacing it with an empty library; block writes until the user exports the source or explicitly starts a new library.
- [x] Offer one-click restore from the newest usable local snapshot directly in the malformed-store recovery notice; the original damaged source remains preserved separately.
- [~] Maintain automatic local backup snapshots and explicit backup-history recovery.
- [ ] Add crash-recovery tests for interrupted save, import, migration and restore.
- [ ] Verify backup compatibility across older and newer Linka versions.

## P0 — large documents and UI performance

- [x] Cap character-by-character animation for small text fragments and fall back to plain text for large changes.
- [x] Use plain rendering for documents above the existing size threshold.
- [ ] Profile large captures and documents on low-memory Windows devices.
- [ ] Avoid repeated full-library rendering when only one capture changes.
- [ ] Debounce search and expensive filtering.
- [ ] Virtualize long library and search-result lists where measurements justify it.
- [ ] Lazy-load cover images and add bounded caching.
- [~] Respect reduced-motion preferences across animation systems; fixed atmosphere text-erasing animation for OS-level reduced motion, but remaining UI animation paths still need an audit.
- [ ] Add a clear non-animated mode for very large documents and bulk edits.
- [ ] Add performance tests or benchmarks for 1k, 5k and 10k captures.

## P1 — Windows, web and release engineering

- [x] Keep Windows builds independent of Android release success.
- [~] Windows pull-request validation is configured in .github/workflows/desktop-pr.yml; its live result must pass before this item is considered complete.
- [~] Use apps/web/package.json as the canonical version source for desktop and Rust manifests.
- [ ] Add a consistency check for package.json, tauri.conf.json, Cargo.toml and lockfiles.
- [~] Build a Windows NSIS installer in GitHub Actions and expose it as a downloadable artifact.
- [~] Publish Windows installers on matching version tags.
- [~] Enable the signed in-app updater only when signing material is configured.
- [ ] Add updater signature, install, rollback and failed-update tests.
- [ ] Document stable and preview release channels.
- [ ] Test a clean Windows install and upgrade in CI.
- [ ] Verify installer file association for .linka files on a clean machine.
- [ ] Keep Windows packaging and release workflows independent from Android workflows.
- [ ] Review permissions and secrets for least privilege in CI and release workflows.
- [ ] Add build logs and WebView2 diagnostics that users can export safely.
- [ ] Ensure release documentation does not claim MSI support when only NSIS is produced.
- [ ] Validate links, metadata URLs, signing state and update feed before publishing.
- [ ] Confirm no private key or access token can enter build artifacts or logs.

## Navigation and workspace

- [ ] Add a reliable sidebar with Inbox, Today, Read Later, Collections, Archive and Trash.
- [~] Keep Today, Read Later, Archive and Trash states available and searchable.
- [ ] Add undo for destructive and bulk actions.
- [ ] Add item history and restore previous versions where practical.
- [ ] Add tabs for multiple open documents or views.
- [ ] Add split view for comparing or referencing two items.
- [ ] Add multi-window support where it improves Windows workflows.
- [ ] Add breadcrumbs for nested collections and document navigation.
- [ ] Add a status bar for save, sync, selected count and storage state.
- [ ] Preserve scroll position and selection when navigating back to a list.
- [ ] Add a customizable start page.

## Capture and import

- [ ] Support drag-and-drop capture from Explorer and browsers.
- [ ] Support paste-from-clipboard capture with clear source feedback.
- [ ] Add bulk import with a preview, validation and duplicate report.
- [ ] Add a configurable global capture shortcut and quick-capture window.
- [ ] Keep clipboard monitoring opt-in and explain what is collected.
- [ ] Plan browser extensions for one-click saving.
- [ ] Capture source URL, page title, excerpt and timestamp when available.
- [ ] Add reader mode and optional offline snapshots.
- [ ] Support PDF capture and searchable PDF text where licensing and parsing allow.
- [ ] Support screenshot and image attachments with size limits.
- [ ] Import bookmarks from common browsers without unsafe URL schemes.
- [~] Support HTML bookmark import with duplicate avoidance.
- [ ] Add importers for Pocket, Notion and Obsidian exports.
- [ ] Add file-type, size and error summaries to every import flow.
- [ ] Preserve original text when converting or normalizing imported content.

## Library organization

- [~] Support tags and one collection label on captures.
- [ ] Add nested tags and subtags.
- [ ] Support collection colors and custom icons.
- [ ] Add smart collections based on filters and saved queries.
- [ ] Add backlinks and a graph of related notes.
- [ ] Add a timeline view of captures, documents and project milestones.
- [ ] Add domain grouping and domain-specific dashboards.
- [ ] Add statuses, reminders, due dates and priority.
- [~] Detect likely duplicate URLs and text notes before saving.
- [ ] Add a duplicate review flow for bulk imports and near-matches.
- [~] Support sorting by date, title and domain, and preserve sort preferences.
- [ ] Add bulk tagging, collection assignment, archive, restore and delete.
- [ ] Add complete revision history and diff/restore for edited captures.
- [ ] Make permanent deletion explicit and distinguish it from Trash.

## Search and retrieval

- [~] Provide global search across captures and local text documents.
- [~] Support filters and operators such as type, tag, collection, read-later, pinned, domain and date.
- [~] Highlight matching text in search results.
- [ ] Add fuzzy matching and language-aware morphology.
- [ ] Search extracted PDF text and offline snapshots.
- [~] Keep named saved searches and a bounded local search history.
- [ ] Add advanced filter builder and combined query groups.
- [ ] Add a command palette for navigation and actions.
- [ ] Add search within the open document.
- [ ] Add an index with measured performance and safe rebuild/recovery.

## Editor and documents

- [~] Provide separate local text documents and portable .linka files.
- [~] Autosave documents locally.
- [ ] Show unsaved/dirty state and the last successful save time.
- [ ] Add explicit draft recovery after a crash or forced close.
- [ ] Add Markdown preview, formatting tools and document outline.
- [ ] Add reusable templates.
- [ ] Add document version history, diff and restore.
- [ ] Add word/character statistics and focus mode.
- [ ] Add split editor/preview and find/replace.
- [ ] Add export to Markdown, plain text, HTML and portable Linka format.
- [~] Keep the .linka file format versioned and document its schema.
- [ ] Define graceful behavior and messaging for very large files above the current limit.
- [ ] Ensure edits, imports and autosaves never overwrite a corrupt document silently.

## Visual system and accessibility

- [~] Provide theme, accent and density/effects settings.
- [ ] Add complete light, dark and system themes with contrast checks.
- [ ] Respect the Windows system accent color where supported.
- [ ] Add optional transparency/blur effects with a performance-safe fallback.
- [ ] Standardize spacing, typography, controls and component states.
- [ ] Audit keyboard navigation, focus visibility, screen-reader labels and contrast.
- [x] Localize a first set of core selection, empty-state and item-type strings in English, Russian, Azerbaijani and Turkish.
- [~] Continue unifying localization and remove hard-coded user-facing strings.
- [ ] Add reduced-motion support to every animation and background effect.
- [ ] Make notification behavior and sound explicit and configurable.
- [ ] Add contextual collection backgrounds and richer link cards.
- [ ] Add quote cards, idea-of-the-day and a thought-trail view.
- [ ] Add gallery and project timeline layouts.
- [ ] Add optional time-capsule and knowledge-map experiences.
- [ ] Ensure decorative atmosphere and media cannot block core workflows.
- [~] Keep background media user-selected and avoid autoplaying a preselected music track.

## Advanced product surfaces

- [ ] Design and build Linka Canvas as a visual map of notes and links.
- [ ] Design and build Linka Timeline for time-based exploration.
- [ ] Design and build Linka Research for questions over the user's library with citations.
- [ ] Design and build Linka Focus for distraction-reduced work.
- [ ] Design and build Linka Vault for protected local content.
- [ ] Keep these surfaces modular so core capture, editing and search remain reliable without them.

## AI and automation

- [ ] Add optional auto-classification and suggested tags/collections.
- [ ] Add summaries, key points and rewrite assistance.
- [ ] Add related-item recommendations with explanations.
- [ ] Add library Q&A with source citations to the underlying saved material.
- [ ] Add optional title generation and semantic duplicate suggestions.
- [ ] Support translation while retaining the original text.
- [ ] Add research synthesis across selected items with traceable citations.
- [ ] Add user-authored rules and automations.
- [ ] Evaluate optional local AI before sending data to external services.
- [ ] Make external data processing opt-in, disclose exactly what is sent, and preserve local-first defaults.

## Storage, privacy and security

- [~] Keep cloud credentials, sessions and account secrets out of portable backups.
- [ ] Evaluate SQLite for Windows storage and a full-text index for larger libraries.
- [ ] Use atomic persistence for critical writes and migrations.
- [ ] Support multiple backup generations and encrypted backup files.
- [ ] Add storage integrity checks and user-visible repair paths.
- [ ] Add attachment storage quotas and a storage-management screen.
- [ ] Add encrypted collections or protected local records.
- [ ] Use Windows Credential Manager or an equivalent secure secret store where appropriate.
- [ ] Add connected-device visibility and the ability to revoke sessions.
- [ ] Add selective cloud sync by collection or device.
- [ ] Document data lifecycle, retention and deletion semantics.
- [ ] Validate all external URLs and imported payloads at trust boundaries.
- [ ] Ensure diagnostics never expose capture contents, OAuth tokens or signing secrets.

## Windows-native experience

- [~] Provide system-tray actions and configurable close-to-tray behavior.
- [~] Provide native menus for common actions.
- [~] Register the global quick-capture hotkey.
- [~] Register .linka file association.
- [ ] Support Explorer drag-and-drop, recent files and native file dialogs consistently.
- [ ] Make startup-on-login opt-in.
- [ ] Use native Windows notifications for relevant status changes.
- [ ] Restore window placement and size safely across monitor changes.
- [ ] Prevent data loss on close, update, crash and forced shutdown.
- [ ] Add a diagnostics panel for WebView2, logs and environment details.

## Quality, reliability and release readiness

- [~] Run web unit tests and build checks in GitHub Actions.
- [ ] Run Windows-specific tests and installer validation on relevant pull requests.
- [ ] Add Tauri command and platform integration tests.
- [ ] Test sync conflict, tombstone, retry, offline and partial-failure cases.
- [ ] Test large libraries, large documents, quota failures and invalid JSON.
- [ ] Test backup export/import round trips and backward compatibility.
- [ ] Add dependency and supply-chain checks.
- [ ] Add a release checklist for versioning, signing, updater metadata and clean install.
- [ ] Verify every destructive operation has confirmation or undo when appropriate.
- [ ] Verify every empty/error state explains the next useful action.
- [ ] Test Windows and web localization and accessibility before release.

## First-run and user-facing copy

- [~] Explain local-first storage and optional cloud sync.
- [ ] Explain backup and recovery options during first-run onboarding.
- [ ] Add a searchable shortcut reference and shortcut conflict handling.
- [ ] Clearly indicate local save, cloud sync and backup status.
- [ ] Explain when a document is too large for animated rendering or import.
- [ ] Explain updater availability, signing limitations and recovery from failed updates.
- [ ] Clarify delete-to-Trash versus permanent deletion.
- [ ] Make privacy, optional AI processing and clipboard monitoring understandable.
- [ ] Add exportable diagnostics with a privacy review before sharing.

## Execution rules

1. Work in feature branches and keep changes reviewable; do not merge to main without explicit approval.
2. For each stage: inspect existing code, implement one bounded change, run the relevant checks, inspect the resulting diff, and report the commit and test result.
3. Treat any item marked [~] as incomplete until the missing integration or verification is performed.
4. Update this roadmap whenever a stage materially changes status.
5. Prioritize data integrity and recoverability, then reliable Windows/web build and release flows, then navigation/search/editor, then advanced surfaces and optional AI.
