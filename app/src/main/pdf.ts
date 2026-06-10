import { mkdir, writeFile } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { detectInputType, outputExtension, type OutputFormat } from './convert'
import { decodeBmpToPng } from './bmp'
import { decodeHeicFileToJpeg } from './heic'
import { decodePsdToPng } from './psd'
import { decodeRawFileToJpeg } from './raw'
import { readFileBuffer } from './file'
import { isPdfFile } from './fileKind'
import { PDF_RASTER_OUTPUT_FORMATS } from './outputCompatibility'

const PDF_RASTER_OUTPUTS = new Set<OutputFormat>(PDF_RASTER_OUTPUT_FORMATS)

export function isPdfRasterOutput(output: OutputFormat): boolean {
  return PDF_RASTER_OUTPUTS.has(output)
}

async function imageBytesForPdfEmbed(
  inputPath: string
): Promise<{ bytes: Uint8Array; kind: 'jpg' | 'png' }> {
  const inputType = detectInputType(inputPath)
  if (!inputType) {
    throw new Error('Unsupported image for PDF export.')
  }

  if (inputType === 'heic') {
    const bytes = await decodeHeicFileToJpeg(inputPath)
    return { bytes, kind: 'jpg' }
  }

  if (inputType === 'bmp') {
    const bytes = await decodeBmpToPng(await readFileBuffer(inputPath))
    return { bytes, kind: 'png' }
  }

  if (inputType === 'dng' || inputType === 'raw') {
    const bytes = await decodeRawFileToJpeg(inputPath)
    return { bytes, kind: 'jpg' }
  }

  if (inputType === 'psd') {
    const bytes = await decodePsdToPng(await readFileBuffer(inputPath))
    return { bytes, kind: 'png' }
  }

  const bytes = await readFileBuffer(inputPath)
  if (inputType === 'jpg') return { bytes, kind: 'jpg' }
  if (inputType === 'png') return { bytes, kind: 'png' }

  const png = await sharp(bytes).png().toBuffer()
  return { bytes: png, kind: 'png' }
}

export async function imagesToPdf(
  imagePaths: string[],
  outputPath: string
): Promise<{ byteLength: number }> {
  if (imagePaths.length === 0) {
    throw new Error('No images to combine into a PDF.')
  }

  const pdfDoc = await PDFDocument.create()

  for (const imagePath of imagePaths) {
    const { bytes, kind } = await imageBytesForPdfEmbed(imagePath)
    const embedded =
      kind === 'jpg' ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes)
    const { width, height } = embedded.scale(1)
    const page = pdfDoc.addPage([width, height])
    page.drawImage(embedded, { x: 0, y: 0, width, height })
  }

  const pdfBytes = await pdfDoc.save()
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, pdfBytes)

  return { byteLength: pdfBytes.byteLength }
}

export async function pdfToRasterPages(
  pdfPath: string,
  outputDir: string,
  outputFormat: OutputFormat,
  nameBase: string
): Promise<{ paths: string[]; totalBytes: number }> {
  if (!isPdfRasterOutput(outputFormat)) {
    throw new Error('PDF pages can only be exported as PNG, JPG, WebP, or AVIF.')
  }

  const { renderPdfToPngPages } = await import('./pdfRender')
  const pages = await renderPdfToPngPages(pdfPath, 2)

  if (pages.length === 0) {
    throw new Error('PDF has no pages to export.')
  }

  await mkdir(outputDir, { recursive: true })

  const ext = outputExtension(outputFormat)
  const paths: string[] = []
  let totalBytes = 0

  for (let i = 0; i < pages.length; i++) {
    let buffer = pages[i]

    if (outputFormat === 'jpg') {
      buffer = await sharp(buffer).jpeg().toBuffer()
    } else if (outputFormat === 'webp') {
      buffer = await sharp(buffer).webp().toBuffer()
    } else if (outputFormat === 'avif') {
      buffer = await sharp(buffer).avif().toBuffer()
    }

    const pagePath = join(outputDir, `${nameBase}-page-${String(i + 1).padStart(3, '0')}.${ext}`)
    await writeFile(pagePath, buffer)
    paths.push(pagePath)
    totalBytes += buffer.byteLength
  }

  return { paths, totalBytes }
}

export function pdfOutputBaseName(inputPath: string): string {
  return basename(inputPath, extname(inputPath))
}

export function assertPdfOutputCompatible(
  imageCount: number,
  pdfCount: number,
  outputFormat: OutputFormat
): void {
  if (imageCount > 0 && pdfCount > 0) {
    throw new Error('Mix PDF files with images in one batch. Convert them separately.')
  }

  if (pdfCount > 0 && outputFormat === 'pdf') {
    throw new Error('PDF files cannot be converted to PDF.')
  }

  if (pdfCount > 0 && !isPdfRasterOutput(outputFormat)) {
    throw new Error('PDF pages can only be exported as PNG, JPG, WebP, or AVIF.')
  }

  if (imageCount > 0 && outputFormat === 'pdf') {
    return
  }
}

export { isPdfFile }
