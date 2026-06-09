declare module 'heic-convert' {
  type HeicOutputFormat = 'JPEG' | 'PNG'

  type ConvertOptions = {
    buffer: Buffer
    format: HeicOutputFormat
    quality?: number
  }

  function convert(options: ConvertOptions): Promise<ArrayBuffer>

  export default convert
}
