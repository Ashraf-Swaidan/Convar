# Phase 5 — Conversion History

**Status: In progress (Step 1)**

**Prerequisite:** Phase UX largely complete (`Phase-UX-seq.md`)

---

## Goal

Users can see what they recently converted and reopen outputs — without a database yet.

---

## Step 1 — Local history (current) ✅

* `localStorage` — last 20 successful conversions
* Record on single-file and per-file batch success
* **Recent conversions** collapsible list in Convert section
* Open output file · Clear history
* Version footer (`app.getVersion()`)

## Step 2 — Later (only if needed)

* Persist across reinstall (userData JSON file)
* Show input → output paths in detail
* Filter / search

---

## Out of scope for now

* SQLite
* Sync / cloud
* Full job queue replay
