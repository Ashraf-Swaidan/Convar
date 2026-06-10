declare module 'bmp-js' {
  type BmpImage = {
    width: number
    height: number
    data: Buffer
  }

  export function decode(buffer: Buffer): BmpImage
  export function encode(image: BmpImage): { data: Buffer; width: number; height: number }
}
