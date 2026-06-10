export type InputFormat = 'png' | 'jpg' | 'webp' | 'heic' | 'gif' | 'avif' | 'tiff' | 'bmp'
export type OutputFormat = 'png' | 'jpg' | 'webp' | 'avif' | 'gif' | 'tiff' | 'bmp' | 'ico' | 'pdf'
export type ConversionId = `${InputFormat}-${OutputFormat}`
export type OutputLayout = 'flat' | 'mirror'
