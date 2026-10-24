# Linka text document format

Linka uses the `.linka` extension for standalone text documents. The current format is UTF-8 JSON so a document keeps its title and timestamps when it moves between Windows and Web.

## Version 1

```json
{
  "format": "linka-document",
  "version": 1,
  "id": "a-stable-document-id",
  "title": "Field notes",
  "text": "First line\nSecond line",
  "createdAt": 1792860000000,
  "updatedAt": 1792860000000
}
```

- `format` is the discriminator `linka-document`.
- `version` is `1` for the current document schema.
- `id` stays stable across saves.
- `title` is the display title and is used to suggest the filename.
- `text` contains the complete UTF-8 text, including line breaks.
- `createdAt` and `updatedAt` are Unix timestamps in milliseconds.

The Web and Windows editors accept up to 5,000,000 characters per document. Opening an inbox backup as a standalone document is rejected to avoid confusing a bulk data backup with a text file. Ordinary UTF-8 plain-text files can be opened and saved into the `.linka` format.

## Storage and transfer

The web editor stores working drafts in IndexedDB with a small localStorage fallback. The Windows app uses the same WebView-backed local draft storage as the Web client. These working drafts are local to each device and are not included in cloud sync or the link inbox. Use **Save .linka** to create a portable file; use **Open .linka** to import it elsewhere.

Windows file association is registered by the Tauri installer. The Web client opens files through the browser file picker. File association behavior still depends on the operating system's package/installer registration and the source file provider.
