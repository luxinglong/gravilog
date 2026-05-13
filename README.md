# Gravilog

A minimalist, single-file personal journal with content-gravity editing — everything gravitates around your words.

Zero build, zero backend. Open `index.html` in a browser and start writing. Data persists in localStorage with optional File System Access API for cloud-sync integration.

## Philosophy

**Content gravity** — the editor pulls everything toward your content. No chrome, no clutter, no setup. Just open and write. Rich formatting emerges naturally from Markdown-like shortcuts, not from toolbar hunting. The interface disappears so your words stay at the center.

## Quick Start

Open `index.html` in a browser. That's it.

> First load requires internet (KaTeX + highlight.js CDN). After that, the browser caches them.

## Features

| Feature | Description |
|---------|-------------|
| Rich text editing | Bold, italic, underline, strikethrough, lists, blockquotes |
| Markdown shortcuts | Type Markdown syntax, it converts automatically |
| LaTeX math | Inline `$...$` and display `$$...$$`, auto-rendered via KaTeX |
| Code blocks | Syntax-highlighted, specify language, real-time highlighting |
| Images | Insert/paste, resize, align (float/inline/center), full-screen preview |
| Tables | Insert, add/remove rows & columns |
| Todo lists | Checkable items, auto-continue on Enter |
| Calendar | Day/week/month/year views, marks dates with entries |
| Persistence | Auto-save to localStorage + file link / export / import |

## Markdown Shortcuts

Type syntax then press **Space** to convert:

| Input | Result |
|-------|--------|
| `#` + Space | Heading 1 |
| `##` + Space | Heading 2 |
| `-` or `*` + Space | Unordered list |
| `1.` + Space | Ordered list |
| `- [ ]` + Space | Todo (unchecked) |
| `- [x]` + Space | Todo (checked) |
| `>` + Space | Blockquote |

Type closing syntax to auto-render:

| Input | Result |
|-------|--------|
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `` `code` `` | `code` |
| `$E=mc^2$` | Inline math |
| `$$\int_0^1 x dx$$` | Display math |

### Code blocks

Type `` ``` `` or `` ```python `` then press **Enter** to create a code block. Hover to see the language label in the top-right corner — click it to cycle through languages.

### List operations

- **Tab** — indent
- **Shift+Tab** — outdent
- **Enter** on empty list item — exit list

## LaTeX

- **Auto-render**: type `$...$` or `$$...$$` — renders on close
- **Toolbar**: click `$` or `$$` button for a popup with live preview
- **Edit**: click any rendered formula to re-edit

## Images

- **Insert**: toolbar camera button, or Ctrl+V paste
- **Align**: click image for floating toolbar — left float / center / right float / inline
- **Resize**: 25% / 50% / 75% / 100%
- **Preview**: double-click for full-screen

## Tables

- Click toolbar table button to insert
- Click any cell for floating toolbar: insert row/column, delete row/column/table

## Calendar

Right sidebar with four views:

- **Month** — standard grid, dots on dates with entries
- **Week** — 7-day timeline with current-time marker
- **Day** — 24-hour timeline
- **Year** — 12 mini-month grids with entry dots

## Data Storage

### Auto-save

Content saves to localStorage on every edit (600ms debounce).

### Link file (recommended)

Click "Link File" in the sidebar to connect a local JSON file (e.g. in a cloud-sync folder):

- Edits write to the file in real time
- Opening the page reads the latest content
- Works with OneDrive, Nutstore, etc.
- Requires Chrome/Edge (File System Access API)

### Export / Import

- **Export**: save as `diary_YYYY-MM-DD.json`
- **Import**: restore from a JSON file

### Data format

```json
{
  "doc": "<html>editor content</html>",
  "dates": ["2026-05-13", "2026-05-12"],
  "savedAt": "2026-05-13T10:30:00.000Z"
}
```

## Toolbar

Appears at top-center when editor is focused:

| Button | Function |
|--------|----------|
| **B** | Bold |
| *I* | Italic |
| U | Underline |
| ~~S~~ | Strikethrough |
| • | Unordered list |
| 1. | Ordered list |
| " | Blockquote |
| █ | Insert table |
| 📷 | Insert image |
| </> | Insert code block |
| ☐ | Insert todo |
| $ | Inline LaTeX |
| $$ | Display LaTeX |

Status indicator on the right: `...` = saving, `OK` = saved.

## Browser Support

- **Recommended**: Chrome 86+, Edge 86+ (full file-link support)
- **Basic**: Firefox, Safari (no file link, use export/import instead)
- Requires internet for CDN resources (KaTeX, highlight.js)

## License

MIT
