import sharp from 'sharp'
import {
  runConversion,
  isValidInputFile,
  toConversionId,
  getFormatOptions,
  conversionMeta,
  type ConversionId
} from '../src/main/convert'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

async function expectFormat(buffer: Buffer, format: 'png' | 'jpeg' | 'webp'): Promise<void> {
  const meta = await sharp(buffer).metadata()
  assert(meta.format === format, `Expected ${format}, got ${meta.format ?? 'unknown'}`)
}

async function main(): Promise<void> {
  const png = await sharp({
    create: { width: 16, height: 16, channels: 4, background: { r: 200, g: 80, b: 40, alpha: 1 } }
  })
    .png()
    .toBuffer()

  const jpg = await sharp(png).jpeg().toBuffer()

  const cases: Array<{ id: ConversionId; input: Buffer; format: 'png' | 'jpeg' | 'webp' }> = [
    { id: 'png-webp', input: png, format: 'webp' },
    { id: 'png-jpg', input: png, format: 'jpeg' },
    { id: 'jpg-png', input: jpg, format: 'png' }
  ]

  for (const { id, input, format } of cases) {
    const output = await runConversion(input, id)
    assert(output.byteLength > 0, `${id} produced empty output`)
    await expectFormat(output, format)
    assert(
      conversionMeta[id].outputExt === (format === 'jpeg' ? 'jpg' : format),
      `${id} metadata outputExt mismatch`
    )
  }

  assert(isValidInputFile('photo.png', 'png'), 'PNG path should validate')
  assert(!isValidInputFile('photo.jpg', 'png'), 'JPG path should not validate as PNG')
  assert(isValidInputFile('photo.jpeg', 'jpg'), 'JPEG path should validate as JPG input')
  assert(toConversionId('png', 'webp') === 'png-webp', 'toConversionId png-webp')
  assert(toConversionId('jpg', 'webp') === null, 'jpg-webp should be invalid')

  const options = getFormatOptions()
  assert(options.inputFormats.join(',') === 'png,jpg', 'inputFormats')
  assert(options.outputOptionsByInput.png.join(',') === 'webp,jpg', 'png outputs')
  assert(options.outputOptionsByInput.jpg.join(',') === 'png', 'jpg outputs')

  let corruptFailed = false
  try {
    await runConversion(Buffer.from('not-an-image'), 'png-webp')
  } catch {
    corruptFailed = true
  }
  assert(corruptFailed, 'Corrupt input should fail conversion')

  console.log('All conversion verification checks passed.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
