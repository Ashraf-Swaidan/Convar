# Phase 3 — Batch Processing

**Status: In progress (Steps 1–6 implemented)** — restart dev server; run manual test matrix in Step 7

**Prerequisite:** Phase 2 complete (`Phase-2-seq.md`)

---

## Goal

Convert **multiple files** in one operation — same conversion type for all — without blocking the UI or opening a save dialog per file.

By the end of Phase 3, a user can:

* pick input + output formats (unchanged from Phase 2)
* select **many** matching input files at once
* convert them sequentially to an output folder
* see progress while the batch runs
* get a per-file success/failure summary

Single-file flow from Phase 2 stays intact (one file → save dialog).

---

## Problem (Why Phase 3 Exists)

Phase 2 handles one file at a time:

* open dialog allows only one file
* `convert:save` opens a save dialog per conversion
* UI state assumes a single selected path

That works for demos, not for real folders of images. Batch is the first place **loop + progress** appear — still no workers, queues, or history.

---

## Tech Scope (Locked for Phase 3)

Still using:

* Electron (main + preload + renderer)
* Vite + React + TypeScript + shadcn/ui
* `sharp` + existing converter map in `convert.ts`
* Same IPC pattern for errors: `{ ok, error }`

**Add in this phase:**

* multi-select open dialog
* output **folder** picker (batch only)
* `convert:saveBatch` — sequential loop in main
* progress events (`batch:progress`) to renderer
* file list UI + progress indicator

Do NOT introduce yet:

* conversion history / SQLite (Phase 5)
* workers or background jobs (Phase 6)
* parallel/concurrent conversion (wait for real bottleneck)
* mixed conversion types in one batch
* PDF operations

---

## Architecture (Phase 3 Evolution)

Phase 2:

```
UI → selectFile → convert:save(path) → save dialog → write
```

Phase 3 target:

```
UI → selectFiles → [1 file]  convert:save → save dialog
                 → [N files] selectOutputFolder → convert:saveBatch → auto-named writes
                                                      ↓
                                              batch:progress events
```

What changes:

| Layer | Phase 2 | Phase 3 |
|-------|---------|---------|
| Dialogs | single open + save | multi open + folder (batch) |
| Main | one `convert:save` | + `batch.ts`, `convert:saveBatch` |
| Preload | sync invoke APIs | + progress listener |
| UI | one preview card | file list + progress bar |

What stays the same:

* Buffers stay in main
* Converter map unchanged
* Single-file save-dialog flow unchanged

---

## Starting Point (Phase 2 Code)

| File | Current state |
|------|---------------|
| `src/main/index.ts` | `dialog:selectFile`, `convert:save` |
| `src/main/convert.ts` | converter map (unchanged) |
| `src/preload/index.ts` | `selectFile`, `convertAndSave` |
| `src/renderer/src/App.tsx` | single file preview + convert |

---

## Sequence (Step-by-Step Build Order)

---

### Step 1 — Multi-Select Dialog ✅

* Add `dialog:selectFiles` with `openFile` + `multiSelections`
* Same input-type filters as single select
* Preload: `selectFiles(conversionId) → string[] | null`
* UI: **Select Files** button; store path list

Checkpoint:

* User can pick 1 or many files matching the input format
* Empty/canceled selection returns gracefully

---

### Step 2 — File List UI ✅

* Replace single-file-only preview area with a scrollable file list (name + size)
* Preview thumbnail for the first file only (keep previews cheap)
* Clear list when input format changes (same as Phase 2)
* Single-file convert still works via existing `convert:save`

Checkpoint:

* Multiple selected files visible in UI
* One file still converts with save dialog

---

### Step 3 — Output Folder Picker ✅

* Add `dialog:selectOutputFolder` (`openDirectory` + `createDirectory`)
* Preload: `selectOutputFolder() → string | null`
* Used only when batching (2+ files)

Checkpoint:

* User can pick/create a destination folder

---

### Step 4 — Batch Convert Loop ✅

* Add `src/main/batch.ts` — `convertFileToOutputDir()` per file
* Add `convert:saveBatch(inputPaths, outputDir, conversionId)`
* Auto-name outputs: `{originalName}.{outputExt}` in chosen folder
* Return `{ ok: true, results: BatchFileResult[] }` with per-file ok/error

Checkpoint:

* 3 PNGs → WebP in one folder without N save dialogs
* One bad file in the batch does not stop the rest

---

### Step 5 — Progress Events + UI ✅

* Main sends `batch:progress` `{ current, total, fileName }` during loop
* Preload: `onBatchProgress(callback)` with unsubscribe
* UI: progress bar + “Converting 2 of 5…”
* Disable convert button while batch runs

Checkpoint:

* UI updates during multi-file conversion
* App stays responsive (async loop, not sync blocking)

---

### Step 6 — Batch Results Summary ✅

* Show succeeded / failed counts after batch
* List failed file names + errors
* No error banner for user-canceled folder picker

Checkpoint:

* User can see which files failed and why

---

### Step 7 — Phase 3 Completion Pass

Manual test matrix:

| Case | Expected |
|------|----------|
| 1 file | save dialog, same as Phase 2 |
| 3+ files | folder picker, all saved with correct ext |
| cancel folder | no error |
| 1 bad file in batch | others succeed, failure listed |
| change input format | file list clears |

Automated: extend or add batch unit test for `convertFileToOutputDir` if useful.

Checkpoint:

* Phase 2 single-file behavior preserved
* Batch flow works end-to-end

---

## Phase 3 Completion Criteria

Phase 3 is complete when:

* user can select multiple files of the correct input type
* batch saves to one folder with automatic names
* progress visible during batch
* per-file failures reported without aborting the whole batch
* single-file flow unchanged

---

## Next: Phase 4

See `Overview-Sequence.md` — structured error handling, retry-safe operations, consistent failure messages across the app.

Do not start Phase 4 until Phase 3 completion criteria are met.

---

## Notes

Same rules as prior phases:

> If something feels like it needs a “system”, ask whether current pain justifies it.

Batch loop in main is enough for now. Workers wait for Phase 6 pressure.
