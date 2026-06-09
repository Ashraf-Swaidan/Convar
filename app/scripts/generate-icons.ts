import sharp from 'sharp'
import { join } from 'path'

const SOURCE = 'build/512x512-logo.png'
/** Master icon for electron-builder (.exe, installer, shortcuts). Standard is 1024. */
const OFFICIAL_SIZE = 1024
/** Dev taskbar while running `npm run dev`. */
const DEV_SIZE = 512

async function main(): Promise<void> {
  const root = join(import.meta.dirname, '..')
  const logo = join(root, SOURCE)
  const outBuild = join(root, 'build/icon.png')
  const outResources = join(root, 'resources/icon.png')

  await sharp(logo).resize(OFFICIAL_SIZE, OFFICIAL_SIZE).png().toFile(outBuild)
  await sharp(logo).resize(DEV_SIZE, DEV_SIZE).png().toFile(outResources)

  console.log(`Official icon (${OFFICIAL_SIZE}px):`, outBuild)
  console.log(`Dev icon (${DEV_SIZE}px):`, outResources)
}

main().catch(console.error)
