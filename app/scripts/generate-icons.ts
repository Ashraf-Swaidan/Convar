import sharp from 'sharp'
import { join } from 'path'

const SIZE = 512

/**
 * Taskbar / .exe icon from the light logo:
 * - trim away the outer black frame
 * - fit the squircle on a transparent canvas (Windows keeps the rounded shape)
 * - no center-crop zoom (that was clipping the rounded corners)
 */
async function buildIcon(source: string): Promise<Buffer> {
  return sharp(source)
    .trim()
    .resize(SIZE, SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer()
}

async function main(): Promise<void> {
  const root = join(import.meta.dirname, '..')
  const light = join(root, 'src/renderer/src/assets/convar-light-logo.png')
  const outBuild = join(root, 'build/icon.png')
  const outResources = join(root, 'resources/icon.png')

  const icon = await buildIcon(light)

  await sharp(icon).toFile(outBuild)
  await sharp(icon).toFile(outResources)

  console.log(`Icons written (${SIZE}px, transparent canvas, squircle preserved):`, outBuild)
}

main().catch(console.error)
