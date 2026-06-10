export type InputFormat =
  | 'png'
  | 'jpg'
  | 'webp'
  | 'heic'
  | 'gif'
  | 'avif'
  | 'tiff'
  | 'bmp'
  | 'dng'
  | 'raw'
  | 'psd'
export type OutputFormat = 'png' | 'jpg' | 'webp' | 'avif' | 'gif' | 'tiff' | 'bmp' | 'ico' | 'pdf'
export type ConversionId =
  | `${InputFormat}-${OutputFormat}`
  | `pdf-${Exclude<OutputFormat, 'pdf'>}`
export type OutputLayout = 'flat' | 'mirror'
