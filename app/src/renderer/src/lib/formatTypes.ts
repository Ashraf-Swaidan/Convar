export type InputFormat = 'png' | 'jpg' | 'webp' | 'heic' | 'gif' | 'avif' | 'tiff'
export type OutputFormat = 'png' | 'jpg' | 'webp' | 'avif' | 'gif' | 'tiff'
export type ConversionId = `${InputFormat}-${OutputFormat}`
export type OutputLayout = 'flat' | 'mirror'
