import type { InputFormat, OutputFormat } from '@/lib/formatTypes'

export const inputFormatHints: Record<InputFormat, string> = {
  png: 'Lossless, supports transparency',
  jpg: 'Photos and compressed images'
}

export const outputFormatHints: Record<OutputFormat, string> = {
  webp: 'Smaller files, great for the web',
  jpg: 'Universal format, no transparency',
  png: 'Lossless with transparency'
}
