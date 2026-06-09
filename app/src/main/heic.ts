import { fork, type ChildProcess } from 'child_process'
import { join } from 'path'
import { detectInputType } from './convert'

export const HEIC_PREVIEW_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="#e8e8e8"/><text x="120" y="124" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#666">HEIC</text></svg>'
)}`

export function isHeicPath(filePath: string): boolean {
  return detectInputType(filePath) === 'heic'
}

type DecodeResult =
  | { id: number; ok: true; buffer: Buffer }
  | { id: number; ok: false; error: string }

type PendingDecode = {
  resolve: (buffer: Buffer) => void
  reject: (error: Error) => void
}

let child: ChildProcess | null = null
let nextId = 1
const pending = new Map<number, PendingDecode>()
let decodeChain: Promise<void> = Promise.resolve()

function childEntryPath(): string {
  return join(__dirname, 'heic-child.js')
}

function rejectAllPending(message: string): void {
  for (const [id, entry] of pending) {
    entry.reject(new Error(message))
    pending.delete(id)
  }
}

function ensureChild(): ChildProcess {
  if (child && !child.killed) return child

  child = fork(childEntryPath(), [], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  })

  child.on('message', (message: DecodeResult) => {
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)

    if (message.ok) {
      entry.resolve(Buffer.from(message.buffer))
      return
    }

    entry.reject(new Error(message.error || 'HEIC decode failed'))
  })

  child.on('exit', (code, signal) => {
    rejectAllPending(`HEIC decoder stopped (${signal ?? code ?? 'unknown'})`)
    child = null
  })

  child.stderr?.on('data', (chunk: Buffer) => {
    console.error('[heic-child]', chunk.toString().trim())
  })

  return child
}

function queueDecode(run: () => Promise<Buffer>): Promise<Buffer> {
  const result = decodeChain.then(run, run)
  decodeChain = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

function decodeInChild(
  message: { type: 'path'; filePath: string } | { type: 'buffer'; buffer: Buffer }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })

    try {
      const proc = ensureChild()
      proc.send({ id, ...message })
    } catch (err) {
      pending.delete(id)
      reject(err instanceof Error ? err : new Error(String(err)))
    }
  })
}

export function decodeHeicFileToJpeg(filePath: string): Promise<Buffer> {
  return queueDecode(() => decodeInChild({ type: 'path', filePath }))
}

export function decodeHeicBufferToJpeg(buffer: Buffer): Promise<Buffer> {
  return queueDecode(() => decodeInChild({ type: 'buffer', buffer }))
}
