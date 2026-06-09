/* eslint-disable no-console */
import { expandIngestPaths } from '../src/main/ingest'
import { readSupportedFile } from '../src/main/convertFile'
import { createPreviewDataUrl } from '../src/main/preview'

const files = [
  'C:/Users/Srourcomputers/Downloads/IMG_4299.HEIC',
  'C:/Users/Srourcomputers/Downloads/IMG_3817.HEIC',
  'C:/Users/Srourcomputers/Downloads/IMG_5884.HEIC',
  'C:/Users/Srourcomputers/Downloads/IMG_E7685.HEIC'
]

function step(name: string): void {
  console.log(`[${new Date().toISOString()}] ${name}`)
}

const timeout = setTimeout(() => {
  console.error('TIMED OUT after 90s — last step above is the culprit')
  process.exit(2)
}, 90000)

async function main(): Promise<void> {
  step('expandIngestPaths')
  const expanded = await expandIngestPaths(files)
  step(`expanded: ${expanded.files.length} files, root=${expanded.inputRoot}`)

  for (const f of expanded.files) {
    step(`readSupportedFile ${f}`)
    const r = await readSupportedFile(f)
    step(`  -> ${r.ok ? `ok ${r.byteLength}b` : `err ${r.error.message}`}`)
  }

  for (const f of expanded.files.slice(0, 3)) {
    step(`createPreviewDataUrl ${f}`)
    const url = await createPreviewDataUrl(f)
    step(`  -> ${url.slice(0, 40)}`)
  }

  console.log('DROP SEQUENCE OK')
}

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
