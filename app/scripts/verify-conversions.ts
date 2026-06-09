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
  format: 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'heif'
): Promise<void> {
  const meta = await sharp(buffer).metadata()
  const actual = meta.format ?? 'unknown'
  const ok =
    format === 'jpeg'
      ? actual === 'jpeg'
      : format === 'avif'
        ? actual === 'avif' || actual === 'heif'
        : format === 'heif'
          ? actual === 'heif' || actual === 'avif'
          : actual === format
  assert(ok, `Expected ${format}, got ${actual}`)
}

function sharpFormatFor(output: OutputFormat): 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' {
  return output === 'jpg' ? 'jpeg' : output
}

async function buildInputBuffers(): Promise<Record<InputFileType, Buffer>> {
  const png = await sharp({
    create: { width: 16, height: 16, channels: 4, background: { r: 200, g: 80, b: 40, alpha: 1 } }
  })
    .png()
    .toBuffer()

  const jpg = await sharp(png).jpeg().toBuffer()
  const webp = await sharp(png).webp().toBuffer()
  const gif = await sharp(png).gif().toBuffer()
  const avif = await sharp(png).avif().toBuffer()

  let heic: Buffer
  try {
    heic = await sharp(png).heif().toBuffer()
  } catch (error) {
    console.warn('HEIC encode unavailable in this sharp build; skipping heic-* conversions')
    heic = Buffer.alloc(0)
  }

  return { png, jpg, webp, gif, avif, heic }
}

async function main(): Promise<void> {
  const buffers = await buildInputBuffers()
  const cases: Array<{ id: ConversionId; input: Buffer }> = []

  for (const inputType of inputFormats) {
    const input = buffers[inputType]
    if (input.byteLength === 0) continue

    for (const output of outputOptionsByInput[inputType]) {
      cases.push({ id: `${inputType}-${output}` as ConversionId, input })
    }
  }

  const expectedCount = inputFormats.reduce(
    (sum, input) => sum + outputOptionsByInput[input].length,
    0
  )
  const heicAvailable = buffers.heic.byteLength > 0
  const minExpected = heicAvailable
    ? expectedCount
    : expectedCount - outputOptionsByInput.heic.length
  assert(
    cases.length === minExpected,
    `Expected ${minExpected} conversions, got ${cases.length} of ${expectedCount}`
  )

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
  assert(isValidInputFile('photo.heic', 'heic'), 'HEIC path should validate')
  assert(isValidInputFile('photo.heif', 'heic'), 'HEIF path should validate as HEIC input')
  assert(isValidInputFile('photo.gif', 'gif'), 'GIF path should validate')
  assert(isValidInputFile('photo.avif', 'avif'), 'AVIF path should validate')
  assert(toConversionId('png', 'webp') === 'png-webp', 'toConversionId png-webp')
  assert(toConversionId('avif', 'png') === 'avif-png', 'toConversionId avif-png')
  assert(toConversionId('png', 'png') === null, 'png-png should be invalid')

  const options = getFormatOptions()
  assert(options.outputFormats.join(',') === 'webp,jpg,png,avif,gif', 'outputFormats')

  let corruptFailed = false
  try {
    await runConversion(Buffer.from('not-an-image'), 'png-webp')
  } catch {
    corruptFailed = true
  }
  assert(corruptFailed, 'Corrupt input should fail conversion')

  console.log(`All ${cases.length} conversion verification checks passed.`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
