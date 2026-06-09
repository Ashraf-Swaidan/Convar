import { copyFile, readFile, writeFile } from 'fs/promises'

export async function readFileBuffer(filePath: string): Promise<Buffer> {
  return readFile(filePath)
}

export async function writeFileBuffer(filePath: string, data: Buffer): Promise<void> {
  await writeFile(filePath, data)
}

export async function copyFileToPath(sourcePath: string, destPath: string): Promise<void> {
  await copyFile(sourcePath, destPath)
}
