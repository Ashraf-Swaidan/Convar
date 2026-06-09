export const HEIC_PREVIEW_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="#e8e8e8"/><text x="120" y="124" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#666">HEIC</text></svg>'
)}`

export function isHeicPath(filePath: string): boolean {
  const ext = filePath.split(/[/\\]/).pop()?.split('.').pop()?.toLowerCase()
  return ext === 'heic' || ext === 'heif'
}
