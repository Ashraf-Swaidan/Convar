# Phase 1 — Core MVP (Local File Conversion)

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

### Step 1 — Project Setup

* Initialize Vite + React + TypeScript project
* Add shadcn/ui
* Wire Electron (main process, preload, renderer)
* Confirm desktop window opens successfully
* Clean default template UI

Checkpoint:

* App launches locally without errors
* Electron window shows the Vite/React UI

---

### Step 2 — UI Skeleton

Build a single screen (shadcn components optional but fine):

* “Select File” button
* Text area showing selected file path
* “Convert” button (disabled until file is selected)

Keep layout simple — no extra screens or routing.

Checkpoint:

* UI responds correctly
* State updates on file selection

---

### Step 3 — File Selection (Electron IPC)

Implement file picker in the **main process**:

* Use `dialog.showOpenDialog`
* Expose a `selectFile()` (or similar) method via preload
* Renderer calls it and stores the returned file path in state

Checkpoint:

* User can pick a file from local system
* Path is correctly displayed in UI

---

### Step 4 — File Reading

Main process:

* Read selected file into memory as binary buffer (`fs.readFile`)
* Return buffer or path reference to renderer via IPC (as needed for the pipeline)

Checkpoint:

* File can be read successfully
* No UI freeze or crash

---

### Step 5 — First Conversion Logic (PNG → WebP)

Main process:

* Use `sharp` for image conversion

Process:

* Input: PNG buffer (or path read in main)
* Output: WebP buffer

Checkpoint:

* Hardcoded conversion works on a single file
* Output buffer is valid image

---

### Step 6 — Save Output File

Main process:

* Prompt user for save location (`dialog.showSaveDialog`) OR auto-save next to input file
* Write WebP buffer to disk (`fs.writeFile`)

Checkpoint:

* Converted file appears on disk
* Can be opened normally

---

### Step 7 — Wire UI → Conversion Flow

Connect full pipeline via IPC:

1. user selects file (renderer → main → path back)
2. click convert (renderer → main)
3. main reads file, converts, saves
4. main returns success/failure to renderer
5. show success state in UI

Checkpoint:

* End-to-end flow works without manual intervention

---

### Step 8 — Basic Error Handling

Handle only critical failures:

* no file selected
* invalid file type
* conversion failure
* file write failure

Rules:

* show simple UI message in renderer
* no logging system yet
* no retry logic yet

Checkpoint:

* app never silently fails

---

## Phase 1 Completion Criteria

Phase 1 is complete when:

* a user can convert a PNG to WebP locally
* no server is involved
* no crashes on normal usage
* full flow works end-to-end in a single session

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
