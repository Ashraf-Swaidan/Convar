# Phase 1 — Core MVP (Local File Conversion)

**Status: ✅ Complete**

---

## Goal

Build a minimal desktop app that can:

* let user pick a local file
* convert PNG → WebP
* save result locally
* show success or failure

No extra systems. No architecture overhead.

---

## Tech Scope (Locked for Phase 1)

* Electron (desktop shell — main process + renderer)
* Vite + React (UI)
* TypeScript
* shadcn/ui (components)
* One conversion only (PNG → WebP)

Do NOT introduce:

* databases
* queues
* backend servers
* plugins
* multi-format systems

---

## Architecture (Phase 1)

```
Renderer (React + Vite)          Main process (Node.js)
─────────────────────────        ───────────────────────
UI state, buttons, feedback  ←→  file dialogs, fs, sharp
        via preload + IPC
```

* **Renderer** — React UI only; no direct Node/fs access
* **Preload** — exposes a small, safe API to the renderer
* **Main** — file pickers, read/write disk, image conversion

---

## Sequence (Step-by-Step Build Order)

### Step 1 — Project Setup ✅

* Initialize Vite + React + TypeScript project (`npm create @quick-start/electron@latest`)
* Add shadcn/ui (manual setup — electron-vite uses non-standard `src/renderer/src/` layout)
* Wire Electron (main process, preload, renderer)
* Confirm desktop window opens successfully
* Clean default template UI

Checkpoint:

* App launches locally without errors
* Electron window shows the Vite/React UI

---

### Step 2 — UI Skeleton ✅

Build a single screen (shadcn components):

* “Select File” button
* Text area showing selected file path
* “Convert” button (disabled until file is selected)

Checkpoint:

* UI responds correctly
* State updates on file selection

---

### Step 3 — File Selection (Electron IPC) ✅

* `dialog:selectFile` handler in main
* `window.api.selectFile()` exposed via preload
* Renderer stores returned path in state

Checkpoint:

* User can pick a file from local system
* Path is correctly displayed in UI

---

### Step 4 — File Reading ✅

* `readFileBuffer()` in `src/main/file.ts`
* `file:read` IPC handler — returns `{ ok, byteLength }` (not the full buffer)
* UI shows file size after selection

Checkpoint:

* File can be read successfully
* No UI freeze or crash

---

### Step 5 — First Conversion Logic (PNG → WebP) ✅

* `convertPngToWebp()` in `src/main/convert.ts` using `sharp`
* Input: PNG buffer in main
* Output: WebP buffer in main

Checkpoint:

* Hardcoded conversion works on a single file
* Output buffer is valid image

---

### Step 6 — Save Output File ✅

* `writeFileBuffer()` in `src/main/file.ts`
* `dialog.showSaveDialog` with default `.webp` name next to input
* WebP buffer written to disk

Checkpoint:

* Converted file appears on disk
* Can be opened normally

---

### Step 7 — Wire UI → Conversion Flow ✅

* `convert:saveWebp` IPC handler — read → convert → save in one call
* `window.api.convertAndSaveWebp()` in preload
* Convert button triggers full pipeline; UI shows saved path + size

Checkpoint:

* End-to-end flow works without manual intervention

---

### Step 8 — Basic Error Handling ✅

* Handlers return `{ ok: true, ... }` or `{ ok: false, error }` instead of throwing
* Cancelled save dialog returns `{ canceled: true }` (not an error)
* UI shows red error message; clears on retry

Errors handled:

* no file selected
* invalid file type (`.png` extension check)
* conversion failure
* file write failure

Checkpoint:

* app never silently fails

---

## Phase 1 Completion Criteria

All met:

* ✅ a user can convert a PNG to WebP locally
* ✅ no server is involved
* ✅ no crashes on normal usage
* ✅ full flow works end-to-end in a single session

---

## What We Built (Key Files)

| File | Role |
|------|------|
| `src/main/index.ts` | Window lifecycle + IPC handlers |
| `src/main/file.ts` | Read/write disk |
| `src/main/convert.ts` | PNG → WebP via sharp |
| `src/preload/index.ts` | Bridge — `window.api` |
| `src/preload/index.d.ts` | TypeScript types for `window.api` |
| `src/renderer/src/App.tsx` | UI + state + error/success feedback |

---

## Observations (for later phases)

* IPC pattern is stable: invoke → handle → `{ ok, error }` result
* Conversion logic naturally belongs in main, separate from handlers
* `file.ts` / `convert.ts` will want a shared structure when adding formats (Phase 2)
* File size display could become progress UI in Phase 3 (batch)

---

## Next: Phase 2

See `Phase-2-seq.md` — extend conversions (PNG/JPG/WebP), introduce a simple converter map when duplication hurts.

---

## Notes

This phase is intentionally minimal.

If something feels like it needs a “system” or “architecture”, it is NOT part of Phase 1.

We are optimizing for:

* clarity
* execution speed
* minimal cognitive load
* working end-to-end flow

Not scalability yet.
