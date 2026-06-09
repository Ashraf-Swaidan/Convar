# Phase UX — Polish & Experience

**Status: Planned (after Phase 4)**

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

## Sequence (when started)

1. Error + success UI components (uses Phase 4 codes)
2. Batch results panel upgrade
3. Output folder memory + open folder
4. Drag-and-drop
5. Visual pass (typography, spacing, dark mode check)
6. Build / package smoke test

---

## Out of scope here

* Conversion history (Phase 5)
* Workers / parallel batch (Phase 6)
* PDF support
* New conversion formats (unless trivial add to existing map)

---

## Notes

Keep the same rule: add UI complexity only when the current screen feels confusing or unfinished — not because a design system doc says so.
