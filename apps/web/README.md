# Linka Web

A responsive local-first inbox for links and notes. Supports quick capture, search, filters, pinning, edit/delete, clipboard copy, and JSON import/export. Data uses the browser's localStorage; clearing browser data can remove the inbox, so export is available.

## Run

```sh
npm install
npm run dev
npm run build
npm test
```

Optional cross-device Cloud Sync is available after configuring the same Supabase project URL, public publishable/anon key and Linka account on each client. To set up the RLS-protected table, use Settings → Cloud Sync → Copy database setup SQL. See [the shared Cloud Sync guide](../../docs/CLOUD-SYNC.md). Local storage and manual JSON backup/import continue to work without a cloud project.