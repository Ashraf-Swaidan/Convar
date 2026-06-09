# Phase 5 — Conversion History

**Status: Complete (Step 2)**

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

## Step 2 — Disk persistence + detail ✅

* History stored in `userData/conversion-history.json`
* One-time migration from `localStorage`
* Input → output filenames in list
* Open file · Show in folder

## Later (only if needed)

* Filter / search
* SQLite if history grows beyond simple JSON

---

## Out of scope for now

* SQLite
* Sync / cloud
* Full job queue replay
