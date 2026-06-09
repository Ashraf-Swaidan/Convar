# File Conversion App — Build Sequence & Philosophy

## Core Idea

We are building a local-first file conversion desktop app (Electron + Vite + React + shadcn/ui).

The goal is not to build everything at once, but to evolve the system naturally by following real constraints as they appear.

We are not designing a full architecture upfront.
We are building a simple system and letting complexity emerge only when it becomes necessary.

---

## Tech Stack (Current)

| Layer | Choice |
|-------|--------|
| Desktop shell | Electron (main process + renderer) |
| UI | React + Vite + TypeScript |
| Components | shadcn/ui |
| File I/O & conversion | Node.js in the Electron main process (e.g. `fs`, `sharp`) |
| UI ↔ system bridge | IPC via preload script (secure, exposed API) |

We chose Electron over Tauri to stay in a single Node/TypeScript stack — no Rust toolchain required for Phase 1.

---

## Why This Approach

Big systems fail when:

* too many tools are introduced too early
* abstractions are created before real pain exists
* architecture is designed without real usage

So instead:

> We build the simplest working version first
> Then only add complexity when the system demands it

This keeps:

* stability high
* cognitive load low
* learning grounded in real problems
* architecture organic instead of theoretical

---

## Build Sequence (Progressive Evolution)

### Phase 1 — Core Functionality (MVP)

Goal: prove local file conversion works.

Steps:

1. User selects a file (local system via Electron dialog)
2. Read file into app (main process)
3. Convert PNG → WebP (single conversion type only)
4. Save output file locally
5. Show success / error feedback

Constraints:

* No backend
* No database
* No queues
* No abstraction layers

Outcome:
A working end-to-end file transformation pipeline.

---

### Phase 2 — Extend Conversions

Detailed sequence: `Phase-2-seq.md`

**Phase 3:** `Phase-3-seq.md` — batch processing ✅

**Phase 4:** `Phase-4-seq.md` — error handling ✅

**Phase UX (next):** `Phase-UX-seq.md` — polish & experience

Problem: one conversion is not enough.

Add:

* JPG → PNG
* PNG → JPG
* Basic PDF operations (merge/split later)

Focus:

* standardizing conversion logic
* avoiding duplicated code
* introducing a simple converter structure

Outcome:
A reusable conversion system begins to form.

---

### Phase 3 — Batch Processing

Problem: users want multiple files processed.

Add:

* multi-file selection
* sequential processing loop
* basic progress indicator

Focus:

* user experience during long operations
* keeping UI responsive

Outcome:
First real system-level complexity appears.

---

### Phase 4 — Error Handling & Reliability

Problem: things will fail in real usage.

Add:

* structured error handling
* retry-safe operations (where possible)
* consistent failure messages

Focus:

* predictable behavior under failure
* clarity over perfection

Outcome:
App becomes trustworthy.

---

### Phase 5 — History (Optional but Natural)

Problem: users lose track of what they processed.

Add:

* local history of conversions
* file mapping (input → output)
* simple storage (likely SQLite later, but not required yet)

Focus:

* persistence of user actions

Outcome:
App starts gaining “memory”.

---

### Phase 6 — System Evolution Pressure Point

At this stage, natural constraints will appear:

* slow processing
* UI blocking
* need for background execution
* need for more complex pipelines

Only now do we introduce:

* workers / background jobs
* possible queue system
* optimization layers

Important:
These are not added early. They are reactions to real bottlenecks.

---

## Core Principle

> We do not add complexity because it exists in the ecosystem.
> We add complexity only when our current system breaks without it.

---

## What We Are Observing While Building

During each phase, we pay attention to:

* where friction appears
* what feels repetitive
* what becomes hard to maintain
* what the system “wants to become”

These observations will later become the foundation for the DPS (Developer Progression System).

---

## End Goal (Not the App)

The file conversion app is not the final product.

It is a controlled environment to learn:

* how systems evolve
* how complexity emerges
* how to structure progression over time

This will directly inform the design of DPS.
