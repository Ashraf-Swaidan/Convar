import sharp from 'sharp'

export async function convertPngToWebp(input: Buffer): Promise<Buffer> {
  return sharp(input).webp().toBuffer()
}
