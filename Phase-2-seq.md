# Phase 2 — Extend Conversions

**Status: Not started**

**Prerequisite:** Phase 1 complete (`Phase-1-seq.md`)

---

## Goal

Support multiple image conversions in the same app — without copy-pasting the entire pipeline for each new format.

By the end of Phase 2, a user can:

* choose what conversion they want (e.g. PNG → JPG)
* pick a matching input file
* convert and save locally
* see success or failure (same pattern as Phase 1)

Phase 1 proved the pipeline works. Phase 2 proves it can **grow** without becoming messy.

---

## Problem (Why Phase 2 Exists)

Phase 1 hardcoded everything to PNG → WebP:

* file dialog filters only allow `.png`
* validation checks only `.png`
* `convert:saveWebp` handler name and logic are WebP-specific
* adding a second format today means duplicating handlers, validation, and UI wiring

One conversion is not enough. But we still do **not** design a plugin system upfront — we add formats until repetition forces a simple structure.

---

## Tech Scope (Locked for Phase 2)

Still using:

* Electron (main + preload + renderer)
* Vite + React + TypeScript + shadcn/ui
* `sharp` for **image** conversions (PNG, JPG, WebP)
* Same IPC pattern: `invoke` → `handle` → `{ ok, error }`

**Add in this phase:**

* PNG → WebP (already works — keep it)
* PNG → JPG
* JPG → PNG
* A **simple converter map** in main (not a plugin framework)
* UI control to pick conversion type

Do NOT introduce yet:

* batch / multi-file processing (Phase 3)
* conversion history / SQLite (Phase 5)
* workers, queues, background jobs (Phase 6)
* plugin registry or dynamic loading
* PDF merge/split (stretch — see Step 9 note below; different toolchain from `sharp`)

---

## Architecture (Phase 2 Evolution)

Phase 1:

```
UI → convert:saveWebp(path) → read → convertPngToWebp → save .webp
```

Phase 2 target:

```
UI → convert:save(path, conversionId) → read → converters[conversionId] → save (dynamic ext)
```

What changes:

| Layer | Phase 1 | Phase 2 |
|-------|---------|---------|
| `convert.ts` | one function | map of conversion functions |
| `index.ts` | PNG-only validation + WebP save | validation + save driven by conversion type |
| Dialogs | hardcoded PNG in / WebP out | filters + default extension from conversion |
| UI | implicit PNG → WebP | user picks conversion preset |
| IPC | `convert:saveWebp` | generalized `convert:save` (rename when ready) |

What stays the same:

* Buffers stay in main — UI still only gets paths and metadata
* Preload still exposes a small `window.api`
* Error result shape unchanged

---

## Starting Point (Phase 1 Code)

| File | Current state |
|------|---------------|
| `src/main/convert.ts` | `convertPngToWebp()` only |
| `src/main/index.ts` | `isPngFile()`, `convert:saveWebp` handler |
| `src/preload/index.ts` | `convertAndSaveWebp()` |
| `src/renderer/src/App.tsx` | fixed “Convert PNG to WebP” copy |

---

## Sequence (Step-by-Step Build Order)

Build in this order on purpose: **feel duplication first, then refactor** — matches our philosophy.

---

### Step 1 — Add PNG → JPG (Duplicate on Purpose)

Before abstracting anything, add a second conversion the “dumb” way:

* Add `convertPngToJpg()` in `convert.ts` (`sharp(input).jpeg().toBuffer()`)
* Add a **second** IPC handler (e.g. `convert:saveJpg`) — copy the WebP handler pattern
* Temporarily add a second button or toggle in UI to trigger JPG output

Checkpoint:

* PNG → JPG works end-to-end
* You can **see** how much code was copied from the WebP path

**Observe:** What repeated? (read, save dialog, try/catch, validation)

---

### Step 2 — Add JPG → PNG (Duplication Gets Painful)

Same approach again:

* Add `convertJpgToPng()` in `convert.ts`
* Add another handler or extend the toggle
* Update open dialog to allow `.jpg` when this mode is selected

Checkpoint:

* JPG → PNG works end-to-end
* Three conversions exist — maintenance feels wrong (good — that’s the signal)

**Observe:** Handlers, validation, and dialog config are the repeat offenders.

---

### Step 3 — Simple Converter Map (First Real Structure)

Only now — because we felt the pain — introduce a minimal registry in `convert.ts`:

```typescript
// Concept only — implement when Step 2 hurts
const converters = {
  'png-webp': convertPngToWebp,
  'png-jpg': convertPngToJpg,
  'jpg-png': convertJpgToPng,
}
```

