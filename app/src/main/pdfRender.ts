import { createRequire } from 'module'
import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { pathToFileURL } from 'url'
import { createCanvas } from '@napi-rs/canvas'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'

const require = createRequire(__filename)

let workerConfigured = false

function ensurePdfWorker(): void {
  if (workerConfigured) return

  const workerPath = join(
    dirname(require.resolve('pdfjs-dist/package.json')),
    'legacy/build/pdf.worker.mjs'
  )
  GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
  workerConfigured = true
}

export async function renderPdfToPngPages(pdfPath: string, scale = 2): Promise<Buffer[]> {
  ensurePdfWorker()

  const data = new Uint8Array(await readFile(pdfPath))
  const pdf = await getDocument({ data, useSystemFonts: true }).promise
  const pages: Buffer[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    const context = canvas.getContext('2d')

    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport
    }).promise

    pages.push(canvas.toBuffer('image/png'))
  }

  return pages
}
