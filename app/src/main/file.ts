import { readFile } from 'fs/promises'

export async function readFileBuffer(filePath: string): Promise<Buffer> {
  return readFile(filePath)
}
