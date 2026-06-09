# Phase UX — Polish & Experience

**Status: Complete (build smoke test deferred)**

**Prerequisite:** Phase 4 complete (`Phase-4-seq.md`)

---

## Goal

Make Convar feel like a real desktop app — not just a working pipeline. Functionality is done through Phase 3; reliability through Phase 4. This phase is **mostly UI/UX**.

---

## Why a separate phase

Phases 1–3 shipped features in surprisingly few lines because the stack (Electron + sharp + IPC) does the heavy lifting. The gap now is **feel**: layout, feedback, discoverability, and using the structured error `code` from Phase 4 for better messages.

---

## Candidate work (pick incrementally)

### Core polish
* App shell — title bar area, consistent spacing, max-width / responsive layout
* Empty states — illustrated or clearer copy when no files selected
* Success states — green summary card vs plain text path
* Error display component — map `AppErrorCode` to title + hint + icon

### Batch UX
* Remember last output folder (session or localStorage)
* **Open output folder** button after batch completes
* Show per-file status icons in the file list after batch (✓ / ✗)
* Disable format changes while converting

### Input UX
* Drag-and-drop files onto the window
* Clear / remove individual files from the list
* Output format hint under selectors (“WebP — smaller files, good for web”)

### Single-file UX
* Optional “same folder as input” quick save (skip dialog toggle)

### Ship readiness
* App icon + window title
* `npm run build:win` smoke test
* About / version line

---

## Sequence

### Step 0 — Wire Phase 4 codes (bridge) ✅

* `lib/errorHints.ts` — map `AppErrorCode` → title + hint
* `AppErrorDisplay` — structured single error card
* `BatchFailureSummary` — group batch failures by `code`
* App stores `{ code, message }` instead of plain strings

### Step 1 — Toast + inline asset status ✅

* Sonner toasts on convert (no success card)
* Asset list header: ✓ 2 · ✗ 1 counts
* Table status column + thumbnail badges; hover failed for error detail
* Collage badges on first 3 previews
* Dev-only “preview mixed results UI” button for testing failure states

### Step 2 — Output folder memory + open folder ✅

* Remember last output folder (`sessionStorage`)
* Folder dialog opens at last location (`defaultPath`)
* **Open output folder** button after batch with ≥1 success

### Step 3 — Drag-and-drop ✅

* Drop files onto the window to add to selection
* Drag-over highlight + hint copy
* Append when files already loaded; first drop sets input format
* Uniform format enforced (PNG or JPG, must match existing selection)

### Step 4 — Visual pass ✅

* Section layout (Format / Files / Convert) with tighter spacing
* Format hints under input & output selectors
* Empty state with icon + drop hint in dashed file zone
* Larger primary Convert button; outlined Select Files

### Step 5 — File list + single-file save polish ✅

* Remove individual files from asset list
* Clear all files
* Batch failure summary grouped by error code
* “Save next to original file” toggle (single-file, remembered in session)

### Step 6 — Ship polish ✅

* Window title `Convar`
* Version footer via `app.getVersion()`

### Step 7 — Build / package smoke test (deferred)

* `npm run build:win`, app icon, installer

---

## Out of scope here

* Conversion history (Phase 5)
* Workers / parallel batch (Phase 6)
* PDF support
* New conversion formats (unless trivial add to existing map)

---

## Notes

Keep the same rule: add UI complexity only when the current screen feels confusing or unfinished — not because a design system doc says so.
