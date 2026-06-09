# Phase 7 — Folder ingest, output layout, format expansion

## Scope

- Recursive folder ingest (select folder or drop folder)
- Batch output layout: **flat** vs **mirror** subfolders
- Input formats: HEIC/HEIF, GIF, AVIF (in addition to PNG/JPG/WebP)
- Output format: GIF added
- PDF merge/split → **Phase 8** (separate branch)

## Done

### Folder ingest
- `ingest.ts`: `collectImagesRecursive`, `expandIngestPaths`
- IPC: `dialog:selectInputFolder`, `ingest:expandPaths`
- UI: **Select Folder** button; drag-drop paths expanded in main
- `inputRoot` tracked for mirror layout (folder root or common ancestor)

### Output layout
- `outputPathForInput` in `ingest.ts` with `flat` | `mirror`
- Batch IPC accepts `{ layout, inputRoot }`
- Mirror creates nested dirs under output folder
- Flat: all outputs in one dir (same basename collisions overwrite)

### Formats
- Registry expanded in `convert.ts` (data-driven loop)
- HEIC/HEIF → all raster outputs
- GIF in/out (animated GIF uses first frame when converting out)
- AVIF input → png/jpg/webp/gif

## Notes

- HEIC decode runs in a **forked child process** (`heic-child.js` + `heic-convert` WASM) so a decoder crash cannot take down the app
- HEIC **previews are a static placeholder** on drop — no decode at ingest (parallel preview was crashing main)
- HEIC file size on ingest uses `stat()` only — full file is not read until convert
- GIF animation is not preserved on conversion (sharp first frame)
- PDF is intentionally out of scope here

## Verify

```bash
npm run verify:conversions
npm run typecheck
```

Restart dev server after main/preload changes.
