# Phase 8 — PDF branch

## Done

### Images → PDF
- Output format **PDF** in dropdown
- Single image → one-page PDF (save dialog)
- Batch images → `document.pdf` in output folder (all pages in order)

### PDF → images
- Drop/select `.pdf` files
- Export pages as **PNG, JPG, or WebP** (`doc-page-001.png`, …)
- Single PDF: pick output folder
- Batch PDFs: each file exports into the batch output folder

### Stack
- **pdf-lib** — images → PDF
- **pdfjs-dist** + **@napi-rs/canvas** — PDF → PNG pages (no native `node-canvas`)

### Rules
- Do not mix PDFs and images in one batch
- PDF input only supports PNG / JPG / WebP output

## Later
- PDF merge / split
- Page range selection
