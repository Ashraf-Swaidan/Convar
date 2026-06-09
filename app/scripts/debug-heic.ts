/* eslint-disable no-console */
import { readFile } from 'fs/promises'

const file = process.argv[2] ?? 'C:/Users/Srourcomputers/Downloads/IMG_4298.HEIC'

function step(name: string): void {
  console.log(`[${new Date().toISOString()}] ${name}`)
}

async function main(): Promise<void> {
  step(`reading ${file}`)
  const buffer = await readFile(file)
  step(`read ${buffer.byteLength} bytes`)

  step('importing heic-convert')
  const { default: convert } = await import('heic-convert')
  step('imported heic-convert')

  step('decoding HEIC -> JPEG')
  const out = await convert({ buffer, format: 'JPEG', quality: 0.9 })
  step(`decoded -> ${out.byteLength} bytes JPEG`)

  step('importing sharp')
  const { default: sharp } = await import('sharp')
  step('sharp resize of decoded JPEG')
  const preview = await sharp(Buffer.from(out)).resize({ width: 240 }).jpeg().toBuffer()
  step(`preview ok: ${preview.byteLength} bytes`)

  console.log('ALL OK')
}

const timeout = setTimeout(() => {
  console.error('TIMED OUT after 60s — last step above is the culprit')
  process.exit(2)
}, 60000)

main()
  .then(() => {
    clearTimeout(timeout)
    process.exit(0)
  })
  .catch((err) => {
    clearTimeout(timeout)
    console.error('FAILED:', err)
    process.exit(1)
  })
