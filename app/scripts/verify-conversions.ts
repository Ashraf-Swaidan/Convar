import sharp from 'sharp'
import {
  runConversion,
  isValidInputFile,
  toConversionId,
  getFormatOptions,
  conversionMeta,
  outputOptionsByInput,
  inputFormats,
  type ConversionId,
  type InputFileType,
  type OutputFormat
} from '../src/main/convert'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

async function expectFormat(
  buffer: Buffer,
  format: 'png' | 'jpeg' | 'webp' | 'avif'
): Promise<void> {
  const meta = await sharp(buffer).metadata()
  const actual = meta.format ?? 'unknown'
  const ok =
    format === 'jpeg'
      ? actual === 'jpeg'
      : format === 'avif'
        ? actual === 'avif' || actual === 'heif'
        : actual === format
  assert(ok, `Expected ${format}, got ${actual}`)
}

function sharpFormatFor(output: OutputFormat): 'png' | 'jpeg' | 'webp' | 'avif' {
  return output === 'jpg' ? 'jpeg' : output
}

async function main(): Promise<void> {
  const png = await sharp({
    create: { width: 16, height: 16, channels: 4, background: { r: 200, g: 80, b: 40, alpha: 1 } }
  })
    .png()
    .toBuffer()

  const jpg = await sharp(png).jpeg().toBuffer()
  const webp = await sharp(png).webp().toBuffer()

  const cases: Array<{ id: ConversionId; input: Buffer }> = []

  for (const inputType of inputFormats) {
    const input =
      inputType === 'png' ? png : inputType === 'jpg' ? jpg : webp

    for (const output of outputOptionsByInput[inputType]) {
      cases.push({ id: `${inputType}-${output}` as ConversionId, input })
    }
  }

  assert(cases.length === 9, `Expected 9 conversions, got ${cases.length}`)

  for (const { id, input } of cases) {
    const output = await runConversion(input, id)
    const meta = conversionMeta[id]
    assert(output.byteLength > 0, `${id} produced empty output`)
    await expectFormat(output, sharpFormatFor(meta.outputExt as OutputFormat))
  }

  assert(isValidInputFile('photo.png', 'png'), 'PNG path should validate')
  assert(!isValidInputFile('photo.jpg', 'png'), 'JPG path should not validate as PNG')
  assert(isValidInputFile('photo.jpeg', 'jpg'), 'JPEG path should validate as JPG input')
  assert(isValidInputFile('photo.webp', 'webp'), 'WebP path should validate')
  assert(toConversionId('png', 'webp') === 'png-webp', 'toConversionId png-webp')
  assert(toConversionId('jpg', 'webp') === 'jpg-webp', 'toConversionId jpg-webp')
  assert(toConversionId('webp', 'avif') === 'webp-avif', 'toConversionId webp-avif')
  assert(toConversionId('png', 'png') === null, 'png-png should be invalid')

  const options = getFormatOptions()
  assert(options.outputFormats.join(',') === 'webp,jpg,png,avif', 'outputFormats')

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
