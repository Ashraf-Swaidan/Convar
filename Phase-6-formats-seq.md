# Phase 6 — New Formats

**Status: Backend complete — UI pass next**

---

## Added conversions (9 total, was 3)

| Input | Outputs |
|-------|---------|
| PNG | WebP, JPG, AVIF |
| JPG | PNG, WebP, AVIF |
| WebP | PNG, JPG, AVIF |

## Backend

* Data-driven registry in `convert.ts` (single sharp pipeline per output codec)
* `webp` input type · `avif` output format
* Verification script covers all conversion ids

## UI/UX follow-up (next round)

* Format selectors with 3 inputs × up to 3 outputs — consider grouped layout or search
* Drag-and-drop detect `webp`
* Format hints for WebP input + AVIF output
* Collage / asset list stress test with mixed long filenames
* Open-dialog filters per input type
