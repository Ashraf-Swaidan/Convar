import type { InputFormat, OutputFormat } from '@/lib/formatTypes'

export const inputFormatHints: Record<InputFormat, string> = {
  png: 'Lossless, supports transparency',
  jpg: 'Photos and compressed images',
  webp: 'Modern web images, often smaller',
  heic: 'iPhone and Apple device photos',
  gif: 'Animated or simple graphics (first frame when converting out)',
  avif: 'Modern high-efficiency images',
  tiff: 'Scans, print, and lossless archives (first page if multi-page)',
  bmp: 'Legacy Windows bitmap images',
  dng: 'Adobe Digital Negative — common RAW container',
  raw: 'Camera RAW (CR2, NEF, ARW, etc.) — uses embedded JPEG',
  psd: 'Adobe Photoshop documents (flattened preview)'
}

export const outputFormatHints: Record<OutputFormat, string> = {
  webp: 'Smaller files, great for the web',
  jpg: 'Universal format, no transparency',
  png: 'Lossless with transparency',
  avif: 'Smallest files, newer browsers',
  gif: 'Simple animations (static when converting in)',
  tiff: 'Lossless, large files — good for print and archiving',
  bmp: 'Uncompressed bitmap — large files, universal on Windows',
  ico: 'Windows icon with 16, 32, 48, and 256 px sizes',
  pdf: 'Combine images into one document, or export PDF pages to PNG/JPG/WebP/AVIF'
}

export const supportedInputSummary =
  'Images, RAW, PSD, PDF, and folders · output list matches your selection'
