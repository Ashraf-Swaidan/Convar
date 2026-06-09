# Phase 4 — Error Handling & Reliability

**Status: Complete (Steps 1–4)** — restart dev server to pick up main/preload changes

**Next:** UI/UX polish — `Phase-UX-seq.md` (not Phase 5 history yet)

**Prerequisite:** Phase 3 complete (`Phase-3-seq.md`)

**Next after this phase:** UI/UX polish — see `Phase-UX-seq.md` (not Phase 5 history yet)

---

## Goal

Make failures **predictable and readable** — same shape everywhere, clearer messages when disk/permissions bite, no silent swallowing.

By the end of Phase 4:

* every failure returns `{ ok: false, error, code }`
* filesystem errors map to plain-language hints
* single + batch paths share the same conversion/error helpers
* cancel is still not an error

This phase is **small on purpose**. We already have working flows; we're tightening the edges, not building an error framework.

---

## Problem

Today errors are ad hoc strings scattered across `index.ts` and `batch.ts`:

* duplicate read → convert → save try/catch blocks
* `catch { }` hides whether it was permissions, disk full, or corrupt image
* batch per-file errors use strings but no shared code the UI can branch on later

---

## Tech Scope

**Add:**

* `src/main/errors.ts` — `AppErrorCode`, `appError()`, `fsErrorMessage()`
* `src/main/convertFile.ts` — shared read → convert → write path
* `code` field on all `{ ok: false }` IPC responses

**Do NOT add yet:**

* retry queues, toast library, error telemetry
* UI redesign (that's `Phase-UX-seq.md`)
* SQLite / history (Phase 5)

---

## Sequence

### Step 1 — Structured errors module ✅

* `AppErrorCode` union + `appError(code, message)`
* `fsErrorMessage(err, fallback)` for EACCES, ENOSPC, ENOENT, EBUSY, EPERM

### Step 2 — Shared convert pipeline ✅

* `src/main/convertFile.ts` — `readAndConvert`, `convertBuffer`, `writeConvertedOutput`
* Replaces duplicated logic in `index.ts` and former `batch.ts`

### Step 3 — Wire IPC + batch ✅

* All handlers return `{ ok: false, error, code }`
* Batch file results include `code` on failure

### Step 4 — Preload types ✅

* `FailureResult` + `AppErrorCode` in `preload/index.d.ts`

### Step 5 — Completion pass ✅

* `npm run verify:conversions` passes
* Manual: corrupt file, cancel dialogs, read-only folder (optional)

---

## Phase 4 Completion Criteria

* structured `code` on every error path
* fs failures say *why* in plain language
* no duplicated convert try/catch in `index.ts` and `batch.ts`
* Phase 3 behavior unchanged on happy path

---

## Next: Phase UX

See `Phase-UX-seq.md` — visual polish, empty states, open-folder actions, drag-and-drop, error display components using the new `code` field.

Do not start Phase 5 (history) until UX pass feels good enough to ship.
