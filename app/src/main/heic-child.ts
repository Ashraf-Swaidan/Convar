import { readFile } from 'fs/promises'
import convert from 'heic-convert'

type DecodeByPathMessage = {
  id: number
  type: 'path'
  filePath: string
}

type DecodeByBufferMessage = {
  id: number
  type: 'buffer'
  buffer: Buffer
}

type DecodeMessage = DecodeByPathMessage | DecodeByBufferMessage

process.on('message', (message: DecodeMessage) => {
  void (async () => {
    try {
      const input =
        message.type === 'path'
          ? await readFile(message.filePath)
          : Buffer.from(message.buffer)

      const output = await convert({
        buffer: input,
        format: 'JPEG',
        quality: 0.92
      })

      process.send?.({
        id: message.id,
        ok: true as const,
        buffer: Buffer.from(output)
      })
    } catch (err) {
      process.send?.({
        id: message.id,
        ok: false as const,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  })()
})
