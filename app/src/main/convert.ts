import sharp from 'sharp'

export async function convertPngToWebp(input: Buffer): Promise<Buffer> {
  return sharp(input).webp().toBuffer()
}

export async function convertPngToJpg(input: Buffer): Promise<Buffer> {
  return sharp(input).jpeg().toBuffer()
}

export async function convertJpgToPng(input: Buffer): Promise<Buffer> {
  return sharp(input).png().toBuffer()
}
