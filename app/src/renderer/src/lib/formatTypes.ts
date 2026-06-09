export type InputFormat = 'png' | 'jpg' | 'webp' | 'heic' | 'gif' | 'avif'
export type OutputFormat = 'png' | 'jpg' | 'webp' | 'avif' | 'gif'
export type ConversionId = `${InputFormat}-${OutputFormat}`
export type OutputLayout = 'flat' | 'mirror'
