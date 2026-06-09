# Phase 6 — Output-first conversion

**Status: Complete**

---

## Model change

* **No input format selector** — accept PNG, JPG, WebP (mixed in one batch)
* **User picks output only** — WebP, JPG, PNG, or AVIF
* Per file: detect input → convert, or **copy** when input already matches output

## UI

* Single output format dropdown
* Files zone border removed
* Batch toasts distinguish converted vs copied

## Backend

* `processFileToPath` — copy via `fs.copyFile` or sharp convert
* IPC uses `outputFormat` instead of `conversionId` for save/batch/read/preview