Each entry: `(input: Buffer) => Promise<Buffer>`

Add metadata alongside (keep it inline — no separate config file yet):

* input extension(s)
* output extension
* dialog filter label

Checkpoint:

* All three conversions call through one lookup function
* Individual `convertXToY` functions remain — map just routes to them

**Do not:** build a plugin loader, class hierarchy, or factory pattern. A plain object is enough.

---

### Step 4 — Generalize IPC Handler

Replace separate handlers (`convert:saveWebp`, `convert:saveJpg`, …) with one:

* `convert:save(inputPath, conversionId)`
* Handler flow: validate → read → `converters[conversionId]` → save dialog → write
* Return same shape as Phase 1: `{ ok, savedPath, outputByteLength }` or `{ ok: false, error }` or `{ canceled: true }`

Update preload: `convertAndSave(path, conversionId)`

Checkpoint:

* All three conversions work through **one** handler
* Old per-format handlers removed

---

### Step 5 — Generalize Validation + Dialogs

Extract format rules from hardcoded `isPngFile()`:

* Input validation uses conversion metadata (expected input ext)
* `showOpenDialog` filters match selected conversion input type
* `showSaveDialog` default path uses correct output extension

Checkpoint:

* Selecting JPG → PNG only accepts `.jpg` inputs
* Save dialog defaults to `.png` for that conversion
* Wrong extension returns a clear error (reuse Phase 1 error pattern)

---

### Step 6 — Format Picker UI

Replace duplicate buttons / implicit WebP-only copy with a single flow:

* Conversion preset selector (shadcn `Select` or similar)
  * PNG → WebP
  * PNG → JPG
  * JPG → PNG
* One **Select File** button (behavior depends on preset)
* One **Convert** button
* Subtitle updates to reflect chosen conversion

Clear file selection when preset changes.

Checkpoint:

* User can switch conversion type before picking a file
* Full flow works for all three presets without separate code paths in React

---

### Step 7 — Cleanup + Error Messages

* Remove dead code (old handlers, WebP-only strings, temporary toggles)
* Ensure error messages mention the **selected** conversion where helpful
* Confirm TypeScript types updated in `preload/index.d.ts`

Checkpoint:

* Codebase reads as one system, not three pasted pipelines
* No silent failures on any supported conversion

---

### Step 8 — Phase 2 Completion Pass

Manual test matrix:

| Conversion | Input | Output saves | Opens in viewer |
|------------|-------|--------------|-----------------|
| PNG → WebP | `.png` | `.webp` | yes |
| PNG → JPG | `.png` | `.jpg` | yes |
| JPG → PNG | `.jpg` | `.png` | yes |

Also test:

* cancel save dialog → no error
* wrong file type → error message
* invalid/corrupt file → conversion error

Checkpoint:

* All matrix rows pass
* Phase 1 behavior preserved for PNG → WebP

---

### Step 9 — PDF (Stretch / Defer)

Overview mentions PDF merge/split **later**. Not required for Phase 2 completion.

PDF is a **different pipeline** (`sharp` does not merge PDFs). If attempted:

* needs a new dependency (e.g. `pdf-lib`)
* different validation, different save behavior
* should be its own small spike — not mixed into the image converter map

**Decision rule:** Only start Step 9 after Steps 1–8 are stable. If image formats still feel shaky, PDF waits.

---

## Phase 2 Completion Criteria

Phase 2 is complete when:

* user can choose among PNG → WebP, PNG → JPG, JPG → PNG
* one generalized IPC handler drives all image conversions
* converter map exists in main — no copy-pasted handler per format
* dialogs and validation match the selected conversion
* errors show in UI; cancel is not treated as error
* no batch, no history, no new infrastructure beyond the converter map

---

## What We Expect to Learn (DPS Observations)

Watch for during build:

* at which step duplication became unbearable (likely Step 2 → 3)
* whether metadata belongs next to converters or in the handler
* whether the UI wants “input format + output format” picks vs preset list
* if `conversionId` string keys stay readable or want enums

These notes feed Phase 3 (batch) and later DPS design.

---

## Next: Phase 3

See `Overview-Sequence.md` — multi-file selection, sequential processing loop, basic progress indicator.

Do not start Phase 3 until Phase 2 completion criteria are met.

---

## Notes

Same rules as Phase 1:

> If something feels like it needs a “system” or “architecture”, ask whether current pain justifies it.

Phase 2 introduces the **first** structure — a converter map — because three copy-pasted handlers **are** the pain. Nothing more until Phase 3 demands it.
