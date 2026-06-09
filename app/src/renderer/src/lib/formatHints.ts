import type { InputFormat, OutputFormat } from '@/lib/formatTypes'

export const inputFormatHints: Record<InputFormat, string> = {
  png: 'Lossless, supports transparency',
  jpg: 'Photos and compressed images',
  webp: 'Modern web images, often smaller',
  heic: 'iPhone and Apple device photos',
  gif: 'Animated or simple graphics (first frame when converting out)',
  avif: 'Modern high-efficiency images',
  tiff: 'Scans, print, and lossless archives (first page if multi-page)'
}

export const outputFormatHints: Record<OutputFormat, string> = {
  webp: 'Smaller files, great for the web',
  jpg: 'Universal format, no transparency',
  png: 'Lossless with transparency',
  avif: 'Smallest files, newer browsers',
  gif: 'Simple animations (static when converting in)',
  tiff: 'Lossless, large files — good for print and archiving'
}

export const supportedInputSummary =
  'PNG, JPG, WebP, HEIC, GIF, AVIF, and TIFF accepted · folders supported'
